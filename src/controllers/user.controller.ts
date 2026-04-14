import {
  Count,
  CountSchema,
  Filter,
  repository,
  Where,
} from '@loopback/repository';
import {authorize, AuthorizationMetadata} from '@loopback/authorization';
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
  HttpErrors,
} from '@loopback/rest';
import {hash} from 'bcryptjs';
import {authenticate} from '@loopback/authentication';
import {Post, User} from '../models';
import {UserRepository} from '../repositories';
import {CreateUserDto} from '../dtos';
import {inject} from '@loopback/core';
import {AppblogBindings} from '../keys';
import {RedisService} from '../services';

const TTL_MY_POSTS = 120;
const KEY_MY_POSTS_PREFIX = 'posts:my:';

@authenticate('jwt')
export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(AppblogBindings.REDIS_SERVICE)
    private redisService: RedisService,
  ) {}

  @authorize({
    allowedRoles: ['admin'],
  } as AuthorizationMetadata)
  @post('/users')
  @response(200, {
    description: 'User model instance',
    content: {'application/json': {schema: getModelSchemaRef(User)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CreateUserDto),
        },
      },
    })
    user: CreateUserDto,
  ): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: {email: user.email},
    });
    if (existingUser) {
      throw new HttpErrors.Conflict('Email already exists');
    }

    const hashedPassword = await hash(user.password, 10);
    return this.userRepository.create({
      ...user,
      password: hashedPassword,
      role: 'user',
    });
  }

  @get('/users')
  @authorize({
    allowedRoles: ['admin'],
  } as AuthorizationMetadata)
  @response(200, {
    description: 'Array of User model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(User, {includeRelations: true}),
        },
      },
    },
  })
  async find(@param.filter(User) filter?: Filter<User>): Promise<User[]> {
    return this.userRepository.find(filter);
  }

  @get('/users/{id}')
  @authorize({
    allowedRoles: ['admin'],
    owner: 'user',
    ownerArgIndex: 0,
  } as AuthorizationMetadata)
  @response(200, {
    description: 'User model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(User, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(User, {exclude: 'where'}) filter?: Filter<User>,
  ): Promise<User> {
    return this.userRepository.findById(id, filter);
  }

  @get('/users/{id}/posts')
  @authorize({
    allowedRoles: ['admin'],
    owner: 'user',
    ownerArgIndex: 0,
  } as AuthorizationMetadata)
  @response(200, {
    description: 'Array of Post model instances owned by the user',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(Post, {includeRelations: true}),
        },
      },
    },
  })
  async findPostsByUserId(
    @param.path.string('id') id: string,
  ): Promise<Post[]> {
    const cacheKey = `${KEY_MY_POSTS_PREFIX}${id}`;
    const cached = await this.redisService.getJson<Post[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const posts = await this.userRepository.posts(id).find({
      order: ['createdAt DESC'],
      include: [{relation: 'author'}],
    });

    await this.redisService.setJson(cacheKey, posts, TTL_MY_POSTS);

    return posts;
  }
}
