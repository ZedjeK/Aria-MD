// Le fond animé d'Aria MD : « Markdown qui se rend ». Des lignes de Markdown fantômes s'écrivent caractère par caractère,
// se « rendent » (le `#` devient un titre, les astérisques disparaissent, le surligné passe à l'orange), restent un moment,
// puis s'effacent. Ce fichier tient ce qui se calcule sans écran : les modèles de lignes, leur cycle de vie, le tirage des
// rangées. FondAnime.svelte ne fait que les dessiner.

/** Comment un morceau de texte rendu se dessine. */
export type Style =
  | 'normal'
  | 'titre1'
  | 'titre2'
  | 'gras'
  | 'italique'
  | 'barre'
  | 'surligne'
  | 'code'
  | 'lien'
  | 'citation'
  | 'puce';

export interface Segment {
  texte: string;
  style: Style;
}

/** Une ligne de Markdown (ce qui est écrit) et ce qu'elle donne une fois rendue. */
export interface Modele {
  source: string;
  rendu: Segment[];
}

type Hasard = () => number;

/** Une liste qui a au moins un élément : on y pioche sans valeur absente à gérer. */
type NonEmpty<T> = [T, ...T[]];

const MOTS: NonEmpty<string> = [
  'idée',
  'plan',
  'note',
  'brouillon',
  'projet',
  'titre',
  'lien',
  'texte',
  'liste',
  'page',
  'carnet',
  'résumé',
  'étape',
  'détail',
  'exemple',
  'chapitre',
];

const PHRASES: NonEmpty<string> = [
  'une idée à garder',
  'relire le brouillon',
  'noter ce détail',
  'finir le plan',
  'ranger les notes',
  'écrire la suite',
  'tout ce qu’il faut savoir',
  'à relire demain',
];

const CODES: NonEmpty<string> = ['npm run build', 'git commit', 'fn main()', 'const x = 1', 'cd ..', '# titre'];

const piocher = <T>(liste: NonEmpty<T>, hasard: Hasard): T =>
  liste[Math.min(liste.length - 1, Math.floor(hasard() * liste.length))] ?? liste[0];

const majuscule = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);

/** Ce que la ligne devient une fois rendue : un modèle par sorte de Markdown, avec des mots tirés au hasard. */
const FABRIQUES: ((hasard: Hasard) => Modele)[] = [
  (h) => {
    const mot = majuscule(piocher(MOTS, h));
    return { source: `# ${mot}`, rendu: [{ texte: mot, style: 'titre1' }] };
  },
  (h) => {
    const mot = majuscule(piocher(MOTS, h));
    return { source: `## ${mot}`, rendu: [{ texte: mot, style: 'titre2' }] };
  },
  (h) => {
    const mot = piocher(MOTS, h);
    return { source: `**${mot}**`, rendu: [{ texte: mot, style: 'gras' }] };
  },
  (h) => {
    const mot = piocher(MOTS, h);
    return { source: `*${mot}*`, rendu: [{ texte: mot, style: 'italique' }] };
  },
  (h) => {
    const mot = piocher(MOTS, h);
    return { source: `~~${mot}~~`, rendu: [{ texte: mot, style: 'barre' }] };
  },
  (h) => {
    const [avant, mot, apres] = [piocher(MOTS, h), piocher(MOTS, h), piocher(MOTS, h)];
    return {
      source: `${avant} ==${mot}== ${apres}`,
      rendu: [
        { texte: `${avant} `, style: 'normal' },
        { texte: mot, style: 'surligne' },
        { texte: ` ${apres}`, style: 'normal' },
      ],
    };
  },
  (h) => {
    const code = piocher(CODES, h);
    return { source: `\`${code}\``, rendu: [{ texte: code, style: 'code' }] };
  },
  (h) => {
    const mot = piocher(MOTS, h);
    return { source: `[${mot}](adresse)`, rendu: [{ texte: mot, style: 'lien' }] };
  },
  (h) => {
    const phrase = piocher(PHRASES, h);
    return { source: `> ${phrase}`, rendu: [{ texte: phrase, style: 'citation' }] };
  },
  (h) => {
    const phrase = piocher(PHRASES, h);
    return {
      source: `- ${phrase}`,
      rendu: [
        { texte: '• ', style: 'puce' },
        { texte: phrase, style: 'normal' },
      ],
    };
  },
  (h) => {
    const phrase = piocher(PHRASES, h);
    return {
      source: `1. ${phrase}`,
      rendu: [
        { texte: '1. ', style: 'puce' },
        { texte: phrase, style: 'normal' },
      ],
    };
  },
  (h) => {
    const phrase = piocher(PHRASES, h);
    return {
      source: `- [x] ${phrase}`,
      rendu: [
        { texte: '✓ ', style: 'puce' },
        { texte: phrase, style: 'normal' },
      ],
    };
  },
];

