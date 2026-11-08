import type { ReactNode } from 'react';
import { TERMS_DATE_LABEL } from '@/lib/legal/terms';
import { TERMS_SECTIONS, type TermsBlock } from '@/lib/legal/terms-content';

const TRAILING = new Set(['.', ',', ';', ':', ')']);

const isLink = (word: string): boolean => word.startsWith('https://') || (word.includes('@') && word.includes('.'));

// Turns the e-mails and https addresses inside a sentence into links, word by word.
export const withLinks = (text: string): ReactNode[] =>
  text.split(' ').flatMap((word, index) => {
    let end = word.length;

    while (end > 0 && TRAILING.has(word[end - 1])) {
      end -= 1;
    }

    const core = word.slice(0, end);
    const separator = index > 0 ? ' ' : '';

    if (!isLink(core)) {
      return [`${separator}${word}`];
    }

    return [
      separator,
      <a
        key={`${core}-${index}`}
        href={core.includes('@') ? `mailto:${core}` : core}
        className="text-accent underline underline-offset-4 break-words">
        {core}
      </a>,
      word.slice(end),
    ];
  });

function Block({ block }: { block: TermsBlock }) {
  if (block.kind === 'paragraph') {
    return <p>{withLinks(block.text)}</p>;
  }

  if (block.kind === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead>
            <tr>
              {block.head.map((cell) => (
                <th key={cell} scope="col" className="border-b border-rule p-2 font-display font-semibold">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row[0]} className="align-top">
                {row.map((cell) => (
                  <td key={cell} className="border-b border-rule p-2">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const ListTag = block.kind === 'steps' ? 'ol' : 'ul';

  return (
    <ListTag className={`flex flex-col gap-1 pl-6 ${block.kind === 'steps' ? 'list-decimal' : 'list-disc'}`}>
      {block.items.map((item) => (
        <li key={item}>{withLinks(item)}</li>
      ))}
    </ListTag>
  );
}

export function TermsDocument() {
  return (
    <article className="sheet flex flex-col gap-8 rounded-sm p-5 leading-relaxed sm:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Termos de Uso e Política de Privacidade</h1>
        <p className="text-ink-soft">Versão de {TERMS_DATE_LABEL}</p>
      </header>
      <nav aria-label="Sumário dos termos" className="text-sm">
        <ol className="grid gap-1 sm:grid-cols-2">
          {TERMS_SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="underline underline-offset-4">
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {TERMS_SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-title`}
          className="flex flex-col gap-3">
          <h2 id={`${section.id}-title`} className="font-display text-xl font-semibold">
            {section.title}
          </h2>
          {section.blocks.map((block, index) => (
            <Block key={`${section.id}-${index}`} block={block} />
          ))}
        </section>
      ))}
    </article>
  );
}
