import sanitizeHtml from 'sanitize-html';

const SAFE_IMAGE = /^(\/media\/[\w/-]+\.webp|https:\/\/res\.cloudinary\.com\/[\w./-]+)$/;

export const sanitizeRichText = (html: string): string =>
  sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'h2',
      'h3',
      'ul',
      'ol',
      'li',
      'blockquote',
      'a',
      'img',
      'hr',
      'code',
    ],
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
    allowedSchemes: ['https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
    exclusiveFilter: (frame) => frame.tag === 'img' && !SAFE_IMAGE.test(frame.attribs.src ?? ''),
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer nofollow' }),
    },
  }).trim();

export const looksLikeHtml = (text: string): boolean => /^\s*<(p|h2|h3|ul|ol|blockquote|img)[\s>]/.test(text);
