import {injectable, BindingScope, inject} from '@loopback/core';
import {
  Count,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {AppblogBindings} from '../keys';
import {CreatePostDto, PaginatedPostsDto} from '../dtos';
import {Post} from '../models';
import {CommentRepository, PostRepository} from '../repositories';
import {CooldownService} from './cooldown.service';
import {RedisService} from './redis.service';

const TTL_LIST = 86400;
const TTL_TOTAL = 86400;
const TTL_DETAIL = 86400;
const KEY_TOTAL = 'posts:total';
const KEY_LIST_PREFIX = 'posts:paginated:';
const KEY_DETAIL_PREFIX = 'post:detail:';
const KEY_MY_POSTS_PREFIX = 'posts:my:';

@injectable({scope: BindingScope.TRANSIENT})
export class PostService {
  constructor(
    @repository(PostRepository)
    private postRepository: PostRepository,
    @repository(CommentRepository)
    private commentRepository: CommentRepository,
    @inject(AppblogBindings.REDIS_SERVICE)
    private redisService: RedisService,
    @inject(AppblogBindings.COOLDOWN_SERVICE)
    private cooldownService: CooldownService,
  ) {}

  private async invalidatePostListCache(): Promise<void> {
    await Promise.all([
      this.redisService.deleteByPattern(`${KEY_LIST_PREFIX}*`),
      this.redisService.deleteByPattern(`${KEY_TOTAL}:*`),
    ]);
  }

  private async invalidatePostDetailCache(postId: string): Promise<void> {
    await this.redisService.deleteKey(`${KEY_DETAIL_PREFIX}${postId}`);
  }

  private async invalidateMyPostsCache(userId: string): Promise<void> {
    await this.redisService.deleteKey(`${KEY_MY_POSTS_PREFIX}${userId}`);
  }

  private buildPostDetailQuery(filter?: FilterExcludingWhere<Post>) {
    return {
      ...filter,
      include: [
        {
          relation: 'author',
          scope: {fields: {username: true}},
        },
      ],
    };
  }

  async createPostForUser(postData: CreatePostDto, userId: string): Promise<Post> {
    await this.cooldownService.enforceCooldown(userId, 'post', 10);

    const excerpt =
      postData.content.substring(0, 180) +
      (postData.content.length > 180 ? '...' : '');

    const createdPost = await this.postRepository.create({
      ...postData,
      excerpt,
      authorId: userId,
      createdAt: postData.createdAt ?? new Date().toISOString(),
    });

    await this.invalidatePostListCache();
    await this.invalidateMyPostsCache(userId);

    // Prewarm detail cache so first navigation to the new post is faster.
    const detail = await this.postRepository.findById(
      String(createdPost.id),
      this.buildPostDetailQuery(),
    );
    await this.redisService.setJson(
      `${KEY_DETAIL_PREFIX}${createdPost.id}`,
      detail,
      TTL_DETAIL,
    );

    return createdPost;
  }

  async countPosts(where?: Where<Post>): Promise<Count> {
    return this.postRepository.count(where);
  }

  async findPaginatedPosts(
    skip: number,
    limit: number,
    order: string,
    q?: string,
  ): Promise<PaginatedPostsDto> {
    const normalizedQ = q?.trim().toLowerCase();
    const searchKey = normalizedQ ?? 'all';

    const where = normalizedQ
      ? ({
          $text: {
            $search: normalizedQ,
          },
        } as Where<Post>)
      : undefined;

    const listKey = `${KEY_LIST_PREFIX}skip=${skip}:limit=${limit}:order=${order}:q=${searchKey}`;
    const totalKey = `${KEY_TOTAL}:${searchKey}`;

    const cachedItems = await this.redisService.getJson<Post[]>(listKey);
    const cachedTotal = await this.redisService.getJson<number>(totalKey);

    if (cachedItems && typeof cachedTotal === 'number') {
      return {items: cachedItems, total: cachedTotal};
    }

    const items =
      cachedItems ??
      (await this.postRepository.find({
        skip,
        limit,
        order: [order],
        ...(where ? {where} : {}),
        fields: {
          id: true,
          title: true,
          excerpt: true,
          image: true,
          createdAt: true,
          authorId: true,
        },
        include: [
          {
            relation: 'author',
            scope: {fields: {username: true}},
          },
        ],
      }));

    const total =
      typeof cachedTotal === 'number'
        ? cachedTotal
        : (await this.postRepository.count(where)).count;

    const result = {items, total};

    if (!cachedItems) {
      await this.redisService.setJson(listKey, items, TTL_LIST);
    }
    if (typeof cachedTotal !== 'number') {
      await this.redisService.setJson(totalKey, total, TTL_TOTAL);
    }

    return result;
  }

  async findPostDetail(
    id: string,
    filter?: FilterExcludingWhere<Post>,
  ): Promise<Post> {
    const query = this.buildPostDetailQuery(filter);
    const detailKey = `${KEY_DETAIL_PREFIX}${id}`;
    const cached = await this.redisService.getJson<Post>(detailKey);

    if (cached) {
      return cached;
    }

    const detail = await this.postRepository.findById(id, query);
    await this.redisService.setJson(detailKey, detail, TTL_DETAIL);

    return detail;
  }

  async findPosts(filter?: Filter<Post>): Promise<Post[]> {
    return this.postRepository.find({
      ...filter,
      fields: {
        id: true,
        title: true,
        excerpt: true,
        image: true,
        createdAt: true,
        authorId: true,
      },
      include: [
        {
          relation: 'author',
          scope: {fields: {id: true, username: true}},
        },
      ],
    });
  }

  async deletePostById(id: string): Promise<void> {
    const existingPost = await this.postRepository.findById(id);

    await this.commentRepository.deleteAll({postId: id});
    await this.postRepository.deleteById(id);
    await this.invalidatePostListCache();
    await this.invalidateMyPostsCache(String(existingPost.authorId));
    await this.invalidatePostDetailCache(id);
  }
}
