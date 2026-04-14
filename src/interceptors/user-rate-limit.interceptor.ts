import {inject, Provider, InvocationContext, Interceptor} from '@loopback/core';
import {HttpErrors, RestBindings} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {AppblogBindings} from '../keys';
import {RedisService} from '../services';

const USER_LIMIT = 20;
const RESOURCE_LIMIT = 10;
const WINDOW_SECONDS = 60;
const ACTION_BY_METHOD: Record<string, string> = {
  POST: 'create',
  GET: 'list',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

function buildResourceKey(method?: string, routePath?: string): string {
  const normalizedMethod = method?.toUpperCase() ?? 'GET';

  const resource = `/{routerPath}`;
  const action = ACTION_BY_METHOD[normalizedMethod] ?? 'access';

  return `${normalizedMethod}:${resource}:${action}`;
}

export class UserRateLimitInterceptorProvider implements Provider<Interceptor> {
  constructor(
    @inject(AppblogBindings.REDIS_SERVICE)
    private redisService: RedisService,
  ) {}

  value(): Interceptor {
    // invocationContext = “toàn bộ context của request đang chạy”
    return async (invocationCtx: InvocationContext, next) => {
      const currentUser = await invocationCtx.get<UserProfile>(
        SecurityBindings.USER,
        {optional: true}, // Nếu không có user nào được xác thực, trả về null thay vì ném lỗi
      );

      if (!currentUser) {
        return next();
      }

      const userId = String(currentUser[securityId] ?? '');
      if (!userId) {
        return next();
      }

      const route = await invocationCtx.get<{path?: string; verb?: string}>(
        RestBindings.Operation.ROUTE,
        {optional: true},
      );

      if (!route?.path || !route?.verb) {
        return next();
      }

      const globalKey = `rate_limit:user:${userId}`;
      const resourceScope = buildResourceKey(route.verb, route?.path);
      const resourceKey = `rate_limit:user:${userId}:resource:${resourceScope}`;

      const [globalCount, resourceCount] = await Promise.all([
        this.redisService.incrementWithExpiry(globalKey, WINDOW_SECONDS),
        this.redisService.incrementWithExpiry(resourceKey, WINDOW_SECONDS),
      ]);

      if (globalCount > USER_LIMIT) {
        throw new HttpErrors.TooManyRequests(
          'Người dùng này có quá nhiều yêu cầu, vui lòng thử lại sau giây lát.',
        );
      }

      if (resourceCount > RESOURCE_LIMIT) {
        throw new HttpErrors.TooManyRequests(
          'Người dùng này có quá nhiều yêu cầu cho tài nguyên này, vui lòng thử lại sau giây lát.',
        );
      }

      return next();
    };
  }
}
