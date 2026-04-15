import {
  authenticate,
  TokenService,
} from '@loopback/authentication';
import {TokenServiceBindings} from '@loopback/authentication-jwt';
import {inject} from '@loopback/core';
import {
  get,
  getModelSchemaRef,
  post,
  requestBody,
  response,
} from '@loopback/rest';
import {SecurityBindings, UserProfile} from '@loopback/security';
import {
  LoginRequestDto,
  LoginResponseDto,
  RegisterRequestDto,
  RegisterResponseDto,
} from '../dtos';
import {AppblogBindings} from '../keys';
import {User} from '../models';
import {AuthService} from '../services';

export class AuthController {
  constructor(
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public tokenService: TokenService,
    @inject(AppblogBindings.AUTH_SERVICE)
    public authService: AuthService,
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
    const createdUser = await this.authService.createUser({
      username: payload.username,
      email: payload.email,
      password: payload.password,
      image: payload.image,
      role: 'user',
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
            schema: getModelSchemaRef(LoginResponseDto),
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
  ): Promise<LoginResponseDto> {
    const user = await this.authService.verifyCredentials(credentials);
    const userProfile = this.authService.convertToUserProfile(user);

    const token = await this.tokenService.generateToken(userProfile);
    return {
      token,
      user: {
        id: String(user.id),
        name: user.username,
        email: user.email,
        role: user.role,
      },
    };
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
