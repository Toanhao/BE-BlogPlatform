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
import {Post} from '../models';
import {CommentRepository, PostRepository} from '../repositories';

export class PostController {
  constructor(
    @repository(PostRepository)
    public postRepository: PostRepository,
    @repository(CommentRepository)
    public commentRepository: CommentRepository,
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
    const excerpt = postData.content.substring(0, 180) + 
      (postData.content.length > 180 ? '...' : '');
    
    return this.postRepository.create({
      ...postData,
      excerpt,
      authorId: currentUserId,
      createdAt: postData.createdAt ?? new Date().toISOString(),
    });
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
    @param.query.string('order', {description: 'Order by field, e.g., createdAt DESC'})
    order: string = 'createdAt DESC',
  ): Promise<PaginatedPostsDto> {
    const [items, countResult] = await Promise.all([
      this.postRepository.find({
        skip,
        limit,
        order: [order as any],
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
      }),
      this.postRepository.count(),
    ]);

    const total = typeof countResult === 'number' ? countResult : countResult.count;

    return {items, total};
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
    return this.postRepository.findById(id, {
      ...filter,
      include: [
        {
          relation: 'author',
          scope: {fields: {id: true, username: true}},
        },
        {
          relation: 'comments',
          scope: {
            fields: {
              id: true,
              content: true,
              postId: true,
              authorId: true,
            },
            include: [
              {
                relation: 'author',
                scope: {fields: {id: true, username: true}},
              },
            ],
          },
        },
      ],
    });
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
    const excerpt = postData.content.substring(0, 180) + 
      (postData.content.length > 180 ? '...' : '');

    const replacement = Object.assign(existingPost, postData, {
      excerpt,
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
    await this.commentRepository.deleteAll({postId: id});
    await this.postRepository.deleteById(id);
  }
}
