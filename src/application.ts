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
import {CronComponent} from '@loopback/cron';
import {
  StatisticCountTotalJob,
  StatisticCountTodayJob,
  StatisticTopPostsJob,
  StatisticTopUsersJob,
  StatisticUserDailyJob,
  StatisticPostDailyJob,
} from './jobs';
import {MongoDbDataSource} from './datasources';
import {AppblogBindings} from './keys';
import {AppblogAuthorizationProvider} from './providers';
import {MySequence} from './sequence';
import {
  AuthService,
  CommentService,
  CooldownService,
  PostService,
  UserService,
  RedisService,
} from './services';
import {RateLimitMiddlewareProvider} from './middleware/rate-limit.middleware';
import {CookieAuthMiddlewareProvider} from './middleware/cookie-auth.middleware';
import {RateLimitInterceptorProvider} from './interceptors/rate-limit.interceptor';

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

    // Đăng ký cron job component
    this.component(CronComponent);

    // Đăng ký cron job
    this.component(CronComponent);
    this.bind(TokenServiceBindings.TOKEN_SECRET).to(
      process.env.JWT_SECRET ?? 'my-secret-key',
    );
    this.bind(TokenServiceBindings.TOKEN_EXPIRES_IN).to(
      process.env.JWT_EXPIRES_IN ?? '3600',
    );
    this.dataSource(MongoDbDataSource, UserServiceBindings.DATASOURCE_NAME);
    this.bind(AppblogBindings.AUTH_SERVICE).toClass(AuthService);
    this.bind(AppblogBindings.USER_SERVICE).toClass(UserService);
    this.bind(AppblogBindings.COMMENT_SERVICE).toClass(CommentService);
    this.bind(AppblogBindings.REDIS_SERVICE).toClass(RedisService);
    this.bind(AppblogBindings.COOLDOWN_SERVICE).toClass(CooldownService);
    this.bind(AppblogBindings.POST_SERVICE).toClass(PostService);
    this.middleware(CookieAuthMiddlewareProvider);
    this.middleware(RateLimitMiddlewareProvider);
    this.bind(AppblogBindings.RATE_LIMIT_INTERCEPTOR).toProvider(
      RateLimitInterceptorProvider,
    );
    this.bind('authorizationProviders.appblog')
      .toProvider(AppblogAuthorizationProvider)
      .tag(AuthorizationTags.AUTHORIZER);

    const {createBindingFromClass} = require('@loopback/core');
    this.add(createBindingFromClass(StatisticCountTotalJob));
    this.add(createBindingFromClass(StatisticCountTodayJob));
    this.add(createBindingFromClass(StatisticTopPostsJob));
    this.add(createBindingFromClass(StatisticTopUsersJob));
    this.add(createBindingFromClass(StatisticUserDailyJob));
    this.add(createBindingFromClass(StatisticPostDailyJob));
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
