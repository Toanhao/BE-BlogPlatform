import {Entity, model, property} from '@loopback/repository';

@model()
export class Statistics extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({type: 'string', required: true})
  type: 'total' | 'today' | 'topPosts' | 'topUsers';

  @property({type: 'number'})
  totalUser?: number;

  @property({type: 'number'})
  totalPost?: number;

  @property({type: 'number'})
  todayUser?: number;

  @property({type: 'number'})
  todayPost?: number;

  @property({
    type: 'array',
    itemType: 'object',
    required: false,
    jsonSchema: {
      items: {
        type: 'object',
        properties: {
          postId: {type: 'string'},
          commentCount: {type: 'number'},
        },
        required: ['postId', 'commentCount'],
      },
    },
  })
  topPosts?: {postId: string; commentCount: number}[];

  @property({
    type: 'array',
    itemType: 'object',
    required: false,
    jsonSchema: {
      items: {
        type: 'object',
        properties: {
          userId: {type: 'string'},
          postCount: {type: 'number'},
        },
        required: ['userId', 'postCount'],
      },
    },
  })
  topUsers?: {userId: string; postCount: number}[];

  @property({type: 'date', required: true})
  updatedAt: Date;

  constructor(data?: Partial<Statistics>) {
    super(data);
  }
}

export interface StatisticsRelations {}
export type StatisticsWithRelations = Statistics & StatisticsRelations;
