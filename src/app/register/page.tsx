import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signUpAction } from '@/app/actions/auth';
import { AuthForm } from '@/components/auth-form';
import { getTranslator } from '@/server/i18n';
import { getCurrentUser } from '@/server/session';
import { AuthCard } from '../auth-card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return {
    title: t('Create account'),
    description: t('Create your free account and start your novel with daily goals and word counts.'),
    alternates: { canonical: '/register' },
  };
}

export default async function RegisterPage() {
  if (await getCurrentUser()) {
    redirect('/write');
  }

  const t = await getTranslator();

  return (
    <AuthCard title={t('Start your notebook')} subtitle={t('A place that remembers every word you write.')}>
      <AuthForm mode="sign-up" action={signUpAction} />
    </AuthCard>
  );
}
