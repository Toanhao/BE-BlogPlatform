import {
  MetadataAccessor,
  MethodDecoratorFactory,
} from '@loopback/core';

export const RATE_LIMIT_METADATA_ACCESSOR =
  MetadataAccessor.create<string, MethodDecorator>(
    'appblog.rate-limit.metadata',
  );

export function rateLimit(policy: string): MethodDecorator {
  return MethodDecoratorFactory.createDecorator<string>(
    RATE_LIMIT_METADATA_ACCESSOR,
    policy,
    {
      decoratorName: '@rateLimit',
    },
  );
}
