import { withAuth } from 'next-auth/middleware';

// In Next.js 16, the middleware file is named proxy.ts and export named proxy
export const proxy = withAuth({
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

// Protect all /admin routes except /admin/login
export const config = {
  matcher: ['/admin/((?!login$|login/).*)'],
};
