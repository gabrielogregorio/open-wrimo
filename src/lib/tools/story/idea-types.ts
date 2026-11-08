// Ideas are built from book genres and the tags readers search for (tropes). Everything here is
// Brazilian Portuguese data shown as is, not translation keys.
export type IdeaGenre = {
  id: string;
  name: string;
  characters: readonly string[];
  places: readonly string[];
  conflicts: readonly string[];
};

export type IdeaTrope = {
  id: string;
  name: string;
  /** One short sentence saying what the trope is. */
  description: string;
  /** Genre ids where the trope fits; an empty list means it fits any genre. */
  genres: readonly string[];
};
