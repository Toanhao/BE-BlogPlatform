import {authenticate, TokenService} from '@loopback/authentication';
import {TokenServiceBindings} from '@loopback/authentication-jwt';
import {intercept, inject} from '@loopback/core';
import {
  get,
  getModelSchemaRef,
  post,
  RestBindings,
  requestBody,
  Response,
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
import {rateLimit} from '../rate-limit';
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
  @intercept(AppblogBindings.RATE_LIMIT_INTERCEPTOR)
  @rateLimit('auth.register')
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
  @intercept(AppblogBindings.RATE_LIMIT_INTERCEPTOR)
  @rateLimit('auth.login')
  async login(
    @inject(RestBindings.Http.RESPONSE) res: Response,
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

    const isSecure = process.env.NODE_ENV === 'production';
    const maxAgeSeconds = Number(process.env.AUTH_COOKIE_MAX_AGE ?? 3600);
    const serializedCookie = [
      `access_token=${encodeURIComponent(token)}`,
      'HttpOnly',
      'Path=/',
      `Max-Age=${Number.isFinite(maxAgeSeconds) ? maxAgeSeconds : 3600}`,
      'SameSite=Lax',
      isSecure ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');

    res.setHeader('Set-Cookie', serializedCookie);

    return {
      user: {
        id: String(user.id),
        name: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  @post('/auth/logout', {
    responses: {
      '204': {
        description: 'Logout success',
      },
    },
  })
  logout(@inject(RestBindings.Http.RESPONSE) res: Response): void {
    const isSecure = process.env.NODE_ENV === 'production';
    const serializedCookie = [
      'access_token=',
      'HttpOnly',
      'Path=/',
      'Max-Age=0',
      'SameSite=Lax',
      isSecure ? 'Secure' : '',
    ]
      .filter(Boolean)
      .join('; ');

    res.setHeader('Set-Cookie', serializedCookie);
    res.status(204).send();
  }

  @authenticate('jwt')
  @get('/auth/me')
  @response(200, {
    description: 'Current authenticated user profile',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: {type: 'string'},
                name: {type: 'string'},
                email: {type: 'string'},
                role: {type: 'string'},
              },
              required: ['id', 'name', 'email', 'role'],
            },
          },
          required: ['user'],
        },
      },
    },
  })
  async me(): Promise<{
    user: {id: string; name: string; email: string; role: string};
  }> {
    const userId = this.currentUserProfile?.id;
    if (!userId) throw new Error('Unauthorized');
    const user = await this.authService.userRepository.findById(userId);
    return {
      user: {
        id: String(user.id),
        name: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }
}
