import { CONTACT_EMAIL, CONTROLLER_NAME, TERMS_SECTIONS } from './terms-content';

const allText = TERMS_SECTIONS.flatMap((section) => [
  section.title,
  ...section.blocks.flatMap((block) => {
    if (block.kind === 'paragraph') {
      return [block.text];
    }

    return block.kind === 'table' ? [...block.head, ...block.rows.flat()] : [...block.items];
  }),
]).join('\n');

describe('terms text', () => {
  it('has unique section ids in order and names the controller and the contact', () => {
    expect(new Set(TERMS_SECTIONS.map((section) => section.id)).size).toBe(TERMS_SECTIONS.length);
    TERMS_SECTIONS.forEach((section, index) => expect(section.title.startsWith(`${index + 1}. `)).toBe(true));
    expect(allText).toContain(CONTROLLER_NAME);
    expect(allText).toContain(CONTACT_EMAIL);
  });

  it('covers what the law asks and never uses the em dash', () => {
    ['LGPD', 'Marco Civil', 'art. 33', 'ANPD', '13 anos', '180 dias', '6 meses'].forEach((term) =>
      expect(allText).toContain(term),
    );
    expect(allText).not.toContain('—');
  });

  it('keeps every table row as wide as its header', () => {
    TERMS_SECTIONS.flatMap((section) => section.blocks).forEach((block) => {
      if (block.kind === 'table') {
        block.rows.forEach((row) => expect(row).toHaveLength(block.head.length));
      }
    });
  });
});
