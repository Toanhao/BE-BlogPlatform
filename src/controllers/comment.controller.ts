import {authenticate} from '@loopback/authentication';
import {authorize, AuthorizationMetadata} from '@loopback/authorization';
import {inject} from '@loopback/core';
import {
  FilterExcludingWhere,
} from '@loopback/repository';
import {
  del,
  get,
  getModelSchemaRef,
  param,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {securityId, SecurityBindings, UserProfile} from '@loopback/security';
import {CreateCommentDto} from '../dtos';
import {AppblogBindings} from '../keys';
import {Comment} from '../models';
import {CommentService} from '../services';

export class CommentController {
  constructor(
    @inject(AppblogBindings.COMMENT_SERVICE)
    private commentService: CommentService,
    @inject(SecurityBindings.USER, {optional: true})
    private currentUserProfile: UserProfile,
  ) {}

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

    return this.commentService.createCommentForUser(comment, currentUserId);
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
    return this.commentService.findCommentById(id, filter);
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
    await this.commentService.deleteCommentById(id);
  }
}
