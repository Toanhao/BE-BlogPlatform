import {model, property} from '@loopback/repository';

@model()
export class CreateUserDto {
  @property({type: 'string', required: true, jsonSchema: {minLength: 1}})
  username: string;

  @property({type: 'string', required: true, jsonSchema: {format: 'email'}})
  email: string;

  @property({type: 'string', required: true, jsonSchema: {minLength: 6}})
  password: string;

  @property({type: 'string'})
  image?: string;
}
