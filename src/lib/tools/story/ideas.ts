import type { IdeaGenre, IdeaTrope } from './idea-types';
import { pickOne, pickOther, type Random } from './random';

export const IDEA_CHARACTERS = [
  'uma parteira que guarda os segredos da cidade',
  'um ex-padre que virou detetive particular',
  'uma menina de onze anos que fala com os mortos',
  'um caminhoneiro que nunca dorme',
  'uma cientista expulsa da universidade',
  'um velho pescador que perdeu o barco',
  'uma cantora de rádio esquecida',
  'um ladrão de livros raros',
  'uma enfermeira em seu último plantão',
  'um gêmeo que assumiu a vida do irmão',
  'uma prefeita que mente sobre o passado',
  'um menino que coleciona mapas falsos',
  'uma tatuadora que lê o futuro na pele',
  'um soldado que voltou dado como morto',
  'uma professora de piano surda',
  'um funcionário de cartório que altera certidões',
  'uma herdeira que não quer a herança',
  'um palhaço de circo falido',
  'uma vidente que nunca acerta',
  'um astronauta aposentado que mora no sertão',
  'uma garçonete que ouve tudo',
  'um coveiro apaixonado',
  'uma hacker de dezesseis anos',
  'um chef que perdeu o paladar',
  'uma freira com um passado no crime',
  'um taxista que sabe demais',
  'uma escritora com bloqueio há dez anos',
  'um índio guarani que guarda uma língua quase extinta',
  'uma bailarina que quebrou a perna na estreia',
  'um político honesto demais para o cargo',
  'uma avó que foi espiã na juventude',
  'um carteiro que lê as cartas antes de entregar',
  'uma médica-legista que conversa com os corpos',
  'um imigrante que esqueceu o próprio nome',
  'uma jogadora de futebol banida',
  'um relojoeiro que conserta o tempo',
  'uma faxineira que encontra um diário',
  'um policial corrupto tentando se redimir',
  'uma trapezista com medo de altura',
  'um feirante que vende mais do que frutas',
  'uma tradutora de uma língua que ninguém fala',
  'um robô doméstico que quer férias',
];

export const IDEA_PLACES = [
  'uma cidade do interior inundada por uma represa',
  'um farol abandonado no litoral sul',
  'um trem noturno entre São Paulo e o Rio',
  'uma fazenda de café em decadência',
  'um prédio do centro que perdeu o elevador',
  'uma ilha onde só se chega na maré baixa',
  'uma escola de samba na semana do desfile',
  'um hospital psiquiátrico desativado',
  'uma estação de pesquisa na Antártida',
  'um mercado municipal de madrugada',
  'um navio cargueiro preso no porto',
  'uma vila de pescadores sem sinal de celular',
  'um cinema de rua que vai ser demolido',
  'uma colônia em Marte',
  'um convento no alto da serra',
  'um shopping fechado durante uma tempestade',
  'uma cidade fantasma do ciclo da borracha',
  'um sebo com uma porta trancada nos fundos',
  'um quilombo escondido na mata',
  'uma pensão de estudantes em Ouro Preto',
  'um circo itinerante no sertão',
  'uma favela no alto do morro durante um apagão',
  'um cemitério no Dia de Finados',
  'um posto de gasolina na beira da BR',
  'um laboratório subterrâneo',
  'uma praia deserta fora de temporada',
  'um bairro japonês em São Paulo',
  'um casarão colonial com quartos que mudam',
  'uma usina nuclear desativada',
  'um bloco de carnaval que nunca para',
  'uma biblioteca que abre só à meia-noite',
  'um acampamento de garimpo na Amazônia',
  'uma estação de metrô fechada desde os anos 80',
  'um asilo à beira-mar',
  'um reino flutuante sobre nuvens',
  'uma cidade subaquática',
  'um hotel de beira de estrada com doze quartos',
  'uma rodoviária na véspera de Natal',
  'um vilarejo português nas montanhas',
  'uma redação de jornal na noite da eleição',
  'um mosteiro em ruínas',
  'um parque de diversões abandonado',
];

export const IDEA_CONFLICTS = [
  'precisa esconder um corpo até o amanhecer',
  'descobre que a própria família mentiu por décadas',
  'tem três dias para pagar uma dívida impossível',
  'recebe uma carta escrita por si mesmo no futuro',
  'precisa escolher entre o amor e a verdade',
  'é acusado de um crime que ainda não aconteceu',
  'perde a memória das últimas vinte e quatro horas',
  'herda uma casa com um inquilino que se recusa a sair',
  'precisa atravessar o país sem dinheiro',
  'descobre que é a última pessoa que lembra de alguém',
  'tem que proteger uma testemunha que odeia',
  'é chantageado por alguém que conhece seu segredo',
  'encontra uma mala com dinheiro e um bilhete',
  'precisa impedir um casamento',
  'tem uma doença que faz dizer só a verdade',
  'descobre um túnel que leva a outra época',
  'vê o melhor amigo se tornar o inimigo',
  'precisa vencer uma competição para salvar a casa',
  'é o único sobrevivente de um acidente estranho',
  'precisa devolver algo que roubou há vinte anos',
  'recebe a visita de um filho que não sabia que tinha',
  'está preso num lugar e o tempo não passa',
  'precisa convencer uma cidade inteira de um perigo',
  'descobre que foi trocado na maternidade',
  'tem uma semana para escrever uma confissão',
  'precisa mentir para salvar quem ama',
  'perdeu a única prova da própria inocência',
  'tem que cuidar de um animal que não é deste mundo',
  'é perseguido por alguém com o seu rosto',
  'precisa reunir uma banda antiga para um último show',
  'descobre que a cidade será apagada do mapa',
  'tem que trair seu mentor',
  'recebe um poder que cobra um preço a cada uso',
  'precisa encontrar um desaparecido antes da polícia',
  'deve cumprir uma promessa feita a um moribundo',
  'precisa sobreviver a uma noite com o pior inimigo',
  'descobre que tudo o que vive é um experimento',
  'tem que esconder uma gravidez num lugar sem segredos',
  'precisa recuperar um objeto sagrado roubado',
  'é obrigado a casar com um estranho',
  'precisa decidir quem sai vivo de um naufrágio',
  'tem que confessar algo antes que outro conte',
];

