import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/dashboard');
  // The redirect function should be called before any JSX is returned.
  // For server components, returning null or an empty fragment is fine if redirect is called.
  return null;
}
