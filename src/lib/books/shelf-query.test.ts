import { parseShelfQuery, shelfHref } from './shelf-query';

describe('parseShelfQuery', () => {
  it('reads a status and a page', () => {
    expect(parseShelfQuery({ status: 'reading', page: '3' })).toEqual({ status: 'reading', page: 3 });
  });

  it('takes the first value when a key repeats', () => {
    expect(parseShelfQuery({ status: ['finished', 'want'], page: ['2', '9'] })).toEqual({
      status: 'finished',
      page: 2,
    });
  });

  it.each([
    [{}, { status: undefined, page: 1 }],
    [
      { status: 'lost', page: '0' },
      { status: undefined, page: 1 },
    ],
    [{ page: 'abc' }, { status: undefined, page: 1 }],
    [{ page: '1001' }, { status: undefined, page: 1 }],
    [{ page: '1000' }, { status: undefined, page: 1000 }],
  ])('falls back for %j', (params, expected) => {
    expect(parseShelfQuery(params)).toEqual(expected);
  });
});

describe('shelfHref', () => {
  it.each([
    [{ page: 1 }, '/shelf'],
    [{ status: 'want' as const, page: 1 }, '/shelf?status=want'],
    [{ status: 'reading' as const, page: 2 }, '/shelf?status=reading&page=2'],
    [{ page: 4 }, '/shelf?page=4'],
  ])('builds the link for %j', (query, href) => {
    expect(shelfHref(query)).toBe(href);
  });
});
