import {UserDailyStatDto} from '../dtos/statistics.dto';

import {inject} from '@loopback/core';
import {get, ResponseObject} from '@loopback/rest';
import {StatisticsService} from '../services/statistics.service';

import {CountStatisticsResponseDto} from '../dtos/statistics.dto';

import {PostService} from '../services/post.service';
import {TopPostDto} from '../dtos/statistics.dto';

const STATISTICS_COUNT_RESPONSE: ResponseObject = {
  description: 'Count statistics response',
  content: {
    'application/json': {
      schema: CountStatisticsResponseDto.schema,
    },
  },
};

export class StatisticsController {
  constructor(
    @inject('services.StatisticsService')
    private statisticsService: StatisticsService,
    @inject('services.PostService') private postService: PostService,
  ) {}

  @get('/admin/statistics/count', {
    responses: {
      '200': STATISTICS_COUNT_RESPONSE,
    },
    description: 'Get user/post count statistics (total & today)',
  })
  async getCountStatistics() {
    return this.statisticsService.getCountStatistics();
  }

  @get('/admin/statistics/top-posts', {
    responses: {
      '200': {
        description: 'Top posts by comment count',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: TopPostDto.schema,
            },
          },
        },
      },
    },
    description: 'Get top posts by comment count (all time)',
  })
  async getTopPosts() {
    return this.statisticsService.getTopPostsByComment(5);
  }

  @get('/admin/statistics/top-users', {
    responses: {
      '200': {
        description: 'Top users by post count',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {type: 'string'},
                  username: {type: 'string'},
                  email: {type: 'string'},
                  avatar: {type: 'string'},
                  postCount: {type: 'number'},
                },
              },
            },
          },
        },
      },
    },
    description: 'Get top users by post count (all time)',
  })
  async getTopUsers() {
    return this.statisticsService.getTopUsersByPostCount(5);
  }

  @get('/admin/statistics/user-daily', {
    responses: {
      '200': {
        description: 'User daily statistics for 7 days',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: UserDailyStatDto.schema,
            },
          },
        },
      },
    },
    description: 'Get user daily statistics for 7 days',
  })
  async getUserDailyStats() {
    return this.statisticsService.getUserDailyStats(7);
  }
}
