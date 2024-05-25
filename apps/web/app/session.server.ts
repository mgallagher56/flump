import type { Session, TypedResponse } from '@remix-run/node';
import { createCookieSessionStorage, redirect } from '@remix-run/node';
import invariant from 'tiny-invariant';

invariant(process.env.SESSION_SECRET, 'SESSION_SECRET must be set');

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === 'production'
  }
});

const USER_SESSION_KEY = 'userId';

export async function getSession(request: Request): Promise<Session> {
  const cookie = request.headers.get('Cookie');
  return await sessionStorage.getSession(cookie);
}

export async function createUserSession({
  request,
  userId,
  remember,
  redirectTo
}: {
  request: Request;
  userId: string;
  remember: boolean;
  redirectTo: string;
}): Promise<TypedResponse> {
  const session = await getSession(request);
  session.set(USER_SESSION_KEY, userId);
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session, {
        maxAge: remember
          ? 60 * 60 * 24 * 7 // 7 days
          : undefined
      })
    }
  });
}

export async function logout(request: Request): Promise<TypedResponse> {
  const session = await getSession(request);
  return redirect('/', {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session)
    }
  });
}
