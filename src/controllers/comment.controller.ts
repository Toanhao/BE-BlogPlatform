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
import {Comment} from '../models';
import {CommentRepository} from '../repositories';

export class CommentController {
  constructor(
    @repository(CommentRepository)
    public commentRepository: CommentRepository,
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
    return this.commentRepository.create({
      ...comment,
      authorId: currentUserId,
      createdAt: comment.createdAt ?? new Date().toISOString(),
    });
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['admin'],
  } as AuthorizationMetadata)
  @patch('/comments')
  @response(200, {
    description: 'Comment PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CreateCommentDto, {partial: true}),
        },
      },
    })
    comment: Partial<CreateCommentDto>,
    @param.where(Comment) where?: Where<Comment>,
  ): Promise<Count> {
    return this.commentRepository.updateAll(comment, where);
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
  @patch('/comments/{id}')
  @response(204, {
    description: 'Comment PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CreateCommentDto, {partial: true}),
        },
      },
    })
    comment: Partial<CreateCommentDto>,
  ): Promise<void> {
    await this.commentRepository.updateById(id, comment);
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['admin'],
    owner: 'comment',
    ownerArgIndex: 0,
  } as AuthorizationMetadata)
  @put('/comments/{id}')
  @response(204, {
    description: 'Comment PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CreateCommentDto),
        },
      },
    })
    comment: CreateCommentDto,
  ): Promise<void> {
    const existingComment = await this.commentRepository.findById(id);

    const replacement = Object.assign(existingComment, comment, {
      authorId: existingComment.authorId,
      createdAt: existingComment.createdAt,
    });

    await this.commentRepository.replaceById(id, replacement);
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
    await this.commentRepository.deleteById(id);
  }
}
