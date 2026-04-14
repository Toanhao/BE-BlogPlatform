import {BindingKey} from '@loopback/core';
import {UserService} from '@loopback/authentication';
import {LoginRequestDto} from './dtos';
import {User} from './models';
import {RedisService} from './services';

export namespace AppblogBindings {
  export const USER_SERVICE = BindingKey.create<
    UserService<User, LoginRequestDto>
  >('services.appblog.user.service');

  export const REDIS_SERVICE = BindingKey.create<RedisService>(
    'services.appblog.redis.service',
  );
}
