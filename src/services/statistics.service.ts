import {injectable, inject, BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {
  CommentRepository,
  PostRepository,
  StatisticsRepository,
  UserRepository,
} from '../repositories';
import {RedisService} from '../services/redis.service';

@injectable({scope: BindingScope.TRANSIENT})
export class StatisticsService {
  constructor(
    @repository(StatisticsRepository)
    private statisticsRepo: StatisticsRepository,
    @inject('services.RedisService') private redisService: RedisService,
    @repository(CommentRepository)
    private commentRepository: CommentRepository,
    @repository(PostRepository)
    private postRepository: PostRepository,
    @repository(UserRepository)
    private userRepository: UserRepository,
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
      const totalDoc = await this.statisticsRepo.findOne({
        where: {type: 'total'},
      });
      const todayDoc = await this.statisticsRepo.findOne({
        where: {type: 'today'},
      });
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

  async getUserDailyStats(days: number = 7) {
    const today = new Date();
    const result: {date: string; userCount: number; updatedAt: Date}[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - i,
      );
      const dateStr = d.toISOString().slice(0, 10);
      // Ưu tiên lấy từ Redis
      const cache = await this.redisService.getJson<any>(
        `statistics:userDaily:${dateStr}`,
      );
      if (cache && typeof cache.userCount === 'number') {
        result.push({
          date: dateStr,
          userCount: cache.userCount,
          updatedAt: cache.updatedAt ? new Date(cache.updatedAt) : d,
        });
        continue;
      }
      // Fallback DB
      const stat = await this.statisticsRepo.findOne({
        where: {type: 'userDaily', date: dateStr},
      });
      result.push({
        date: dateStr,
        userCount: stat?.userCount ?? 0,
        updatedAt: stat?.updatedAt ?? d,
      });
    }
    return result.reverse();
  }

  async getTopPostsByComment(limit: number = 5) {
    let topPosts = await this.redisService.getJson<
      {postId: string; commentCount: number}[]
    >('statistics:topPosts');
    if (!Array.isArray(topPosts) || !topPosts.length) {
      const doc = await this.statisticsRepo.findOne({
        where: {type: 'topPosts'},
      });
      topPosts = doc?.topPosts ?? [];
    }
    topPosts = topPosts.slice(0, limit);
    if (!topPosts.length) return [];
    const postIds = topPosts.map(t => t.postId);
    const posts = await this.postRepository.find({
      where: {id: {inq: postIds}},
      fields: {
        id: true,
        title: true,
        excerpt: true,
        image: true,
        createdAt: true,
        authorId: true,
      },
      include: [
        {
          relation: 'author',
          scope: {fields: {username: true}},
        },
      ],
    });
    const postMap = new Map(posts.map(p => [p.id, p]));
    return topPosts
      .map(tp => {
        const post = postMap.get(tp.postId);
        if (!post) return null;
        return {
          ...post,
          commentCount: tp.commentCount,
        };
      })
      .filter(Boolean);
  }

  async getTopUsersByPostCount(limit: number = 5) {
    let topUsers = await this.redisService.getJson<
      {userId: string; postCount: number}[]
    >('statistics:topUsers');
    if (!Array.isArray(topUsers) || !topUsers.length) {
      const doc = await this.statisticsRepo.findOne({
        where: {type: 'topUsers'},
      });
      topUsers = doc?.topUsers ?? [];
    }
    topUsers = topUsers.slice(0, limit);
    if (!topUsers.length) return [];
    const userIds = topUsers.map(t => t.userId);
    const users = await this.userRepository.find({
      where: {id: {inq: userIds}},
      fields: {
        id: true,
        username: true,
        email: true,
        avatar: true,
      },
    });
    const userMap = new Map(users.map((u: any) => [u.id, u]));
    return topUsers.map(u => {
      const user = userMap.get(u.userId) || {};
      return {
        id: u.userId,
        postCount: u.postCount,
        username: user.username || '',
        email: user.email || '',
        avatar: user.avatar || '',
      };
    });
  }
}
