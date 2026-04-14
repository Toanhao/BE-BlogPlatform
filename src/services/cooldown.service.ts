import {BindingScope, injectable, inject} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import {AppblogBindings} from '../keys';
import {RedisService} from './redis.service';

@injectable({scope: BindingScope.SINGLETON})
export class CooldownService {
  constructor(
    @inject(AppblogBindings.REDIS_SERVICE)
    private redisService: RedisService,
  ) {}

  async enforceCooldown(
    userId: string,
    action: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = `cooldown:user:${userId}:${action}`;
    const allowed = await this.redisService.setIfNotExistsWithExpiry(
      key,
      '1',
      ttlSeconds,
    );

    if (!allowed) {
      throw new HttpErrors.TooManyRequests('Bạn thao tác quá nhanh, vui lòng thử lại sau giây lát.');
    }
  }
}