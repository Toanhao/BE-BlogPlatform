import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {Statistics, StatisticsRelations} from '../models/statistics.model';
import {MongoDbDataSource} from '../datasources';

export class StatisticsRepository extends DefaultCrudRepository<
  Statistics,
  typeof Statistics.prototype.id,
  StatisticsRelations
> {
  constructor(@inject('datasources.MongoDb') dataSource: MongoDbDataSource) {
    super(Statistics, dataSource);
  }
}
