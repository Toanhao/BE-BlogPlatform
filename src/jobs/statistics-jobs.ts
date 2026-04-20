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
export class StatisticUserDailyJob extends CronJob {
  constructor(
    @repository(UserRepository) private userRepo: UserRepository,
    @repository(StatisticsRepository)
    private statisticsRepo: StatisticsRepository,
    @inject('services.RedisService') private redisService: RedisService,
  ) {
    super({
      name: 'statistic-user-daily-job',
      onTick: async () => {
        await this.countUserDaily();
      },
      cronTime: '*/1 * * * *', // mỗi 1 phút
      start: true,
    });
  }

  async countUserDaily() {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    const userCount = await this.userRepo.count({
      createdAt: {gte: startOfDay, lt: endOfDay},
    });
    const dateStr = startOfDay.toISOString().slice(0, 10); // yyyy-mm-dd
    const update = {
      type: 'userDaily' as const,
      date: dateStr,
      userCount: userCount.count,
      updatedAt: now,
    };
    await this.statisticsRepo.updateAll(update, {
      type: 'userDaily',
      date: dateStr,
    });
    const existed = await this.statisticsRepo.findOne({
      where: {type: 'userDaily', date: dateStr},
    });
    if (!existed) {
      await this.statisticsRepo.create(update);
    }
    await this.redisService.setJson(
      `statistics:userDaily:${dateStr}`,
      update,
      172800,
    );
  }
}

@cronJob()
export class StatisticPostDailyJob extends CronJob {
  constructor(
    @repository(PostRepository) private postRepo: PostRepository,
    @repository(StatisticsRepository)
    private statisticsRepo: StatisticsRepository,
    @inject('services.RedisService') private redisService: RedisService,
  ) {
    super({
      name: 'statistic-post-daily-job',
      onTick: async () => {
        await this.countPostDaily();
      },
      cronTime: '*/1 * * * *', // mỗi 1 phút
      start: true,
    });
  }

  async countPostDaily() {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    const postCount = await this.postRepo.count({
      createdAt: {gte: startOfDay, lt: endOfDay},
    });
    const dateStr = startOfDay.toISOString().slice(0, 10); // yyyy-mm-dd
    const update = {
      type: 'postDaily' as const,
      date: dateStr,
      postCount: postCount.count,
      updatedAt: now,
    };
    await this.statisticsRepo.updateAll(update, {
      type: 'postDaily',
      date: dateStr,
    });
    const existed = await this.statisticsRepo.findOne({
      where: {type: 'postDaily', date: dateStr},
    });
    if (!existed) {
      await this.statisticsRepo.create(update);
    }
    await this.redisService.setJson(
      `statistics:postDaily:${dateStr}`,
      update,
      172800,
    );
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
    const topPosts = top.map((t: any) => ({
      postId: t._id,
      commentCount: t.commentCount,
    }));
    console.log('Top posts by comment:', topPosts);
    const now = new Date();
    const update = {
      type: 'topPosts' as const,
      topPosts,
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
    await this.redisService.setJson('statistics:topPosts', topPosts, 3600);
  }
}

@cronJob()
export class StatisticTopUsersJob extends CronJob {
  constructor(
    @repository(PostRepository) private postRepo: PostRepository,
    @repository(StatisticsRepository)
    private statisticsRepo: StatisticsRepository,
    @inject('services.RedisService') private redisService: RedisService,
  ) {
    super({
      name: 'statistic-top-users-job',
      onTick: async () => {
        await this.calcTopUsers();
      },
      cronTime: '*/1 * * * *', // mỗi 1 phút
      start: true,
    });
  }

  async calcTopUsers(limit: number = 5) {
    const postCollection =
      this.postRepo.dataSource.connector?.collection('Post');
    if (!postCollection) return;
    const top = await postCollection
      .aggregate([
        {$group: {_id: {$toString: '$authorId'}, postCount: {$sum: 1}}},
        {$sort: {postCount: -1}},
        {$limit: limit},
      ])
      .toArray();
    const topUsers = top.map((t: any) => ({
      userId: t._id,
      postCount: t.postCount,
    }));
    console.log('Top users by post:', topUsers);
    const now = new Date();
    const update = {
      type: 'topUsers' as const,
      topUsers,
      updatedAt: now,
    };
    // Upsert theo type: 'topUsers'
    await this.statisticsRepo.updateAll(update, {type: 'topUsers'});
    // Nếu chưa có, tạo mới
    const existed = await this.statisticsRepo.findOne({
      where: {type: 'topUsers'},
    });
    if (!existed) {
      await this.statisticsRepo.create(update);
    }
    await this.redisService.setJson('statistics:topUsers', topUsers, 3600);
  }
}
