import {cronJob, CronJob} from '@loopback/cron';
import {repository} from '@loopback/repository';
import {inject} from '@loopback/core';
import {
  UserRepository,
  PostRepository,
  StatisticsRepository,
  CommentRepository,
} from '../repositories';
import {RedisService} from '../services/redis.service';

@cronJob()
export class StatisticCountTotalJob extends CronJob {
  constructor(
    @repository(UserRepository) private userRepo: UserRepository,
    @repository(PostRepository) private postRepo: PostRepository,
    @repository(StatisticsRepository)
    private statisticsRepo: StatisticsRepository,
    @inject('services.RedisService') private redisService: RedisService,
  ) {
    super({
      name: 'statistic-count-total-job',
      onTick: async () => {
        await this.countTotal();
      },
      cronTime: '* 0 * * *', // mỗi ngày lúc 00:00
      start: true,
    });
  }

  async countTotal() {
    const now = new Date();
    const totalUser = await this.userRepo.count();
    const totalPost = await this.postRepo.count();
    console.log('Total stats:', {
      totalUser: totalUser.count,
      totalPost: totalPost.count,
    });
    const update = {
      type: 'total' as const,
      totalUser: totalUser.count,
      totalPost: totalPost.count,
      updatedAt: now,
    };
    // Upsert theo type: 'total'
    await this.statisticsRepo.updateAll(update, {type: 'total'});
    // Nếu chưa có, tạo mới
    const existed = await this.statisticsRepo.findOne({where: {type: 'total'}});
    if (!existed) {
      await this.statisticsRepo.create(update);
    }
    await this.redisService.setJson('statistics:total', update, 86400);
  }
}

/**
 * Cronjob: Đếm user/post hôm nay (chạy mỗi 10 phút)
 */
@cronJob()
export class StatisticCountTodayJob extends CronJob {
  constructor(
    @repository(UserRepository) private userRepo: UserRepository,
    @repository(PostRepository) private postRepo: PostRepository,
    @repository(StatisticsRepository)
    private statisticsRepo: StatisticsRepository,
    @inject('services.RedisService') private redisService: RedisService,
  ) {
    super({
      name: 'statistic-count-today-job',
      onTick: async () => {
        await this.countToday();
      },
      cronTime: '* */1 * * *', // mỗi 1 giờ
      start: true,
    });
  }

  async countToday() {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayUser = await this.userRepo.count({createdAt: {gte: startOfDay}});
    const todayPost = await this.postRepo.count({createdAt: {gte: startOfDay}});
    console.log('Today stats:', {
      todayUser: todayUser.count,
      todayPost: todayPost.count,
    });
    const update = {
      type: 'today' as const,
      todayUser: todayUser.count,
      todayPost: todayPost.count,
      updatedAt: now,
    };
    // Upsert theo type: 'today'
    await this.statisticsRepo.updateAll(update, {type: 'today'});
    // Nếu chưa có, tạo mới
    const existed = await this.statisticsRepo.findOne({where: {type: 'today'}});
    if (!existed) {
      await this.statisticsRepo.create(update);
    }
    await this.redisService.setJson('statistics:today', update, 900);
  }
}

@cronJob()
export class StatisticTopPostsJob extends CronJob {
  constructor(
    @repository(CommentRepository) private commentRepo: CommentRepository,
    @repository(StatisticsRepository)
    private statisticsRepo: StatisticsRepository,
    @inject('services.RedisService') private redisService: RedisService,
  ) {
    super({
      name: 'statistic-top-posts-job',
      onTick: async () => {
        await this.calcTopPosts();
      },
      cronTime: '*/1 * * * *', // mỗi 1 phút
      start: true,
    });
  }

  async calcTopPosts(limit: number = 5) {
    // Lấy top postId theo số comment
    const commentCollection =
      this.commentRepo.dataSource.connector?.collection('Comment');
    if (!commentCollection) return;
    const top = await commentCollection
      .aggregate([
        {$group: {_id: {$toString: '$postId'}, commentCount: {$sum: 1}}},
        {$sort: {commentCount: -1}},
        {$limit: limit},
      ])
      .toArray();
    const topPostIds = top.map((t: any) => t._id);
    console.log('Top posts by comment:', topPostIds);
    const now = new Date();
    const update = {
      type: 'topPosts' as const,
      topPostIds,
      updatedAt: now,
    };
    // Upsert theo type: 'topPosts'
    await this.statisticsRepo.updateAll(update, {type: 'topPosts'});
    // Nếu chưa có, tạo mới
    const existed = await this.statisticsRepo.findOne({
      where: {type: 'topPosts'},
    });
    if (!existed) {
      await this.statisticsRepo.create(update);
    }
    await this.redisService.setJson('statistics:topPosts', topPostIds, 3600);
  }
}
