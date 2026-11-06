'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { MAX_UPLOAD_BYTES } from '@/lib/storage/limits';
import { BookMockup } from './book-mockup';
import { useI18n } from './i18n-provider';

type ImageFieldProps = {
  asBook?: boolean;
  name: string;
  label: string;
  currentUrl?: string | null;
  error?: string;
  removeLabel?: string;
};

export function ImageField({ asBook = false, name, label, currentUrl, error, removeLabel }: ImageFieldProps) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const id = `field-${name}`;
  const shownError = localError ?? error;

  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  const pick = (target: HTMLInputElement): void => {
    const file = target.files?.[0];
    setPreview(null);
    setLocalError(null);

    if (!file) {
      return;
    }

    if (file.size >= MAX_UPLOAD_BYTES) {
      target.value = '';
      setLocalError(t('Send an image under 5 MB.'));

      return;
    }

    setPreview(URL.createObjectURL(file));
  };

  const onDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    const file = [...event.dataTransfer.files].find((item) => item.type.startsWith('image/'));

    if (!file || !input.current) {
      return;
    }

    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.current.files = transfer.files;
    pick(input.current);
  };

  const shown = preview ?? currentUrl;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-display text-sm font-semibold">
        {label}
      </label>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-start gap-3 rounded-sm border-2 border-dashed p-4 ${dragging ? 'border-accent bg-paper' : 'border-rule'}`}>
        {shown && asBook ? (
          <span className="block w-36">
            <BookMockup title={label} coverUrl={shown} />
          </span>
        ) : null}
        {shown && !asBook ? (
          <img src={shown} alt="" className="max-h-48 w-fit rounded-sm border border-rule object-contain" />
        ) : null}
        <p className="text-sm text-ink-soft">{t('Drop an image here or choose a file.')}</p>
        <input
          ref={input}
          id={id}
          name={name}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(event) => pick(event.target)}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? `${id}-hint ${id}-error` : `${id}-hint`}
          className="text-sm file:mr-3 file:rounded-sm file:border file:border-rule file:bg-paper file:px-3 file:py-1.5 file:font-display"
        />
      </div>
      <p id={`${id}-hint`} className="text-xs text-ink-soft">
        {t('PNG, JPEG, WebP or GIF under 5 MB. It becomes WebP up to 1920×1080.')}
      </p>
      {shownError ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {shownError}
        </p>
      ) : null}
      {currentUrl && removeLabel ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name={name === 'cover' ? 'removeCover' : 'removeImage'} /> {removeLabel}
        </label>
      ) : null}
    </div>
  );
}
