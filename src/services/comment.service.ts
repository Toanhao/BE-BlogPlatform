import {injectable, inject} from '@loopback/core';
import {FilterExcludingWhere, repository} from '@loopback/repository';
import {AppblogBindings} from '../keys';
import {CreateCommentDto, PaginatedCommentsDto} from '../dtos';
import {Comment} from '../models';
import {CommentRepository} from '../repositories';
import {CooldownService} from './cooldown.service';
import {RedisService} from './redis.service';

const KEY_COMMENTS_PREFIX = 'post:comments:';

@injectable()
export class CommentService {
  constructor(
    @repository(CommentRepository)
    private commentRepository: CommentRepository,
    @inject(AppblogBindings.REDIS_SERVICE)
    private redisService: RedisService,
    @inject(AppblogBindings.COOLDOWN_SERVICE)
    private cooldownService: CooldownService,
  ) {}

  private buildCommentsCacheKey(
    postId: string,
    skip: number,
    limit: number,
    order: string,
  ): string {
    return `${KEY_COMMENTS_PREFIX}${postId}:skip=${skip}:limit=${limit}:order=${order}`;
  }

  private async invalidatePostCommentsCache(postId: string): Promise<void> {
    await this.redisService.deleteByPattern(`${KEY_COMMENTS_PREFIX}${postId}:*`);
  }

  async createCommentForUser(
    commentData: CreateCommentDto,
    userId: string,
  ): Promise<Comment> {
    await this.cooldownService.enforceCooldown(userId, 'comment', 5);

    const createdComment = await this.commentRepository.create({
      ...commentData,
      authorId: userId,
      createdAt: commentData.createdAt ?? new Date().toISOString(),
    });

    await this.invalidatePostCommentsCache(createdComment.postId);

    return createdComment;
  }

  async findCommentById(
    id: string,
    filter?: FilterExcludingWhere<Comment>,
  ): Promise<Comment> {
    return this.commentRepository.findById(id, filter);
  }

  async findPaginatedCommentsByPost(
    postId: string,
    skip: number,
    limit: number,
    order: string,
  ): Promise<PaginatedCommentsDto> {
    const where = {postId};
    const cacheKey = this.buildCommentsCacheKey(postId, skip, limit, order);

    const cached = await this.redisService.getJson<PaginatedCommentsDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const [items, totalResult] = await Promise.all([
      this.commentRepository.find({
        where,
        skip,
        limit,
        order: [order],
        fields: {
          id: true,
          content: true,
          createdAt: true,
          postId: true,
          authorId: true,
        },
        include: [
          {
            relation: 'author',
            scope: {fields: {username: true}},
          },
        ],
      }),
      this.commentRepository.count(where),
    ]);

    const result = {items, total: totalResult.count};

    await this.redisService.setJson(cacheKey, result, 86400);
    console.log("Cached comments for post", postId, "with key", cacheKey);

    return result;
  }

  async deleteCommentById(id: string): Promise<void> {
    const existingComment = await this.commentRepository.findById(id);

    await this.commentRepository.deleteById(id);
    await this.invalidatePostCommentsCache(existingComment.postId);
  }
}
