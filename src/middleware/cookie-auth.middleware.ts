import {Middleware, HttpErrors} from '@loopback/rest';
import {Provider} from '@loopback/core';

function getCookieValue(cookieHeader: string | undefined, cookieName: string) {
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(';').map(part => part.trim());
  const match = cookies.find(part => part.startsWith(`${cookieName}=`));
  if (!match) return undefined;

  return decodeURIComponent(match.slice(cookieName.length + 1));
}

export class CookieAuthMiddlewareProvider implements Provider<Middleware> {
  value(): Middleware {
    return async (middlewareCtx, next) => {
      if (!middlewareCtx.request.headers.authorization) {
        const token = getCookieValue(
          middlewareCtx.request.headers.cookie,
          'access_token',
        );

        if (token) {
          middlewareCtx.request.headers.authorization = `Bearer ${token}`;
        }
      }

      return next();
    };
  }
}
