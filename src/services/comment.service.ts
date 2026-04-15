import {injectable, inject} from '@loopback/core';
import {FilterExcludingWhere, repository} from '@loopback/repository';
import {AppblogBindings} from '../keys';
import {CreateCommentDto} from '../dtos';
import {Comment} from '../models';
import {CommentRepository} from '../repositories';
import {CooldownService} from './cooldown.service';
import {RedisService} from './redis.service';

const KEY_DETAIL_PREFIX = 'post:detail:';

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

  private async invalidatePostDetailCache(postId: string): Promise<void> {
    await this.redisService.deleteKey(`${KEY_DETAIL_PREFIX}${postId}`);
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

    await this.invalidatePostDetailCache(createdComment.postId);

    return createdComment;
  }

  async findCommentById(
    id: string,
    filter?: FilterExcludingWhere<Comment>,
  ): Promise<Comment> {
    return this.commentRepository.findById(id, filter);
  }

  async deleteCommentById(id: string): Promise<void> {
    const existingComment = await this.commentRepository.findById(id);

    await this.commentRepository.deleteById(id);
    await this.invalidatePostDetailCache(existingComment.postId);
  }
}
