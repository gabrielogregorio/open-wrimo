import { pickOne, type Random } from './random';

export const NAME_ERAS = ['colonial', 'imperial', 'early-1900s', 'midcentury', 'contemporary', 'fantasy'] as const;
export const NAME_REGIONS = ['brazil', 'portugal', 'anglophone', 'hispanic', 'italian', 'japanese', 'fantasy'] as const;
export const NAME_GENDERS = ['female', 'male', 'any'] as const;

export type NameEra = (typeof NAME_ERAS)[number];
export type NameRegion = (typeof NAME_REGIONS)[number];
export type NameGender = (typeof NAME_GENDERS)[number];

type GivenNames = { female: readonly string[]; male: readonly string[] };
type Period = 'old' | 'mid' | 'modern';
type RealEra = Exclude<NameEra, 'fantasy'>;
type RealRegion = Exclude<NameRegion, 'fantasy' | 'brazil'>;

// Brazil has one list per era; the other regions share one list for the older eras.
const BRAZIL: Record<RealEra, GivenNames> = {
  colonial: {
    female: [
      'Maria',
      'Ana',
      'Joana',
      'Isabel',
      'Catarina',
      'Inês',
      'Brites',
      'Leonor',
      'Francisca',
      'Antônia',
      'Úrsula',
      'Felipa',
    ],
    male: [
      'João',
      'Manuel',
      'Antônio',
      'Francisco',
      'Domingos',
      'Bento',
      'Gaspar',
      'Baltasar',
      'Inácio',
      'Jerônimo',
      'Sebastião',
      'Pedro',
    ],
  },
  imperial: {
    female: [
      'Leopoldina',
      'Carlota',
      'Amélia',
      'Teresa',
      'Mariana',
      'Escolástica',
      'Bernardina',
      'Rita',
      'Joaquina',
      'Gertrudes',
      'Henriqueta',
      'Eulália',
    ],
    male: [
      'Joaquim',
      'Pedro',
      'Bernardo',
      'Luís',
      'Cândido',
      'Honório',
      'Firmino',
      'Teodoro',
      'Feliciano',
      'Venâncio',
      'Custódio',
      'Fabrício',
    ],
  },
  'early-1900s': {
    female: [
      'Benedita',
      'Conceição',
      'Aurora',
      'Dulce',
      'Zulmira',
      'Iracema',
      'Olga',
      'Odete',
      'Jandira',
      'Nair',
      'Cecília',
      'Laura',
    ],
    male: [
      'Sebastião',
      'Benedito',
      'Raimundo',
      'Oswaldo',
      'Alcides',
      'Aristides',
      'Geraldo',
      'Olavo',
      'Jovino',
      'Waldemar',
      'Euclides',
      'Afonso',
    ],
  },
  midcentury: {
    female: [
      'Sônia',
      'Regina',
      'Vera',
      'Marlene',
      'Rosângela',
      'Lúcia',
      'Neide',
      'Célia',
      'Sandra',
      'Cleide',
      'Elisabete',
      'Márcia',
    ],
    male: [
      'José Carlos',
      'Paulo',
      'Sérgio',
      'Roberto',
      'Carlos Alberto',
      'Antônio Carlos',
      'Edson',
      'Wilson',
      'Nelson',
      'Valdir',
      'Gilberto',
      'Reginaldo',
    ],
  },
  contemporary: {
    female: [
      'Helena',
      'Alice',
      'Laura',
      'Valentina',
      'Heloísa',
      'Manuela',
      'Sophia',
      'Lívia',
      'Cecília',
      'Maitê',
      'Ágatha',
      'Isadora',
    ],
    male: [
      'Miguel',
      'Arthur',
      'Gael',
      'Theo',
      'Heitor',
      'Davi',
      'Ravi',
      'Bernardo',
      'Benício',
      'Gabriel',
      'Enzo',
      'Samuel',
    ],
  },
};

