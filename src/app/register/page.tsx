import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signUpAction } from '@/app/actions/auth';
import { AuthForm } from '@/components/auth-form';
import { getTranslator } from '@/server/i18n';
import { getCurrentUser } from '@/server/session';
import { AuthCard } from '../auth-card';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Create account') };
}

export default async function RegisterPage() {
  if (await getCurrentUser()) {
    redirect('/shelf');
  }

  const t = await getTranslator();

  return (
    <AuthCard title={t('Get a library card')} subtitle={t('Start a shelf that remembers every page.')}>
      <AuthForm mode="sign-up" action={signUpAction} />
    </AuthCard>
  );
}
