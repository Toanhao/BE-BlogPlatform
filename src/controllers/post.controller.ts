import {authenticate} from '@loopback/authentication';
import {AuthorizationMetadata, authorize} from '@loopback/authorization';
import {inject} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  patch,
  post,
  put,
  requestBody,
  response,
} from '@loopback/rest';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {CreatePostDto, PaginatedPostsDto} from '../dtos';
import {AppblogBindings} from '../keys';
import {Post} from '../models';
import {CommentRepository, PostRepository} from '../repositories';
import {CooldownService, RedisService} from '../services';

const TTL_LIST = 86400;
const TTL_TOTAL = 86400;
const TTL_DETAIL = 86400;
const KEY_TOTAL = 'posts:total';
const KEY_LIST_PREFIX = 'posts:paginated:';
const KEY_DETAIL_PREFIX = 'post:detail:';
const KEY_MY_POSTS_PREFIX = 'posts:my:';

export class PostController {
  constructor(
    @repository(PostRepository)
    public postRepository: PostRepository,
    @repository(CommentRepository)
    public commentRepository: CommentRepository,
    @inject(AppblogBindings.REDIS_SERVICE)
    private redisService: RedisService,
    @inject(AppblogBindings.COOLDOWN_SERVICE)
    private cooldownService: CooldownService,
    @inject(SecurityBindings.USER, {optional: true})
    private currentUserProfile: UserProfile,
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
        {
          relation: 'comments',
          scope: {
            fields: {
              content: true,
              postId: true,
              authorId: true,
            },
            include: [
              {
                relation: 'author',
                scope: {fields: {username: true}},
              },
            ],
          },
        },
      ],
    };
  }

  @authenticate('jwt')
  @post('/posts')
  @response(200, {
    description: 'Post model instance',
    content: {'application/json': {schema: getModelSchemaRef(Post)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CreatePostDto),
        },
      },
    })
    postData: CreatePostDto,
  ): Promise<Post> {
    const currentUserId = String(this.currentUserProfile[securityId]);

    await this.cooldownService.enforceCooldown(currentUserId, 'post', 10);

    const excerpt =
      postData.content.substring(0, 180) +
      (postData.content.length > 180 ? '...' : '');

    const createdPost = await this.postRepository.create({
      ...postData,
      excerpt,
      authorId: currentUserId,
      createdAt: postData.createdAt ?? new Date().toISOString(),
    });

    await this.invalidatePostListCache();
    await this.invalidateMyPostsCache(currentUserId);

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

  @get('/posts/count')
  @response(200, {
    description: 'Post model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(@param.where(Post) where?: Where<Post>): Promise<Count> {
    return this.postRepository.count(where);
  }

  @get('/posts/paginated')
  @response(200, {
    description: 'Paginated array of Post model instances with total count',
    content: {
      'application/json': {
        schema: getModelSchemaRef(PaginatedPostsDto),
      },
    },
  })
  async findPaginated(
    @param.query.number('skip', {description: 'Number of records to skip'})
    skip: number = 0,
    @param.query.number('limit', {description: 'Number of records to return'})
    limit: number = 10,
    @param.query.string('order', {
      description: 'Order by field, e.g., createdAt DESC',
    })
    order: string = 'createdAt DESC',
    @param.query.string('q', {
      description: 'Keyword to search in post title',
    })
    q?: string,
  ): Promise<PaginatedPostsDto> {
    
    const normalizedQ = q?.trim().toLowerCase();
    const searchKey = normalizedQ ?? 'all';

    const where = normalizedQ
      ? {
          $text: {
            $search: normalizedQ,
          },
        }
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

  @get('/posts')
  @response(200, {
    description: 'Array of Post model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Post, {includeRelations: true}),
        },
      },
    },
  })
  async find(@param.filter(Post) filter?: Filter<Post>): Promise<Post[]> {
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

  @get('/posts/{id}')
  @response(200, {
    description: 'Post model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Post, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Post, {exclude: 'where'}) filter?: FilterExcludingWhere<Post>,
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

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['admin'],
    owner: 'post',
    ownerArgIndex: 0,
  } as AuthorizationMetadata)
  @del('/posts/{id}')
  @response(204, {
    description: 'Post DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    const existingPost = await this.postRepository.findById(id);

    await this.commentRepository.deleteAll({postId: id});
    await this.postRepository.deleteById(id);
    await this.invalidatePostListCache();
    await this.invalidateMyPostsCache(String(existingPost.authorId));
    await this.invalidatePostDetailCache(id);
  }
}