const REGIONS: Record<RealRegion, Record<Period, GivenNames>> = {
  portugal: {
    old: {
      female: ['Maria', 'Leonor', 'Beatriz', 'Isabel', 'Filipa', 'Guiomar', 'Violante', 'Constança', 'Branca', 'Mécia'],
      male: ['Afonso', 'Duarte', 'Nuno', 'Gonçalo', 'Vasco', 'Álvaro', 'Fernão', 'Martim', 'Rodrigo', 'Lourenço'],
    },
    mid: {
      female: ['Maria José', 'Fernanda', 'Graça', 'Fátima', 'Rosa', 'Ilda', 'Lurdes', 'Glória', 'Manuela', 'Amália'],
      male: ['Joaquim', 'Manuel', 'Fernando', 'Jorge', 'Mário', 'Armando', 'Rui', 'Vítor', 'Abílio', 'Amadeu'],
    },
    modern: {
      female: [
        'Matilde',
        'Leonor',
        'Carolina',
        'Beatriz',
        'Inês',
        'Mariana',
        'Francisca',
        'Benedita',
        'Margarida',
        'Constança',
      ],
      male: [
        'Francisco',
        'Afonso',
        'Tomás',
        'Duarte',
        'Santiago',
        'Rodrigo',
        'Martim',
        'Gonçalo',
        'Salvador',
        'Lourenço',
      ],
    },
  },
  anglophone: {
    old: {
      female: [
        'Elizabeth',
        'Mary',
        'Abigail',
        'Charlotte',
        'Eleanor',
        'Margaret',
        'Harriet',
        'Prudence',
        'Martha',
        'Victoria',
      ],
      male: ['William', 'Thomas', 'Edward', 'Henry', 'George', 'Samuel', 'Nathaniel', 'Arthur', 'Josiah', 'Albert'],
    },
    mid: {
      female: ['Linda', 'Barbara', 'Patricia', 'Susan', 'Nancy', 'Donna', 'Carol', 'Judy', 'Peggy', 'Shirley'],
      male: ['Robert', 'James', 'Richard', 'Donald', 'Gary', 'Larry', 'Kenneth', 'Ronald', 'Dennis', 'Walter'],
    },
    modern: {
      female: ['Olivia', 'Emma', 'Ava', 'Harper', 'Chloe', 'Madison', 'Zoe', 'Ruby', 'Isla', 'Grace'],
      male: ['Liam', 'Noah', 'Oliver', 'Mason', 'Ethan', 'Logan', 'Jack', 'Leo', 'Harry', 'Caleb'],
    },
  },
  hispanic: {
    old: {
      female: [
        'Juana',
        'Isabel',
        'Catalina',
        'Mercedes',
        'Remedios',
        'Dolores',
        'Pilar',
        'Ascensión',
        'Rosario',
        'Inés',
      ],
      male: [
        'Diego',
        'Rodrigo',
        'Hernán',
        'Gonzalo',
        'Íñigo',
        'Fernando',
        'Ignacio',
        'Santiago',
        'Alonso',
        'Bartolomé',
      ],
    },
    mid: {
      female: [
        'Carmen',
        'Lucía',
        'Marisol',
        'Consuelo',
        'Esperanza',
        'Gloria',
        'Teresa',
        'Rocío',
        'Lourdes',
        'Yolanda',
      ],
      male: [
        'José Luis',
        'Jesús',
        'Francisco',
        'Javier',
        'Ramón',
        'Ernesto',
        'Raúl',
        'Armando',
        'Alfredo',
        'Guillermo',
      ],
    },
    modern: {
      female: ['Sofía', 'Valentina', 'Camila', 'Martina', 'Ximena', 'Renata', 'Daniela', 'Paula', 'Abril', 'Julieta'],
      male: ['Mateo', 'Santiago', 'Thiago', 'Matías', 'Sebastián', 'Hugo', 'Emiliano', 'Leonardo', 'Álvaro', 'Joaquín'],
    },
  },
  italian: {
    old: {
      female: [
        'Lucrezia',
        'Beatrice',
        'Caterina',
        'Isabella',
        'Costanza',
        'Ginevra',
        'Margherita',
        'Vittoria',
        'Bianca',
        'Clarice',
      ],
      male: [
        'Lorenzo',
        'Giovanni',
        'Cosimo',
        'Niccolò',
        'Federico',
        'Galeazzo',
        'Bernardo',
        'Matteo',
        'Pietro',
        'Vincenzo',
      ],
    },
    mid: {
      female: [
        'Rosa',
        'Anna',
        'Giuseppina',
        'Carla',
        'Franca',
        'Rita',
        'Loredana',
        'Gabriella',
        'Patrizia',
        'Antonietta',
      ],
      male: ['Giuseppe', 'Salvatore', 'Franco', 'Mario', 'Luigi', 'Sergio', 'Bruno', 'Enzo', 'Carmine', 'Massimo'],
    },
    modern: {
      female: ['Sofia', 'Giulia', 'Aurora', 'Alice', 'Ginevra', 'Emma', 'Giorgia', 'Beatrice', 'Chiara', 'Martina'],
      male: [
        'Leonardo',
        'Francesco',
        'Alessandro',
        'Lorenzo',
        'Mattia',
        'Tommaso',
        'Gabriele',
        'Riccardo',
        'Edoardo',
        'Andrea',
      ],
    },
  },
  japanese: {
    old: {
      female: ['Haru', 'Kiku', 'Tsuru', 'Ume', 'Matsu', 'Chiyo', 'Fumi', 'Kane', 'Tome', 'Sato'],
      male: ['Takeshi', 'Saburō', 'Jirō', 'Ichirō', 'Kōtarō', 'Tokujirō', 'Hideyoshi', 'Shigeru', 'Tadashi', 'Isamu'],
    },
    mid: {
      female: ['Keiko', 'Yōko', 'Kazuko', 'Michiko', 'Hiroko', 'Sachiko', 'Akiko', 'Emiko', 'Junko', 'Tomoko'],
      male: ['Hiroshi', 'Kenji', 'Makoto', 'Osamu', 'Masao', 'Kazuo', 'Yutaka', 'Akira', 'Tetsuya', 'Minoru'],
    },
    modern: {
      female: ['Yui', 'Hina', 'Mei', 'Sakura', 'Rin', 'Aoi', 'Yuna', 'Mio', 'Himari', 'Riko'],
      male: ['Haruto', 'Sōta', 'Ren', 'Yūto', 'Minato', 'Riku', 'Hinata', 'Kaito', 'Asahi', 'Daiki'],
    },
  },
};

