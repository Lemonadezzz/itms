import { redirect } from 'next/navigation';
import { landingPath } from '@/lib/access';

export default async function Home() {
  redirect(await landingPath());
}