export type IdeaTropeTag = Pick<IdeaTrope, 'id' | 'name' | 'description'>;

/** Ideas saved before genres and tropes existed have only the three parts. */
export type Idea = {
  character: string;
  place: string;
  conflict: string;
  genre?: { id: string; name: string };
  tropes?: IdeaTropeTag[];
};

/** A freshly rolled idea always has its tropes. */
export type RolledIdea = Idea & { tropes: IdeaTropeTag[] };

export type IdeaPart = 'character' | 'place' | 'conflict' | 'tropes';
export type IdeaCatalog = { genres: readonly IdeaGenre[]; tropes: readonly IdeaTrope[] };
/** An empty genre id means any genre; wanted tropes always come in the idea. */
export type IdeaFilters = { genreId: string; tropeIds: readonly string[] };

const TROPES_PER_IDEA = 2;
// Most of a part comes from the genre, the rest from the general lists, so ideas cross over a bit.
const FROM_GENRE = 0.7;

const GENERAL: Record<Exclude<IdeaPart, 'tropes'>, readonly string[]> = {
  character: IDEA_CHARACTERS,
  place: IDEA_PLACES,
  conflict: IDEA_CONFLICTS,
};

const GENRE_LIST = { character: 'characters', place: 'places', conflict: 'conflicts' } as const;

const tag = ({ id, name, description }: IdeaTrope): IdeaTropeTag => ({ id, name, description });

export const tropesFor = (catalog: IdeaCatalog, genreId: string): IdeaTrope[] =>
  catalog.tropes.filter((trope) => trope.genres.length === 0 || trope.genres.includes(genreId));

const pickPart = (
  part: Exclude<IdeaPart, 'tropes'>,
  genre: IdeaGenre | undefined,
  current: string | undefined,
  random: Random,
): string => {
  const fromGenre = genre ? genre[GENRE_LIST[part]] : [];
  const list = fromGenre.length > 0 && random() < FROM_GENRE ? fromGenre : GENERAL[part];

  return pickOther(list, current, random);
};

const pickTropes = (
  catalog: IdeaCatalog,
  genre: IdeaGenre | undefined,
  filters: IdeaFilters,
  random: Random,
): IdeaTropeTag[] => {
  const wanted = catalog.tropes.filter((trope) => filters.tropeIds.includes(trope.id));
  const candidates = (genre ? tropesFor(catalog, genre.id) : [...catalog.tropes]).filter(
    (trope) => !filters.tropeIds.includes(trope.id),
  );
  const picked = [...wanted];

  while (picked.length < Math.max(TROPES_PER_IDEA, wanted.length) && candidates.length > 0) {
    picked.push(candidates.splice(Math.floor(random() * candidates.length), 1)[0]);
  }

  return picked.map(tag);
};

const genreOf = (catalog: IdeaCatalog, filters: IdeaFilters, random: Random): IdeaGenre | undefined =>
  catalog.genres.find((genre) => genre.id === filters.genreId) ??
  (catalog.genres.length > 0 ? pickOne(catalog.genres, random) : undefined);

export const rollIdea = (catalog: IdeaCatalog, filters: IdeaFilters, random: Random, current?: Idea): RolledIdea => {
  const genre = genreOf(catalog, filters, random);

  return {
    ...(genre ? { genre: { id: genre.id, name: genre.name } } : {}),
    tropes: pickTropes(catalog, genre, filters, random),
    character: pickPart('character', genre, current?.character, random),
    place: pickPart('place', genre, current?.place, random),
    conflict: pickPart('conflict', genre, current?.conflict, random),
  };
};

export const rerollPart = <Rolled extends Idea>(
  catalog: IdeaCatalog,
  idea: Rolled,
  part: IdeaPart,
  filters: IdeaFilters,
  random: Random,
): Rolled => {
  const genre = catalog.genres.find((item) => item.id === idea.genre?.id);

  if (part === 'tropes') {
    return { ...idea, tropes: pickTropes(catalog, genre, filters, random) };
  }

  return { ...idea, [part]: pickPart(part, genre, idea[part], random) };
};
