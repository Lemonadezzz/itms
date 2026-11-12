'use client';

import { useSession } from 'next-auth/react';

/**
 * Client-side permission check for hiding controls. Server actions still enforce
 * permissions, so this is a UX layer only.
 */
export function useCan() {
  const { data: session } = useSession();
  const permissions = session?.user?.permissions;

  return (key: string) => (permissions ? permissions.includes(key) : true);
}
