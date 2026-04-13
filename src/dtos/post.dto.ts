import {model, property} from '@loopback/repository';

@model()
export class CreatePostDto {
  @property({type: 'string', required: true, jsonSchema: {minLength: 1}})
  title: string;

  @property({type: 'string', required: true, jsonSchema: {minLength: 1}})
  content: string;

  @property({type: 'string'})
  image?: string;

  @property({type: 'date'})
  createdAt?: string;
}

@model()
export class PaginatedPostsDto {
  @property({
    type: 'array',
    itemType: 'object',
    required: true,
  })
  items: object[];

  @property({type: 'number', required: true})
  total: number;
}
