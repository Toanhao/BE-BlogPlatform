export type RateLimitScope = 'ip' | 'user-resource';

export interface RateLimitRule {
  scope: RateLimitScope;
  limit: number;
  windowSeconds: number;
}
