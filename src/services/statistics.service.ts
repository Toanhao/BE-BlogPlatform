import {injectable, inject,  BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {StatisticsRepository} from '../repositories';
import {RedisService} from '../services/redis.service';

@injectable({scope: BindingScope.TRANSIENT})
export class StatisticsService {
  constructor(
    @repository(StatisticsRepository) private statisticsRepo: StatisticsRepository,
    @inject('services.RedisService') private redisService: RedisService,
  ) {}

  async getCountStatistics() {
    try {
      const total = await this.redisService.getJson<any>('statistics:total');
      const today = await this.redisService.getJson<any>('statistics:today');
      if (total && today) {
        return {
          totalUser: total.totalUser,
          totalPost: total.totalPost,
          todayUser: today.todayUser,
          todayPost: today.todayPost,
          updatedAt: total.updatedAt || today.updatedAt,
        };
      }
      const totalDoc = await this.statisticsRepo.findOne({where: {type: 'total'}});
      const todayDoc = await this.statisticsRepo.findOne({where: {type: 'today'}});
      if (totalDoc || todayDoc) {
        return {
          totalUser: totalDoc?.totalUser ?? 0,
          totalPost: totalDoc?.totalPost ?? 0,
          todayUser: todayDoc?.todayUser ?? 0,
          todayPost: todayDoc?.todayPost ?? 0,
          updatedAt: totalDoc?.updatedAt || todayDoc?.updatedAt || null,
        };
      }
    } catch (e) {
      // Optionally log error
    }
    return {
      totalUser: 0,
      totalPost: 0,
      todayUser: 0,
      todayPost: 0,
      updatedAt: null,
    };
  }
}
