import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
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

@authenticate('jwt')
export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
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

  @get('/users/count')
  @authorize({
    allowedRoles: ['admin'],
  } as AuthorizationMetadata)
  @response(200, {
    description: 'User model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(@param.where(User) where?: Where<User>): Promise<Count> {
    return this.userRepository.count(where);
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
    @param.filter(User, {exclude: 'where'}) filter?: FilterExcludingWhere<User>,
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
    @param.filter(Post) filter?: Filter<Post>,
  ): Promise<Post[]> {
    return this.userRepository.posts(id).find({
      ...filter,
      include: [{relation: 'author'}],
    });
  }

  @patch('/users/{id}')
  @authorize({
    allowedRoles: ['admin'],
    owner: 'user',
    ownerArgIndex: 0,
  } as AuthorizationMetadata)
  @response(204, {
    description: 'User PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CreateUserDto, {partial: true}),
        },
      },
    })
    user: Partial<CreateUserDto>,
  ): Promise<void> {
    if (user.password) {
      user.password = await hash(user.password, 10);
    }
    await this.userRepository.updateById(id, user);
  }

  @put('/users/{id}')
  @authorize({
    allowedRoles: ['admin'],
    owner: 'user',
    ownerArgIndex: 0,
  } as AuthorizationMetadata)
  @response(204, {
    description: 'User PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(CreateUserDto),
        },
      },
    })
    user: CreateUserDto,
  ): Promise<void> {
    const existingUser = await this.userRepository.findById(id);

    const hashedPassword = await hash(user.password, 10);
    const replacement = {
      ...existingUser,
      ...user,
      password: hashedPassword,
    };

    replacement.role = existingUser.role;

    await this.userRepository.replaceById(id, replacement);
  }

  @del('/users/{id}')
  @authorize({
    allowedRoles: ['admin'],
  } as AuthorizationMetadata)
  @response(204, {
    description: 'User DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.userRepository.deleteById(id);
  }
}
