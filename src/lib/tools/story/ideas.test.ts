import type { IdeaGenre, IdeaTrope } from './idea-types';
import {
  IDEA_CHARACTERS,
  IDEA_CONFLICTS,
  IDEA_PLACES,
  rerollPart,
  rollIdea,
  tropesFor,
  type IdeaCatalog,
} from './ideas';

const romance: IdeaGenre = {
  id: 'romance',
  name: 'Romance',
  characters: ['uma florista ranzinza', 'um padeiro sorridente'],
  places: ['numa vila de praia'],
  conflicts: ['precisa fingir um noivado'],
};
const horror: IdeaGenre = { id: 'horror', name: 'Terror', characters: [], places: [], conflicts: [] };
const trope = (id: string, genres: string[]): IdeaTrope => ({ id, name: id, description: `${id}.`, genres });
const catalog: IdeaCatalog = {
  genres: [romance, horror],
  tropes: [
    trope('fake-dating', ['romance']),
    trope('haunted-house', ['horror']),
    trope('revenge', []),
    trope('slow-burn', ['romance']),
  ],
};
const any = { genreId: '', tropeIds: [] };
const sequence = (...values: number[]) => {
  let index = 0;

  return () => {
    const value = values[index % values.length];
    index += 1;

    return value;
  };
};

describe('idea lists', () => {
  it('keeps at least 40 general options in each list', () => {
    expect(IDEA_CHARACTERS.length).toBeGreaterThanOrEqual(40);
    expect(IDEA_PLACES.length).toBeGreaterThanOrEqual(40);
    expect(IDEA_CONFLICTS.length).toBeGreaterThanOrEqual(40);
  });

  it('finds the tropes that fit a genre, including the ones that fit any', () => {
    expect(tropesFor(catalog, 'horror').map((item) => item.id)).toEqual(['haunted-house', 'revenge']);
  });
});

describe('rollIdea', () => {
  it('rolls the chosen genre with two fitting tropes and parts mostly from the genre', () => {
    const idea = rollIdea(catalog, { genreId: 'romance', tropeIds: [] }, () => 0);

    expect(idea.genre).toEqual({ id: 'romance', name: 'Romance' });
    expect(idea.tropes?.map((item) => item.id)).toEqual(['fake-dating', 'revenge']);
    expect(idea.character).toBe('uma florista ranzinza');
    expect(idea.place).toBe('numa vila de praia');
    expect(idea.conflict).toBe('precisa fingir um noivado');
  });

  it('always brings the wanted tropes and draws a genre when any will do', () => {
    const idea = rollIdea(catalog, { genreId: '', tropeIds: ['haunted-house', 'revenge', 'slow-burn'] }, () => 0.99);

    expect(idea.genre?.id).toBe('horror');
    expect(idea.tropes?.map((item) => item.id)).toEqual(['haunted-house', 'revenge', 'slow-burn']);
    expect(IDEA_CHARACTERS).toContain(idea.character);
  });

  it('takes from the general lists when the genre has none, and works without any catalog', () => {
    const idea = rollIdea(catalog, { genreId: 'horror', tropeIds: [] }, () => 0);

    expect(idea.character).toBe(IDEA_CHARACTERS[0]);
    expect(rollIdea({ genres: [], tropes: [] }, any, () => 0)).toEqual({
      tropes: [],
      character: IDEA_CHARACTERS[0],
      place: IDEA_PLACES[0],
      conflict: IDEA_CONFLICTS[0],
    });
  });

  it('changes the parts when rolling again', () => {
    const first = rollIdea(catalog, { genreId: 'romance', tropeIds: [] }, () => 0);

    expect(rollIdea(catalog, { genreId: 'romance', tropeIds: [] }, sequence(0, 0, 0.5), first).character).not.toBe(
      first.character,
    );
  });
});

describe('rerollPart', () => {
  it('rerolls one part from the idea genre and keeps the rest', () => {
    const idea = rollIdea(catalog, { genreId: 'romance', tropeIds: [] }, () => 0);
    const again = rerollPart(catalog, idea, 'character', any, sequence(0, 0.99));

    expect(again.character).toBe('um padeiro sorridente');
    expect(again.place).toBe(idea.place);
  });

  it('rerolls the tropes keeping the wanted ones, and works for ideas saved without a genre', () => {
    const idea = rollIdea(catalog, { genreId: 'romance', tropeIds: [] }, () => 0);
    const tropes = rerollPart(catalog, idea, 'tropes', { genreId: '', tropeIds: ['slow-burn'] }, () => 0);
    const old = { character: IDEA_CHARACTERS[0], place: IDEA_PLACES[0], conflict: IDEA_CONFLICTS[0] };

    expect(tropes.tropes?.map((item) => item.id)).toEqual(['slow-burn', 'fake-dating']);
    expect(rerollPart(catalog, old, 'place', any, () => 0.99).place).toBe(IDEA_PLACES.at(-1));
  });
});
