import {inject, InvocationContext, Interceptor, Provider} from '@loopback/core';
import {MetadataInspector} from '@loopback/metadata';
import {HttpErrors, Request, RestBindings} from '@loopback/rest';
import {SecurityBindings, UserProfile, securityId} from '@loopback/security';
import {AppblogBindings} from '../keys';
import {
  RATE_LIMIT_POLICIES,
  RATE_LIMIT_METADATA_ACCESSOR,
  RateLimitRule,
} from '../rate-limit';
import {RedisService} from '../services';

function getClientIp(request?: Request): string {
  const forwardedFor = request?.headers['x-forwarded-for'];
  const forwardedIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === 'string'
      ? forwardedFor.split(',')[0]?.trim()
      : undefined;

  return forwardedIp || request?.ip || 'unknown';
}

export class RateLimitInterceptorProvider implements Provider<Interceptor> {
  constructor(
    @inject(AppblogBindings.REDIS_SERVICE)
    private redisService: RedisService,
  ) {}

  value(): Interceptor {
    return async (invocationCtx: InvocationContext, next) => {
      const metadata = MetadataInspector.getMethodMetadata(
        RATE_LIMIT_METADATA_ACCESSOR,
        invocationCtx.target,
        invocationCtx.methodName,
      );

      const policyName = metadata;
      if (!policyName) {
        return next();
      }

      const [request, currentUser] = await Promise.all([
        invocationCtx.get<Request>(RestBindings.Http.REQUEST, {optional: true}),
        invocationCtx.get<UserProfile>(SecurityBindings.USER, {optional: true}),
      ]);

      const userId = String(currentUser?.[securityId] ?? '');
      const ip = getClientIp(request);

      const policy = RATE_LIMIT_POLICIES[policyName];
      if (!policy) {
        throw new HttpErrors.InternalServerError(
          `Bạn chưa khai báo chính sách: ${policyName}`,
        );
      }

      const count = await this.applyRule(policyName, policy, {
        userId: userId || undefined,
        ip,
      });

      if (count !== undefined && count > policy.limit) {
        throw new HttpErrors.TooManyRequests(
          `Bạn thao tác quá nhiều cho chức năng ${policyName}.`,
        );
      }

      return next();
    };
  }

  private async applyRule(
    policyName: string,
    rule: RateLimitRule,
    identity: {userId?: string; ip: string},
  ): Promise<number> {
    const key = this.buildCounterKey(policyName, rule, identity);
    return this.redisService.incrementWithExpiry(key, rule.windowSeconds);
  }

  private buildCounterKey(
    policyName: string,
    rule: RateLimitRule,
    identity: {userId?: string; ip: string},
  ): string {
    const base = [
      'ratelimit',
      `policy:${policyName}`,
      `scope:${rule.scope}`,
      `window:${rule.windowSeconds}`,
    ];

    switch (rule.scope) {
      case 'ip':
        return [...base, `ip:${identity.ip}`].join(':');
      case 'user-resource':
        if (!identity.userId) {
          throw new HttpErrors.Unauthorized(
            `Bạn cần đăng nhập để sử dụng chức năng ${policyName}.`,
          );
        }
        return [...base, `user:${identity.userId}`].join(':');
      default:
        throw new HttpErrors.InternalServerError(
          `Unsupported rate limit scope ${String(rule.scope)} for policy ${policyName}.`,
        );
    }
  }
}
