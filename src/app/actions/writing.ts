'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { PROFILE_SECTIONS, type ProfileSection } from '@/lib/db/collections';
import { formValues, type FormState } from '@/lib/form';
import { ENTRY_FIELDS, GOAL_FIELDS, POST_FIELDS, PROFILE_FIELDS, PROJECT_FIELDS } from '@/lib/writing/schema';
import {
  logProgress,
  removePost,
  removeProject,
  saveCover,
  saveGoal,
  saveProfile,
  savePost,
  saveProject,
  setPersonalBadges,
} from '@/lib/writing/service';
import { writingContext } from '@/server/session';

const imageFrom = async (formData: FormData, field: string): Promise<Uint8Array | null> => {
  const file = formData.get(field);

  return file instanceof File && file.size > 0 ? new Uint8Array(await file.arrayBuffer()) : null;
};

const novelPath = (projectId: string, tab?: string): string =>
  tab ? `/write/novels/${projectId}?tab=${tab}` : `/write/novels/${projectId}`;

export async function createNovelAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const context = await writingContext();
  const values = formValues(formData, PROJECT_FIELDS);
  const result = await saveProject(context, values);

  if (!result.id) {
    return { ...result, values };
  }

  const cover = await imageFrom(formData, 'cover');
  const coverResult = cover ? await saveCover(context, result.id, cover) : {};

  redirect(coverResult.fieldErrors ? `/write/novels/${result.id}/edit?cover=refused` : novelPath(result.id));
}

export async function updateNovelAction(
  projectId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await writingContext();
  const values = formValues(formData, PROJECT_FIELDS);
  const result = await saveProject(context, values, projectId);

  if (!result.id) {
    return { ...result, values };
  }

  const cover = await imageFrom(formData, 'cover');

  if (cover || formData.get('removeCover') === 'on') {
    const coverResult = await saveCover(context, projectId, cover);

    if (!coverResult.saved) {
      return { ...coverResult, values };
    }
  }

  revalidatePath(novelPath(projectId));
  redirect(novelPath(projectId));
}

export async function deleteNovelAction(projectId: string): Promise<void> {
  await removeProject(await writingContext(), projectId);
  redirect('/write');
}

export async function saveGoalAction(
  projectId: string,
  goalId: string | undefined,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData, GOAL_FIELDS);
  const result = await saveGoal(await writingContext(), projectId, values, goalId);

  if (!result.id) {
    return { ...result, values };
  }

  redirect(novelPath(projectId, 'goals'));
}

export async function deleteGoalAction(projectId: string, goalId: string): Promise<void> {
  const { writing, userId } = await writingContext();
  await writing.removeGoal(userId, goalId);
  redirect(novelPath(projectId, 'goals'));
}

const recordProgress = async (formData: FormData, source: 'update' | 'sprint'): Promise<FormState> => {
  const values = formValues(formData, ['goal', ...ENTRY_FIELDS]);
  const result = await logProgress(await writingContext(), values.goal, values, source);
  revalidatePath('/write', 'layout');

  return result.saved ? { saved: true, values: { goal: values.goal, date: values.date } } : { ...result, values };
};

export async function logProgressAction(_previous: FormState, formData: FormData): Promise<FormState> {
  return recordProgress(formData, 'update');
}

export async function logSprintAction(_previous: FormState, formData: FormData): Promise<FormState> {
  return recordProgress(formData, 'sprint');
}

export async function removeEntryAction(entryId: string): Promise<void> {
  const { writing, userId } = await writingContext();
  await writing.removeEntry(userId, entryId);
  revalidatePath('/write', 'layout');
}

export async function setPersonalBadgesAction(
  projectId: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const ids = formData.getAll('badge').filter((value): value is string => typeof value === 'string');
  const result = await setPersonalBadges(await writingContext(), projectId, ids);
  revalidatePath(novelPath(projectId));

  return result;
}

export async function savePostAction(
  projectId: string,
  postId: string | undefined,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData, POST_FIELDS);
  const result = await savePost(await writingContext(), projectId, values, {
    image: await imageFrom(formData, 'image'),
    removeImage: formData.get('removeImage') === 'on',
    postId,
  });

  if (!result.id) {
    return { ...result, values };
  }

  revalidatePath('/write/posts');
  redirect(novelPath(projectId, 'posts'));
}

export async function deletePostAction(projectId: string, postId: string): Promise<void> {
  await removePost(await writingContext(), postId);
  revalidatePath('/write/posts');
  redirect(novelPath(projectId, 'posts'));
}

export async function updateProfileAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, PROFILE_FIELDS);
  const shownSections = new Set(formData.getAll('show'));
  const result = await saveProfile(
    await writingContext(),
    values,
    { bytes: await imageFrom(formData, 'avatar'), remove: formData.get('removeImage') === 'on' },
    Object.fromEntries(PROFILE_SECTIONS.map((section) => [section, shownSections.has(section)])) as Record<
      ProfileSection,
      boolean
    >,
  );

  if (!result.saved) {
    return { ...result, values };
  }

  revalidatePath('/', 'layout');
  redirect('/write/profile');
}
