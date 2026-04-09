import {Entity, model, property, belongsTo} from '@loopback/repository';
import {User} from './user.model';
import {Post} from './post.model';

@model({settings: {strict: false}})
export class Comment extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  content: string;
  @property({
    type: 'date',
  })
  createdAt?: string;

  @belongsTo(() => User)
  authorId: string;

  @belongsTo(() => Post)
  postId: string;
  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Comment>) {
    super(data);
  }
}

export interface CommentRelations {
  // describe navigational properties here
}

export type CommentWithRelations = Comment & CommentRelations;
