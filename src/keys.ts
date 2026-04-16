import {BindingKey} from '@loopback/core';
import type {CooldownService} from './services/cooldown.service';
import type {AuthService} from './services/auth.service';
import type {CommentService} from './services/comment.service';
import type {PostService} from './services/post.service';
import type {UserService} from './services/user.service';
import type {RedisService} from './services/redis.service';

export namespace AppblogBindings {
  export const AUTH_SERVICE = BindingKey.create<AuthService>(
    'services.appblog.auth.service',
  );

  export const USER_SERVICE = BindingKey.create<UserService>(
    'services.appblog.user.service',
  );

  export const COMMENT_SERVICE = BindingKey.create<CommentService>(
    'services.appblog.comment.service',
  );

  export const REDIS_SERVICE = BindingKey.create<RedisService>(
    'services.appblog.redis.service',
  );

  export const COOLDOWN_SERVICE = BindingKey.create<CooldownService>(
    'services.appblog.cooldown.service',
  );

  export const POST_SERVICE = BindingKey.create<PostService>(
    'services.appblog.post.service',
  );

  export const RATE_LIMIT_INTERCEPTOR =
    'interceptors.appblog.rate-limit';
}
