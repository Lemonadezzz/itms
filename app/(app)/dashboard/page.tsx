import { redirect } from 'next/navigation';
import { landingPath } from '@/lib/access';

export default async function DashboardRedirect() {
  redirect(await landingPath());
}
