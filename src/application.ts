import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {AuthenticationComponent} from '@loopback/authentication';
import {
  AuthorizationComponent,
  AuthorizationTags,
} from '@loopback/authorization';
import {
  JWTAuthenticationComponent,
  TokenServiceBindings,
  UserServiceBindings,
} from '@loopback/authentication-jwt';
import {
  RestExplorerBindings,
  RestExplorerComponent,
} from '@loopback/rest-explorer';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {MongoDbDataSource} from './datasources';
import {AppblogBindings} from './keys';
import {AppblogAuthorizationProvider} from './providers';
import {MySequence} from './sequence';
import {AppblogUserService, CooldownService, RedisService} from './services';
import {RateLimitMiddlewareProvider} from './middleware/rate-limit.middleware';
import {UserRateLimitInterceptorProvider} from './interceptors/user-rate-limit.interceptor';

export {ApplicationConfig};

export class AppblogApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    // Mount authentication system and JWT implementation.
    this.component(AuthenticationComponent);
    this.component(AuthorizationComponent);
    this.component(JWTAuthenticationComponent);
    this.bind(TokenServiceBindings.TOKEN_SECRET).to(
      process.env.JWT_SECRET ?? 'my-secret-key',
    );
    this.bind(TokenServiceBindings.TOKEN_EXPIRES_IN).to(
      process.env.JWT_EXPIRES_IN ?? '3600',
    );
    this.dataSource(MongoDbDataSource, UserServiceBindings.DATASOURCE_NAME);
    this.bind(AppblogBindings.USER_SERVICE).toClass(AppblogUserService);
    this.bind(AppblogBindings.REDIS_SERVICE).toClass(RedisService);
    this.bind(AppblogBindings.COOLDOWN_SERVICE).toClass(CooldownService);
    this.middleware(RateLimitMiddlewareProvider);
    this.interceptor(UserRateLimitInterceptorProvider, {global: true});
    this.bind('authorizationProviders.appblog')
      .toProvider(AppblogAuthorizationProvider)
      .tag(AuthorizationTags.AUTHORIZER);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }
}
