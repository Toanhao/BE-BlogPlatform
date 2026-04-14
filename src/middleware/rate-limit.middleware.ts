import {inject, Provider} from '@loopback/core';
import {HttpErrors, Middleware} from '@loopback/rest';
import {AppblogBindings} from '../keys';
import {RedisService} from '../services';

const IP_LIMIT = 100;
const WINDOW_SECONDS = 60;

function getClientIp(request: {ip?: string; headers?: Record<string, unknown>}) {
  const forwardedFor = request.headers?.['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]?.trim()
      : undefined;

  return forwardedIp || request.ip || 'Không xác định';
}

export class RateLimitMiddlewareProvider implements Provider<Middleware> {
  constructor(
    @inject(AppblogBindings.REDIS_SERVICE)
    private redisService: RedisService,
  ) {}

  value(): Middleware {
    return async (middlewareCtx, next) => {
      const ip = getClientIp(middlewareCtx.request);
      const key = `rate_limit:ip:${ip}`;
      const count = await this.redisService.incrementWithExpiry(
        key,
        WINDOW_SECONDS,
      );

      if (count > IP_LIMIT) {
        throw new HttpErrors.TooManyRequests('Quá nhiều yêu cầu từ địa chỉ IP này');
      }

      return next();
    };
  }
}