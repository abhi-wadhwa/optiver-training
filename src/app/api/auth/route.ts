import { cookies } from 'next/headers';

const USERS: Record<string, string> = {
  abhi: 'abhi',
  joe: 'joe',
};

const COOKIE_NAME = 'optiver-user';

export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body;

  if (action === 'login') {
    const { username, password } = body;
    if (typeof username !== 'string' || typeof password !== 'string') {
      return Response.json({ error: 'Missing credentials' }, { status: 400 });
    }
    const expected = USERS[username.toLowerCase()];
    if (!expected || expected !== password) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, username.toLowerCase(), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 90,
    });
    return Response.json({ user: username.toLowerCase() });
  }

  if (action === 'logout') {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get(COOKIE_NAME);
  if (!userCookie?.value || !USERS[userCookie.value]) {
    return Response.json({ user: null });
  }
  return Response.json({ user: userCookie.value });
}
