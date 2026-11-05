'use client';

import Image from '@tiptap/extension-image';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useRef, useState } from 'react';
import { MAX_UPLOAD_BYTES } from '@/lib/storage/limits';
import { useI18n } from './i18n-provider';

type RichTextEditorProps = { name: string; label: string; defaultValue: string; error?: string };

const toHtml = (value: string): string =>
  /^\s*</.test(value)
    ? value
    : value
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((paragraph) => `<p>${paragraph.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`)
        .join('');

const uploadImage = async (file: File): Promise<string> => {
  const body = new FormData();
  body.set('image', file);
  const response = await fetch('/api/images', { method: 'POST', body });
  const result = (await response.json()) as { url?: string; error?: string };

  if (!response.ok || !result.url) {
    throw new Error(result.error ?? 'Upload failed');
  }

  return result.url;
};

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`min-w-8 rounded-sm px-2 py-1 text-sm ${active ? 'bg-accent text-accent-ink' : 'hover:bg-paper-deep'}`}>
      {children}
    </button>
  );
}

function Toolbar({ editor, onPickImage, busy }: { editor: Editor; onPickImage: () => void; busy: boolean }) {
  const { t } = useI18n();
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current.isActive('bold'),
      italic: current.isActive('italic'),
      underline: current.isActive('underline'),
      strike: current.isActive('strike'),
      h2: current.isActive('heading', { level: 2 }),
      h3: current.isActive('heading', { level: 3 }),
      bullet: current.isActive('bulletList'),
      ordered: current.isActive('orderedList'),
      quote: current.isActive('blockquote'),
      link: current.isActive('link'),
    }),
  });
  const chain = () => editor.chain().focus();

  const toggleLink = (): void => {
    if (state.link) {
      chain().unsetLink().run();

      return;
    }

    const href = window.prompt(t('Link address (https://)'), 'https://');

    if (href && /^https:\/\//.test(href)) {
      chain().extendMarkRange('link').setLink({ href }).run();
    }
  };

  return (
    <div role="toolbar" aria-label={t('Formatting')} className="flex flex-wrap gap-1 border-b border-rule bg-paper p-1">
      <ToolbarButton label={t('Bold')} active={state.bold} onClick={() => chain().toggleBold().run()}>
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton label={t('Italic')} active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton label={t('Underline')} active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <u>U</u>
      </ToolbarButton>
      <ToolbarButton label={t('Strikethrough')} active={state.strike} onClick={() => chain().toggleStrike().run()}>
        <s>S</s>
      </ToolbarButton>
      <ToolbarButton label={t('Heading')} active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>
        H2
      </ToolbarButton>
      <ToolbarButton
        label={t('Subheading')}
        active={state.h3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}>
        H3
      </ToolbarButton>
      <ToolbarButton label={t('Bulleted list')} active={state.bullet} onClick={() => chain().toggleBulletList().run()}>
        •
      </ToolbarButton>
      <ToolbarButton
        label={t('Numbered list')}
        active={state.ordered}
        onClick={() => chain().toggleOrderedList().run()}>
        1.
      </ToolbarButton>
      <ToolbarButton label={t('Quote')} active={state.quote} onClick={() => chain().toggleBlockquote().run()}>
        “
      </ToolbarButton>
      <ToolbarButton label={t('Link')} active={state.link} onClick={toggleLink}>
        🔗
      </ToolbarButton>
      <ToolbarButton label={t('Divider')} onClick={() => chain().setHorizontalRule().run()}>
        —
      </ToolbarButton>
      <ToolbarButton label={t('Insert image')} onClick={onPickImage}>
        {busy ? '…' : '🖼'}
      </ToolbarButton>
      <ToolbarButton label={t('Undo')} onClick={() => chain().undo().run()}>
        ↶
      </ToolbarButton>
      <ToolbarButton label={t('Redo')} onClick={() => chain().redo().run()}>
        ↷
      </ToolbarButton>
    </div>
  );
}

export function RichTextEditor({ name, label, defaultValue, error }: RichTextEditorProps) {
  const { t } = useI18n();
  const [html, setHtml] = useState(() => toHtml(defaultValue));
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const id = `field-${name}`;
  const shownError = uploadError ?? error;

  const insertFiles = async (files: File[], position?: number): Promise<void> => {
    const images = files.filter((file) => file.type.startsWith('image/'));
    const current = editorRef.current;

    if (images.length === 0 || !current) {
      return;
    }

    setUploadError(null);
    setBusy(true);

    for (const file of images) {
      if (file.size >= MAX_UPLOAD_BYTES) {
        setUploadError(t('Send an image under 5 MB.'));
        continue;
      }

      try {
        const src = await uploadImage(file);
        const node = current.schema.nodes.image.create({ src, alt: '' });
        const at = position ?? current.state.selection.to;
        current.view.dispatch(current.state.tr.insert(Math.min(at, current.state.doc.content.size), node));
      } catch (problem) {
        setUploadError((problem as Error).message);
      }
    }

    setBusy(false);
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }),
      Image.configure({ inline: false }),
    ],
    content: html,
    editorProps: {
      attributes: { id, 'aria-labelledby': `${id}-label`, class: 'rich-text min-h-48 p-3 outline-none' },
      handleDrop: (view, event, _slice, moved) => {
        const files = [...(event.dataTransfer?.files ?? [])];

        if (moved || files.length === 0) {
          return false;
        }

        event.preventDefault();
        const position = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertFiles(files, position);

        return true;
      },
      handlePaste: (_view, event) => {
        const files = [...(event.clipboardData?.files ?? [])];

        if (files.length === 0) {
          return false;
        }

        void insertFiles(files);

        return true;
      },
    },
    onCreate: ({ editor: created }) => {
      editorRef.current = created;
    },
    onUpdate: ({ editor: updated }) => setHtml(updated.isEmpty ? '' : updated.getHTML()),
  });

  return (
    <div className="flex flex-col gap-1">
      <span id={`${id}-label`} className="font-display text-sm font-semibold">
        {label}
      </span>
      <input type="hidden" name={name} value={html} />
      <div
        className={`overflow-hidden rounded-sm border bg-paper ${shownError ? 'border-danger' : 'border-rule'} focus-within:border-accent`}>
        {editor ? <Toolbar editor={editor} busy={busy} onPickImage={() => fileInput.current?.click()} /> : null}
        <EditorContent editor={editor} />
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void insertFiles([...(event.target.files ?? [])]);
          event.target.value = '';
        }}
      />
      <p className="text-xs text-ink-soft">{t('Drag images into the text or use the image button.')}</p>
      {shownError ? <p className="text-sm text-danger">{shownError}</p> : null}
    </div>
  );
}
