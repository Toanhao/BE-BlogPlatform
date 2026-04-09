import {authenticate, TokenService, UserService} from '@loopback/authentication';
import {TokenServiceBindings} from '@loopback/authentication-jwt';
import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  get,
  getModelSchemaRef,
  HttpErrors,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {hash} from 'bcryptjs';
import {
  LoginRequestDto,
  RegisterRequestDto,
  RegisterResponseDto,
  TokenResponseDto,
} from '../dtos';
import {AppblogBindings} from '../keys';
import {User} from '../models';
import {UserRepository} from '../repositories';

export class AuthController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService,
    @inject(AppblogBindings.USER_SERVICE)
    public userService: UserService<User, LoginRequestDto>,
    @inject(SecurityBindings.USER, {optional: true})
    private currentUserProfile: UserProfile,
  ) {}

  @post('/auth/register', {
    responses: {
      '200': {
        description: 'Register success',
        content: {
          'application/json': {
            schema: getModelSchemaRef(RegisterResponseDto),
          },
        },
      },
      '409': {
        description: 'Email already exists',
      },
    },
  })
  async register(
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(RegisterRequestDto),
        },
      },
    })
    payload: RegisterRequestDto,
  ): Promise<RegisterResponseDto> {
    const existingUser = await this.userRepository.findOne({
      where: {email: payload.email},
    });

    if (existingUser) {
      throw new HttpErrors.Conflict('Email already exists');
    }

    const password = await hash(payload.password, 10);
    const createdUser = await this.userRepository.create({
      username: payload.username,
      email: payload.email,
      password,
      role: 'user',
      image: payload.image,
    });

    return {
      id: createdUser.id,
      username: createdUser.username,
      email: createdUser.email,
      role: createdUser.role,
      image: createdUser.image,
    };
  }

  @post('/auth/login', {
    responses: {
      '200': {
        description: 'Login success',
        content: {
          'application/json': {
            schema: getModelSchemaRef(TokenResponseDto),
          },
        },
      },
      '401': {
        description: 'Invalid email or password',
      },
    },
  })
  async login(
    @requestBody({
      required: true,
      content: {
        'application/json': {
          schema: getModelSchemaRef(LoginRequestDto),
        },
      },
    })
    credentials: LoginRequestDto,
  ): Promise<TokenResponseDto> {
    const user = await this.userService.verifyCredentials(credentials);
    const userProfile = this.userService.convertToUserProfile(user);

    const token = await this.tokenService.generateToken(userProfile);
    return {token};
  }

  @authenticate('jwt')
  @get('/auth/me')
  @response(200, {
    description: 'Current authenticated user profile',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
  })
  me(): UserProfile {
    return this.currentUserProfile;
  }
}
