import { z } from 'zod';
import { fieldErrorsFrom, formValues } from './form';

describe('formValues', () => {
  it('reads text fields and turns files or gaps into empty text', () => {
    const formData = new FormData();
    formData.set('title', 'Iracema');
    formData.set('cover', new Blob(['image']));

    expect(formValues(formData, ['title', 'cover', 'author'])).toEqual({ title: 'Iracema', cover: '', author: '' });
  });
});

describe('fieldErrorsFrom', () => {
  const schema = z.object({
    title: z.string().min(2, { error: 'Too short.' }).regex(/^\d+$/, { error: 'Digits only.' }),
  });

  it('keeps only the first message of each field', () => {
    const result = schema.safeParse({ title: 'a' });

    expect(fieldErrorsFrom(result.error!)).toEqual({ title: 'Too short.' });
  });

  it('names an issue without a field "form"', () => {
    const result = z.string({ error: 'Not text.' }).safeParse(1);

    expect(fieldErrorsFrom(result.error!)).toEqual({ form: 'Not text.' });
  });
});
