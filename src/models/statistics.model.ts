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
  type: 'total' | 'today' | 'topPosts';

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
    itemType: 'string',
    required: false,
  })
  topPostIds?: string[];

  @property({type: 'date', required: true})
  updatedAt: Date;

  constructor(data?: Partial<Statistics>) {
    super(data);
  }
}

export interface StatisticsRelations {}
export type StatisticsWithRelations = Statistics & StatisticsRelations;
