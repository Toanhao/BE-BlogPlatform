import {authenticate} from '@loopback/authentication';
import {AuthorizationMetadata, authorize} from '@loopback/authorization';
import {intercept, inject} from '@loopback/core';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  Where,
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
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';
import {CreatePostDto, PaginatedPostsDto} from '../dtos';
import {AppblogBindings} from '../keys';
import {Post} from '../models';
import {rateLimit} from '../rate-limit';
import {PostService} from '../services';

export class PostController {
  constructor(
    @inject(AppblogBindings.POST_SERVICE)
    private postService: PostService,
    @inject(SecurityBindings.USER, {optional: true})
    private currentUserProfile: UserProfile,
  ) {}

  @authenticate('jwt')
  @post('/posts')
  @intercept(AppblogBindings.RATE_LIMIT_INTERCEPTOR)
  @rateLimit('post.create')
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

    return this.postService.createPostForUser(postData, currentUserId);
  }

  @get('/posts/count')
  @response(200, {
    description: 'Post model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(@param.where(Post) where?: Where<Post>): Promise<Count> {
    return this.postService.countPosts(where);
  }

  @get('/posts/paginated')
  @intercept(AppblogBindings.RATE_LIMIT_INTERCEPTOR)
  @rateLimit('post.read')
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
    return this.postService.findPaginatedPosts(skip, limit, order, q);
  }

  @authenticate('jwt')
  @authorize({
    allowedRoles: ['admin'],
  } as AuthorizationMetadata)
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
    return this.postService.findPosts(filter);
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
    return this.postService.findPostDetail(id, filter);
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
    await this.postService.deletePostById(id);
  }
}