const SURNAMES: Record<Exclude<NameRegion, 'fantasy'>, readonly string[]> = {
  brazil: [
    'Silva',
    'Santos',
    'Oliveira',
    'Souza',
    'Pereira',
    'Costa',
    'Rodrigues',
    'Almeida',
    'Nascimento',
    'Lima',
    'Araújo',
    'Fernandes',
    'Carvalho',
    'Gomes',
    'Ribeiro',
    'Barbosa',
    'Rocha',
    'Cavalcanti',
    'Albuquerque',
    'Moura',
  ],
  portugal: [
    'Ferreira',
    'Pinto',
    'Teixeira',
    'Sousa',
    'Martins',
    'Lopes',
    'Marques',
    'Correia',
    'Vieira',
    'Monteiro',
    'Cardoso',
    'Magalhães',
    'Sá',
    'Brandão',
    'Meireles',
  ],
  anglophone: [
    'Smith',
    'Johnson',
    'Brown',
    'Taylor',
    'Miller',
    'Wilson',
    'Clarke',
    'Walker',
    'Hughes',
    'Bennett',
    'Foster',
    'Hayes',
    'Murphy',
    'Campbell',
    'Reed',
  ],
  hispanic: [
    'García',
    'Martínez',
    'López',
    'Hernández',
    'González',
    'Pérez',
    'Sánchez',
    'Ramírez',
    'Torres',
    'Flores',
    'Morales',
    'Vargas',
    'Castillo',
    'Ortega',
    'Delgado',
  ],
  italian: [
    'Rossi',
    'Russo',
    'Ferrari',
    'Esposito',
    'Bianchi',
    'Romano',
    'Colombo',
    'Ricci',
    'Marino',
    'Greco',
    'Bruno',
    'Conti',
    'De Luca',
    'Moretti',
    'Lombardi',
  ],
  japanese: [
    'Satō',
    'Suzuki',
    'Takahashi',
    'Tanaka',
    'Watanabe',
    'Itō',
    'Yamamoto',
    'Nakamura',
    'Kobayashi',
    'Katō',
    'Yoshida',
    'Yamada',
    'Matsumoto',
    'Inoue',
    'Kimura',
  ],
};

