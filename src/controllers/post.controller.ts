import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {authorize, AuthorizationMetadata} from '@loopback/authorization';
import {authenticate} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  response,
} from '@loopback/rest';
import {securityId, SecurityBindings, UserProfile} from '@loopback/security';
import {Post} from '../models';
import {PostRepository} from '../repositories';
import {CreatePostDto} from '../dtos';

export class PostController {
  constructor(
    @repository(PostRepository)
    public postRepository : PostRepository,
    @inject(SecurityBindings.USER, {optional: true})
    private currentUserProfile: UserProfile,
  ) {}

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
    return this.postRepository.create({
      ...postData,
      authorId: currentUserId,
      createdAt: postData.createdAt ?? new Date().toISOString(),
    });
  }

  @get('/posts/count')
  @response(200, {
    description: 'Post model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(Post) where?: Where<Post>,
  ): Promise<Count> {
    return this.postRepository.count(where);
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
  async find(
    @param.filter(Post) filter?: Filter<Post>,
  ): Promise<Post[]> {
    return this.postRepository.find(filter);
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
    @param.filter(Post, {exclude: 'where'}) filter?: FilterExcludingWhere<Post>
  ): Promise<Post> {
    return this.postRepository.findById(id, filter);
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['admin'],
    owner: 'post',
    ownerArgIndex: 0,
  } as AuthorizationMetadata)
  @patch('/posts/{id}')
  @response(204, {
    description: 'Post PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CreatePostDto, {partial: true}),
        },
      },
    })
    postData: Partial<CreatePostDto>,
  ): Promise<void> {
    await this.postRepository.updateById(id, postData);
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['admin'],
    owner: 'post',
    ownerArgIndex: 0,
  } as AuthorizationMetadata)
  @put('/posts/{id}')
  @response(204, {
    description: 'Post PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CreatePostDto),
        },
      },
    })
    postData: CreatePostDto,
  ): Promise<void> {
    const existingPost = await this.postRepository.findById(id);

    const replacement = Object.assign(existingPost, postData, {
      authorId: existingPost.authorId,
      createdAt: existingPost.createdAt,
    });

    await this.postRepository.replaceById(id, replacement);
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
    await this.postRepository.deleteById(id);
  }
}
