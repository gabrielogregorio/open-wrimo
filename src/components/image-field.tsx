'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { MAX_UPLOAD_BYTES } from '@/lib/storage/limits';
import { BookMockup } from './book-mockup';
import { useI18n } from './i18n-provider';
import { previewOf } from './image-preview';

type ImageFieldProps = {
  asBook?: boolean;
  name: string;
  label: string;
  currentUrl?: string | null;
  error?: string;
  removeLabel?: string;
  /** The picture is cropped to a 512 px square on the server, as profile pictures are. */
  square?: boolean;
};

export function ImageField({
  asBook = false,
  name,
  label,
  currentUrl,
  error,
  removeLabel,
  square = false,
}: ImageFieldProps) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const id = `field-${name}`;
  const shownError = localError ?? error;

  // Only the latest pick may set the preview, in case an older one finishes drawing later.
  const latestPick = useRef(0);
  // The chosen file, kept apart from the input: React resets the form after a refused submit, which
  // empties the file input while the preview still shows the picture, and the next save went without it.
  const chosen = useRef<File | null>(null);

  useEffect(() => {
    const form = input.current?.form;

    if (!form) {
      return undefined;
    }

    const restore = (): void => {
      // The reset clears the input after this event, so the file goes back on the next tick.
      setTimeout(() => {
        if (chosen.current && input.current) {
          const transfer = new DataTransfer();
          transfer.items.add(chosen.current);
          input.current.files = transfer.files;
        }
      }, 0);
    };

    form.addEventListener('reset', restore);

    return () => form.removeEventListener('reset', restore);
  }, []);

  const pick = (target: HTMLInputElement): void => {
    const file = target.files?.[0];
    latestPick.current += 1;
    chosen.current = null;
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

    chosen.current = file;
    const pickNumber = latestPick.current;
    void previewOf(file).then((drawn) => {
      // A file the browser cannot draw just has no preview; the server says what is wrong with it.
      if (pickNumber === latestPick.current) {
        setPreview(drawn);
      }
    });
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
        {square
          ? t('PNG, JPEG, WebP or GIF under 5 MB. It becomes a 512×512 WebP square; GIFs stay animated.')
          : t('PNG, JPEG, WebP or GIF under 5 MB. It becomes WebP up to 1920×1080; GIFs stay animated.')}
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
