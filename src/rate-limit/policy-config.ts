import {RateLimitRule} from './types';

export const RATE_LIMIT_POLICIES: Record<string, RateLimitRule> = {
  'auth.login': {scope: 'ip', limit: 5, windowSeconds: 60},
  'auth.register': {scope: 'ip', limit: 3, windowSeconds: 60},
  'post.create': {scope: 'user-resource', limit: 10, windowSeconds: 60},
  'post.read': {scope: 'ip', limit: 30, windowSeconds: 60},
  'comment.create': {scope: 'user-resource', limit: 10, windowSeconds: 60},
};
