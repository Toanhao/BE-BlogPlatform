import {BindingKey} from '@loopback/core';
import {UserService} from '@loopback/authentication';
import {LoginRequestDto} from './dtos';
import {User} from './models';
import type {CooldownService} from './services/cooldown.service';
import type {RedisService} from './services/redis.service';

export namespace AppblogBindings {
  export const USER_SERVICE = BindingKey.create<
    UserService<User, LoginRequestDto>
  >('services.appblog.user.service');

  export const REDIS_SERVICE = BindingKey.create<RedisService>(
    'services.appblog.redis.service',
  );

  export const COOLDOWN_SERVICE = BindingKey.create<CooldownService>(
    'services.appblog.cooldown.service',
  );
}
