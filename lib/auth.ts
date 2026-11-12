import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/mongoose';
import { User } from '@/models/User';
import { Role } from '@/models/Role';
import { authConfig } from '@/lib/authConfig';
import { getRoleDefinition } from '@/lib/roles';
import { normalizePermissions } from '@/lib/permissions';

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: string; permissions: string[] } & DefaultSession['user'];
  }

  interface User {
    role?: string;
    permissions?: string[];
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    permissions?: string[];
  }
}

/** The Admin role stores its permission set in the database; the others are fixed. */
async function resolvePermissions(roleKey: string): Promise<string[]> {
  const definition = getRoleDefinition(roleKey);
  if (!definition.editable) return definition.permissions;

  const role = await Role.findOne({ key: roleKey }).lean();
  return normalizePermissions(role?.permissions ?? definition.permissions);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const user = await User.findOne({ email: credentials.email }).select('+password');
        if (!user) return null;
        if ((user.status ?? 'Active') !== 'Active') return null;

        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;

        const roleKey = user.roleKey ?? 'user';
        const permissions = await resolvePermissions(roleKey);

        await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: roleKey,
          permissions,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? 'user';
        token.permissions = user.permissions ?? getRoleDefinition(token.role).permissions;
        return token;
      }

      // Legacy sessions issued before roles existed: resolve once and cache on the token.
      if (token.id && !token.permissions) {
        await connectDB();
        const dbUser = await User.findById(token.id).lean();
        if (dbUser) {
          const roleKey = dbUser.roleKey ?? 'user';
          token.role = roleKey;
          token.permissions = await resolvePermissions(roleKey);
        } else {
          token.role = 'user';
          token.permissions = getRoleDefinition('user').permissions;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      if (token.role) session.user.role = token.role;
      if (token.permissions) session.user.permissions = token.permissions;
      return session;
    },
  },
});
