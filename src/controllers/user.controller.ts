import {
  Filter,
  FilterExcludingWhere,
} from '@loopback/repository';
import {authorize, AuthorizationMetadata} from '@loopback/authorization';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  requestBody,
  response,
} from '@loopback/rest';
import {authenticate} from '@loopback/authentication';
import {Post, User} from '../models';
import {CreateUserDto} from '../dtos';
import {inject} from '@loopback/core';
import {AppblogBindings} from '../keys';
import {UserService} from '../services';

@authenticate('jwt')
export class UserController {
  constructor(
    @inject(AppblogBindings.USER_SERVICE)
    private userService: UserService,
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
    return this.userService.createUser({
      username: user.username,
      email: user.email,
      password: user.password,
      image: user.image,
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
    return this.userService.findUsers(filter);
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
    @param.filter(User, {exclude: 'where'}) filter?: FilterExcludingWhere<User>,
  ): Promise<User> {
    return this.userService.findUserById(id, filter);
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
    return this.userService.findPostsByUserId(id);
  }
}