// Colonial Brazil also gave devotional surnames, often to the poor and to the enslaved.
const BRAZIL_COLONIAL_SURNAMES = [
  'de Jesus',
  'do Espírito Santo',
  'da Conceição',
  'dos Anjos',
  'de Deus',
  'da Cruz',
  'do Nascimento',
  'das Neves',
];

const FANTASY = {
  starts: [
    'Ael',
    'Bra',
    'Cae',
    'Dor',
    'Ely',
    'Fen',
    'Gal',
    'Har',
    'Ith',
    'Kael',
    'Lor',
    'Mor',
    'Nym',
    'Ora',
    'Pyr',
    'Quel',
    'Rha',
    'Syl',
    'Tor',
    'Ulr',
    'Vael',
    'Wyn',
    'Xan',
    'Zar',
  ],
  female: ['wen', 'ra', 'lia', 'thea', 'ris', 'na', 'elle', 'ssa', 'via', 'ndra', 'mira', 'eth'],
  male: ['dor', 'ric', 'gan', 'mar', 'thos', 'wyn', 'an', 'ros', 'eth', 'ius', 'vald', 'mund'],
  houses: [
    'da Torre Cinzenta',
    'Folha-de-Prata',
    'do Vale Sombrio',
    'Corvo-Negro',
    'das Sete Luas',
    'Pedra-Lume',
    'do Mar de Cinzas',
    'Lâmina-Rubra',
    'da Névoa',
    'Coração-de-Ferro',
    'do Bosque Antigo',
    'Asa-de-Vento',
  ],
};

const PERIOD_OF: Record<RealEra, Period> = {
  colonial: 'old',
  imperial: 'old',
  'early-1900s': 'old',
  midcentury: 'mid',
  contemporary: 'modern',
};

export type NameChoice = { era: NameEra; region: NameRegion; gender: NameGender };

const fantasyName = (gender: 'female' | 'male', random: Random): string =>
  `${pickOne(FANTASY.starts, random)}${pickOne(FANTASY[gender], random)} ${pickOne(FANTASY.houses, random)}`;

const realName = (era: RealEra, region: Exclude<NameRegion, 'fantasy'>, gender: 'female' | 'male', random: Random) => {
  const given = region === 'brazil' ? BRAZIL[era] : REGIONS[region][PERIOD_OF[era]];
  const surnames =
    region === 'brazil' && era === 'colonial' ? [...SURNAMES.brazil, ...BRAZIL_COLONIAL_SURNAMES] : SURNAMES[region];

  return `${pickOne(given[gender], random)} ${pickOne(surnames, random)}`;
};

export const generateName = ({ era, region, gender }: NameChoice, random: Random): string => {
  const picked = gender === 'any' ? pickOne(['female', 'male'] as const, random) : gender;

  if (era === 'fantasy' || region === 'fantasy') {
    return fantasyName(picked, random);
  }

  return realName(era, region, picked, random);
};

// A batch of different names; it stops trying after a while if the lists run short.
export const generateNames = (choice: NameChoice, random: Random, count = 10): string[] => {
  const names = new Set<string>();

  for (let attempt = 0; attempt < count * 10 && names.size < count; attempt += 1) {
    names.add(generateName(choice, random));
  }

  return [...names];
};
