import {BindingKey} from '@loopback/core';
import {UserService} from '@loopback/authentication';
import {LoginRequestDto} from './dtos';
import {User} from './models';

export namespace AppblogBindings {
  export const USER_SERVICE = BindingKey.create<
    UserService<User, LoginRequestDto>
  >('services.appblog.user.service');
}
