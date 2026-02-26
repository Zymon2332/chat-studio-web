import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 公开路径（不需要登录）
const publicPaths = ['/login', '/api/auth/login', '/api/auth/register', '/api/auth/sendCode'];

// 检查路径是否为公开路径
function isPublicPath(path: string): boolean {
  return publicPaths.some(publicPath =>
    path === publicPath || path.startsWith(publicPath + '/')
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径直接放行
  if (isPublicPath(pathname)) {
    // 已登录用户访问 /login 时重定向到 /chat
    if (pathname === '/login') {
      const authToken = request.cookies.get('authToken')?.value;
      if (authToken) {
        return NextResponse.redirect(new URL('/chat', request.url));
      }
    }
    return NextResponse.next();
  }

  // API 路由检查认证（从 header 或 cookie）
  if (pathname.startsWith('/api/')) {
    const authToken = request.headers.get('Auth-Token') || request.cookies.get('authToken')?.value;

    if (!authToken) {
      return NextResponse.json(
        { code: 'UNAUTHORIZED', msg: '未登录或登录已过期', success: false },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 页面路由检查认证（从 cookie）
  const authToken = request.cookies.get('authToken')?.value;

  if (!authToken) {
    // 未登录，重定向到登录页并保存当前路径
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// 配置中间件匹配的路径
export const config = {
  matcher: [
    // 匹配所有路径除了静态文件
    '/((?!_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
};
