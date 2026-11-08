import { inlineImageKey, inlineKeysIn, keyOwner, ownedKey, replaceImage } from './owners';

const OWNER = '0123456789abcdef01234567';

describe('image owners', () => {
  it('reads the owner from the folder of a key, on the local disk or on Cloudinary', () => {
    expect(keyOwner(`covers/${OWNER}/a.webp`)).toBe(OWNER);
    expect(keyOwner(`openwrimo/inline/${OWNER}/abc`)).toBe(OWNER);
    expect(keyOwner('covers/a.webp')).toBeNull();
    expect(keyOwner(`elsewhere/${OWNER}/a.webp`)).toBeNull();
  });

  it('places an old key inside its owner folder, once', () => {
    expect(ownedKey('covers/a.webp', OWNER)).toBe(`covers/${OWNER}/a.webp`);
    expect(ownedKey('openwrimo/inline/abc', OWNER)).toBe(`openwrimo/inline/${OWNER}/abc`);
    expect(ownedKey(`covers/${OWNER}/a.webp`, OWNER)).toBeNull();
    expect(ownedKey('elsewhere/a.webp', OWNER)).toBeNull();
  });
});

describe('inlineImageKey', () => {
  it('reads the key of an editor image on the local disk or on Cloudinary, with or without an owner', () => {
    expect(inlineImageKey('/media/inline/0b1c-2d.webp')).toBe('inline/0b1c-2d.webp');
    expect(inlineImageKey(`/media/inline/${OWNER}/0b1c.webp`)).toBe(`inline/${OWNER}/0b1c.webp`);
    expect(
      inlineImageKey('https://res.cloudinary.com/demo/image/upload/v1731000000/openwrimo/inline/abc123.webp'),
    ).toBe('openwrimo/inline/abc123');
    expect(inlineImageKey(`https://res.cloudinary.com/demo/image/upload/openwrimo/inline/${OWNER}/abc.webp`)).toBe(
      `openwrimo/inline/${OWNER}/abc`,
    );
  });

  it('ignores covers, avatars and anything that is not an editor upload', () => {
    expect(inlineImageKey('/media/covers/a.webp')).toBeNull();
    expect(inlineImageKey('https://res.cloudinary.com/demo/image/upload/v1/openwrimo/avatars/a.webp')).toBeNull();
    expect(inlineImageKey('https://example.com/media/inline/a.webp')).toBeNull();
    expect(inlineImageKey('/media/inline/../covers/a.webp')).toBeNull();
  });
});

describe('images in a text', () => {
  const text =
    '<p>a</p><img src="/media/inline/a.webp" alt=""><img alt="" src="/media/covers/c.webp"><img src="/media/inline/a.webp">';

  it('lists the editor images of a text', () => {
    expect(inlineKeysIn(text)).toEqual(['inline/a.webp', 'inline/a.webp']);
    expect(inlineKeysIn(undefined)).toEqual([]);
  });

  it('points every image of one key to its new address and leaves the rest alone', () => {
    expect(replaceImage(text, 'inline/a.webp', `/media/inline/${OWNER}/a.webp`)).toBe(
      `<p>a</p><img src="/media/inline/${OWNER}/a.webp" alt=""><img alt="" src="/media/covers/c.webp"><img src="/media/inline/${OWNER}/a.webp">`,
    );
  });
});
