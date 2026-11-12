import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  providers: [], // populated in lib/auth.ts with Credentials (Node.js only)
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname.startsWith('/login');
      if (isLoginPage) return isLoggedIn ? Response.redirect(new URL('/assets-overview', nextUrl)) : true;
      return isLoggedIn;
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
};
