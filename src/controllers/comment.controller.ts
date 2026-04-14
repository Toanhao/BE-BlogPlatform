import {authenticate} from '@loopback/authentication';
import {authorize, AuthorizationMetadata} from '@loopback/authorization';
import {inject} from '@loopback/core';
import {
  Count,
  CountSchema,
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
import {securityId, SecurityBindings, UserProfile} from '@loopback/security';
import {CreateCommentDto} from '../dtos';
import {AppblogBindings} from '../keys';
import {Comment} from '../models';
import {CommentRepository} from '../repositories';
import {RedisService} from '../services';

const KEY_DETAIL_PREFIX = 'post:detail:';

export class CommentController {
  constructor(
    @repository(CommentRepository)
    public commentRepository: CommentRepository,
    @inject(AppblogBindings.REDIS_SERVICE)
    private redisService: RedisService,
    @inject(SecurityBindings.USER, {optional: true})
    private currentUserProfile: UserProfile,
  ) {}

  private async invalidatePostDetailCache(postId: string): Promise<void> {
    await this.redisService.deleteKey(`${KEY_DETAIL_PREFIX}${postId}`);
  }

  @authenticate('jwt')
  @post('/comments')
  @response(200, {
    description: 'Comment model instance',
    content: {'application/json': {schema: getModelSchemaRef(Comment)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CreateCommentDto),
        },
      },
    })
    comment: CreateCommentDto,
  ): Promise<Comment> {
    const currentUserId = String(this.currentUserProfile[securityId]);
    const createdComment = await this.commentRepository.create({
      ...comment,
      authorId: currentUserId,
      createdAt: comment.createdAt ?? new Date().toISOString(),
    });

    await this.invalidatePostDetailCache(createdComment.postId);

    return createdComment;
  }


  @get('/comments/{id}')
  @response(200, {
    description: 'Comment model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(Comment, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(Comment, {exclude: 'where'})
    filter?: FilterExcludingWhere<Comment>,
  ): Promise<Comment> {
    return this.commentRepository.findById(id, filter);
  }


  @authenticate('jwt')
  @authorize({
    allowedRoles: ['admin'],
    owner: 'comment',
    ownerArgIndex: 0,
  } as AuthorizationMetadata)
  @del('/comments/{id}')
  @response(204, {
    description: 'Comment DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    const existingComment = await this.commentRepository.findById(id);

    await this.commentRepository.deleteById(id);

    await this.invalidatePostDetailCache(existingComment.postId);
  }
}
