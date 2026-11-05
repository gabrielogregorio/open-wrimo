import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signInAction } from '@/app/actions/auth';
import { AuthForm } from '@/components/auth-form';
import { safeRedirectPath } from '@/lib/auth/request';
import { getTranslator } from '@/server/i18n';
import { getCurrentUser } from '@/server/session';
import { AuthCard } from '../auth-card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Sign in') };
}

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  if (await getCurrentUser()) {
    redirect('/write');
  }

  const t = await getTranslator();
  const { next } = await searchParams;

  return (
    <AuthCard title={t('Welcome back')} subtitle={t('Sign in to open your shelf.')}>
      <AuthForm mode="sign-in" action={signInAction} next={safeRedirectPath(next)} />
    </AuthCard>
  );
}
