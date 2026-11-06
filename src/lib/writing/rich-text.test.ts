import { sanitizeRichText } from './rich-text';

describe('sanitizeRichText', () => {
  it('keeps the formatting the editor makes', () => {
    const html =
      '<h2>Capítulo</h2><p><strong>Forte</strong>, <em>leve</em>, <u>sublinhado</u> e <s>riscado</s>.</p>' +
      '<ul><li>um</li></ul><ol><li>dois</li></ol><blockquote><p>citação</p></blockquote><hr><p><code>x</code></p>';

    expect(sanitizeRichText(html)).toBe(html.replace('<hr>', '<hr />'));
  });

  it('removes scripts, handlers and unknown tags', () => {
    expect(sanitizeRichText('<p onclick="steal()">oi<script>alert(1)</script></p><iframe src="x"></iframe>')).toBe(
      '<p>oi</p>',
    );
  });

  it('opens links in a new tab without leaking the page and drops unsafe ones', () => {
    expect(sanitizeRichText('<a href="https://example.com">site</a>')).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">site</a>',
    );
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).toBe(
      '<a target="_blank" rel="noopener noreferrer nofollow">x</a>',
    );
  });

  it('keeps only images stored by the app', () => {
    expect(sanitizeRichText('<img src="/media/inline/a-1.webp" alt="mapa">')).toBe(
      '<img src="/media/inline/a-1.webp" alt="mapa" />',
    );
    expect(sanitizeRichText('<img src="https://res.cloudinary.com/demo/image/upload/x.webp">')).toBe(
      '<img src="https://res.cloudinary.com/demo/image/upload/x.webp" />',
    );
    expect(sanitizeRichText('<p>a</p><img src="https://evil.example/track.png"><img>')).toBe('<p>a</p>');
  });

  it('trims what is left', () => {
    expect(sanitizeRichText('  <p>texto</p>  ')).toBe('<p>texto</p>');
  });
});
