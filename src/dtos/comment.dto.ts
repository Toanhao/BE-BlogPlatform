import {model, property} from '@loopback/repository';

@model()
export class CreateCommentDto {
  @property({type: 'string', required: true, jsonSchema: {minLength: 1}})
  content: string;

  @property({type: 'string', required: true})
  postId: string;

  @property({type: 'date'})
  createdAt?: string;
}
