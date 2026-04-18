import {model, property} from '@loopback/repository';

@model()
export class LoginRequestDto {
  @property({type: 'string', required: true, jsonSchema: {format: 'email'}})
  email: string;

  @property({type: 'string', required: true, jsonSchema: {minLength: 1}})
  password: string;
}

@model()
export class RegisterRequestDto {
  @property({type: 'string', required: true, jsonSchema: {minLength: 1}})
  username: string;

  @property({type: 'string', required: true, jsonSchema: {format: 'email'}})
  email: string;

  @property({type: 'string', required: true, jsonSchema: {minLength: 6}})
  password: string;

  @property({type: 'string'})
  image?: string;
}

@model()
export class TokenResponseDto {
  @property({type: 'string', required: true})
  token: string;
}

@model()
export class UserProfileDto {
  @property({type: 'string', required: true})
  id: string;

  @property({type: 'string', required: true})
  name: string;

  @property({type: 'string', required: true})
  email: string;

  @property({type: 'string', required: true})
  role: string;
}

@model()
export class LoginResponseDto {
  @property({type: UserProfileDto, required: true})
  user: UserProfileDto;
}

@model()
export class RegisterResponseDto {
  @property({type: 'string'})
  id?: string;

  @property({type: 'string', required: true})
  username: string;

  @property({type: 'string', required: true})
  email: string;

  @property({type: 'string', required: true})
  role: string;

  @property({type: 'string'})
  image?: string;
}
