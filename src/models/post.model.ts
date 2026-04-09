import {Entity, model, property, hasMany, belongsTo} from '@loopback/repository';
import {Comment} from './comment.model';
import {User} from './user.model';

@model({settings: {strict: false}})
export class Post extends Entity {
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
  title: string;

  @property({
    type: 'string',
    required: true,
  })
  content: string;
  @property({
    type: 'date',
  })
  createdAt?: string;

  @property({
    type: 'string',
  })
  image?: string;

  @hasMany(() => Comment)
  comments: Comment[];

  @belongsTo(() => User)
  authorId: string;
  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<Post>) {
    super(data);
  }
}

export interface PostRelations {
  // describe navigational properties here
}

export type PostWithRelations = Post & PostRelations;
