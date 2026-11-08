import type { Metadata } from 'next';
import { updateProfileAction } from '@/app/actions/writing';
import { ProfileForm } from '@/components/profile-form';
import { getTranslator } from '@/server/i18n';
import { requireWriter, writingContext } from '@/server/session';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();

  return { title: t('Edit profile') };
}

export default async function EditProfilePage() {
  const user = await requireWriter();
  const { writing, userId } = await writingContext();
  const profile = await writing.getProfile(userId);
  const t = await getTranslator();

  return (
    <div className="sheet mx-auto max-w-2xl rounded-sm p-8">
      <h1 className="mb-6 font-display text-3xl font-semibold">{t('Edit profile')}</h1>
      <ProfileForm action={updateProfileAction} profile={profile} name={user.name} username={user.username} />
    </div>
  );
}