/** Le nombre de sortes de lignes que le fond sait écrire. */
export const NOMBRE_DE_MODELES = FABRIQUES.length;

/** Une ligne au hasard (le modèle, puis ses mots). */
export function tirerModele(hasard: Hasard = Math.random): Modele {
  const fabrique = FABRIQUES[Math.min(FABRIQUES.length - 1, Math.floor(hasard() * FABRIQUES.length))];
  return (fabrique ?? FABRIQUES[0] ?? (() => ({ source: '# Titre', rendu: [] })))(hasard);
}

/** Les quatre temps de la vie d'une ligne : elle s'écrit, se rend, reste, puis s'efface. */
export type Phase = 'ecriture' | 'rendu' | 'repos' | 'effacement';

export interface Etape {
  phase: Phase;
  /** Où en est la phase, de 0 à 1. */
  progression: number;
}

/** Où finit chaque phase dans la vie de la ligne (de 0 à 1) : l'écriture, le rendu, le repos ; l'effacement va jusqu'à 1. */
const FINS = { ecriture: 0.32, rendu: 0.42, repos: 0.82 } as const;

/** L'étape d'une ligne à un moment de sa vie (`t` de 0 à 1 ; au-delà, elle est effacée). */
export function etape(t: number): Etape {
  const borne = Math.min(1, Math.max(0, t));
  if (borne < FINS.ecriture) return { phase: 'ecriture', progression: borne / FINS.ecriture };
  if (borne < FINS.rendu) {
    return { phase: 'rendu', progression: (borne - FINS.ecriture) / (FINS.rendu - FINS.ecriture) };
  }
  if (borne < FINS.repos) return { phase: 'repos', progression: (borne - FINS.rendu) / (FINS.repos - FINS.rendu) };
  return { phase: 'effacement', progression: (borne - FINS.repos) / (1 - FINS.repos) };
}

/** Combien de caractères de la ligne sont écrits à ce moment de l'écriture. */
export function caracteresEcrits(progression: number, longueur: number): number {
  return Math.min(longueur, Math.max(0, Math.ceil(progression * longueur)));
}

/** La part du texte source encore visible (1 : tout, 0 : plus rien) : il s'efface pendant que le rendu apparaît. */
export function partSource(e: Etape): number {
  if (e.phase === 'ecriture') return 1;
  if (e.phase === 'rendu') return 1 - e.progression;
  return 0;
}

/** La part du texte rendu visible (0 : rien, 1 : tout). */
export function partRendu(e: Etape): number {
  if (e.phase === 'ecriture') return 0;
  if (e.phase === 'rendu') return e.progression;
  return 1;
}

/** L'opacité de toute la ligne : elle apparaît dès les premiers caractères, et s'efface à la fin. */
export function opacite(e: Etape): number {
  if (e.phase === 'ecriture') return Math.min(1, e.progression * 6);
  if (e.phase === 'effacement') return 1 - e.progression;
  return 1;
}

/** Le nombre de rangées qui découpent la hauteur : les lignes s'y posent sans se marcher dessus. */
export const RANGEES = 12;

/**
 * Les rangées où les lignes se posent : ni les deux du haut (le titre de la page et ses pastilles d'état) ni la dernière (la
 * ligne d'état), pour que le texte fantôme ne passe pas sous du texte de l'appli.
 */
export const PREMIERE_RANGEE = 2;
export const DERNIERE_RANGEE = RANGEES - 2;

/** Une rangée libre au hasard, parmi celles où l'on peut se poser ; si toutes sont prises, n'importe laquelle d'entre elles. */
export function rangeeLibre(occupees: ReadonlySet<number>, hasard: Hasard = Math.random): number {
  const toutes: number[] = [];
  for (let i = PREMIERE_RANGEE; i <= DERNIERE_RANGEE; i += 1) toutes.push(i);
  const libres = toutes.filter((i) => !occupees.has(i));
  const choix = libres.length > 0 ? libres : toutes;
  return choix[Math.min(choix.length - 1, Math.floor(hasard() * choix.length))] ?? PREMIERE_RANGEE;
}

/** Une durée de vie au hasard autour de la durée moyenne : de 0,8 à 1,4 fois. */
export function dureeDeVie(moyenne: number, hasard: Hasard = Math.random): number {
  return moyenne * (0.8 + hasard() * 0.6);
}
