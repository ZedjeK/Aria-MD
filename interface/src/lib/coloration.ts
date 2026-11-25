// La coloration du code de l'aperçu : highlight.js (le « noyau » et les langages les plus courants seulement, pas les 190),
// dont on lit la sortie pour en faire des nœuds. Rien n'est jamais écrit comme du HTML : le composant `CodeColore` dessine
// chaque nœud en élément, comme le reste de l'aperçu.
//
// Le langage écrit après les guillemets d'un bloc fait foi. Sans langage, highlight.js tente de le reconnaître : on ne
// garde sa réponse que s'il est assez sûr (le bloc est alors étiqueté « détecté »), sinon le code reste sans couleur. Un code
// en ligne, trop court pour qu'on le devine, n'est coloré que s'il est très sûr.
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import graphql from 'highlight.js/lib/languages/graphql';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import lua from 'highlight.js/lib/languages/lua';
import makefile from 'highlight.js/lib/languages/makefile';
import markdown from 'highlight.js/lib/languages/markdown';
import nginx from 'highlight.js/lib/languages/nginx';
import perl from 'highlight.js/lib/languages/perl';
import php from 'highlight.js/lib/languages/php';
import powershell from 'highlight.js/lib/languages/powershell';
import python from 'highlight.js/lib/languages/python';
import r from 'highlight.js/lib/languages/r';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import scss from 'highlight.js/lib/languages/scss';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { nomDuLangage } from './langages';

/** Un morceau de code : du texte, ou un groupe qui porte une classe de highlight.js (`hljs-keyword`, `hljs-string`…). */
export type NoeudCode = { texte: string } | { classe: string; enfants: NoeudCode[] };

export interface Coloration {
  noeuds: NoeudCode[];
  /** Le langage a été reconnu par highlight.js, et non écrit par l'utilisateur. */
  detecte: boolean;
  /** Le nom du langage reconnu, en toutes lettres ; rien quand il est écrit (c'est alors `nomDuLangage`). */
  nom: string | null;
}

const LANGAGES: Record<string, Parameters<typeof hljs.registerLanguage>[1]> = {
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  dockerfile,
  go,
  graphql,
  ini,
  java,
  javascript,
  json,
  kotlin,
  lua,
  makefile,
  markdown,
  nginx,
  perl,
  php,
  powershell,
  python,
  r,
  ruby,
  rust,
  scss,
  shell,
  sql,
  swift,
  typescript,
  xml,
  yaml,
};

for (const [nom, definition] of Object.entries(LANGAGES)) hljs.registerLanguage(nom, definition);
// Les fichiers Svelte et Vue sont du HTML pour highlight.js ; les autres noms courants (`js`, `ts`, `py`, `sh`, `yml`, `html`,
// `toml`, `ps1`…) sont déjà des alias de ses langages.
hljs.registerAliases(['svelte', 'vue'], { languageName: 'xml' });

/**
 * Les langages que la reconnaissance automatique essaie. Ceux qui ressemblent à n'importe quoi (le Markdown, un fichier INI, un
 * Makefile, une session de shell) n'y sont pas : ils ne se colorent que si l'utilisateur les nomme.
 */
const A_RECONNAITRE = [
  'bash',
  'c',
  'cpp',
  'csharp',
  'css',
  'diff',
  'go',
  'java',
  'javascript',
  'json',
  'kotlin',
  'lua',
  'php',
  'powershell',
  'python',
  'ruby',
  'rust',
  'sql',
  'swift',
  'typescript',
  'xml',
  'yaml',
];

/** La sûreté (la « pertinence » de highlight.js) minimale pour se fier à une reconnaissance, dans un bloc… */
const SEUIL_BLOC = 5;
/** …et dans un code en ligne, trop court pour qu'on le devine : seul un code très typé passe. */
const SEUIL_EN_LIGNE = 8;
/** Au-delà, le code n'est pas coloré : la coloration, surtout la reconnaissance, ralentirait la frappe. */
const LONGUEUR_MAX = 60_000;

const ENTITES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'" };

/** Les cinq entités que highlight.js écrit dans son HTML, et aucune autre. */
function deshtmliser(texte: string): string {
  return texte.replace(/&(?:amp|lt|gt|quot|#x27);/g, (entite) => ENTITES[entite] ?? entite);
}

/**
 * Le HTML de highlight.js (du texte échappé et des `<span class="hljs-…">` imbriqués) devenu des nœuds. Rien d'autre que ces
 * balises n'y figure ; une balise de trop ou de moins ne casse pas la lecture.
 */
export function analyserSortie(html: string): NoeudCode[] {
  const racine: NoeudCode[] = [];
  const pile: NoeudCode[][] = [racine];
  for (const lu of html.matchAll(/<span class="([^"]*)">|<\/span>|[^<]+/g)) {
    const courant = pile[pile.length - 1] ?? racine;
    if (lu[1] !== undefined) {
      const enfants: NoeudCode[] = [];
      courant.push({ classe: lu[1], enfants });
      pile.push(enfants);
    } else if (lu[0] === '</span>') {
      if (pile.length > 1) pile.pop();
    } else {
      courant.push({ texte: deshtmliser(lu[0]) });
    }
  }
  return racine;
}

/** Le texte que forment les nœuds, sans leurs couleurs. */
export function texteDesNoeuds(noeuds: NoeudCode[]): string {
  return noeuds.map((noeud) => ('texte' in noeud ? noeud.texte : texteDesNoeuds(noeud.enfants))).join('');
}

const MEMOIRE_MAX = 200;
const memoire = new Map<string, Coloration | null>();

/**
 * Colore un code. `langage` est ce qui est écrit après les guillemets (rien pour un code en ligne). Rien en retour quand le
 * langage écrit n'est pas connu, quand il n'y en a pas et qu'il n'est pas reconnu assez sûrement, ou quand le code est trop
 * long. `enLigne` demande la sûreté d'un code en ligne.
 */
export function colorer(texte: string, langage: string, enLigne = false): Coloration | null {
  const ecrit = langage.trim().toLowerCase();
  if (texte.trim() === '' || texte.length > LONGUEUR_MAX) return null;
  const cle = `${enLigne ? 'l' : 'b'}\u0000${ecrit}\u0000${texte}`;
  if (memoire.has(cle)) return memoire.get(cle) ?? null;
  const resultat = calculer(texte, ecrit, enLigne);
  // La mémoire garde les derniers calculs : l'aperçu se redessine à chaque pause de frappe, sans recolorer ce qui n'a pas bougé.
  if (memoire.size >= MEMOIRE_MAX) memoire.delete(memoire.keys().next().value ?? '');
  memoire.set(cle, resultat);
  return resultat;
}

function calculer(texte: string, ecrit: string, enLigne: boolean): Coloration | null {
  if (ecrit !== '') {
    if (hljs.getLanguage(ecrit) === undefined) return null;
    const lu = hljs.highlight(texte, { language: ecrit, ignoreIllegals: true });
    return { noeuds: analyserSortie(lu.value), detecte: false, nom: null };
  }
  const lu = hljs.highlightAuto(texte, A_RECONNAITRE);
  if (lu.language === undefined || lu.relevance < (enLigne ? SEUIL_EN_LIGNE : SEUIL_BLOC)) return null;
  // Un deuxième langage presque aussi sûr, d'une autre famille, c'est un doute : mieux vaut pas de couleur qu'une mauvaise
  // (un court bloc de Python pris pour du CSS). Entre langages cousins (JavaScript et TypeScript), le doute ne gêne pas.
  const autre = lu.secondBest;
  if (
    autre?.language !== undefined &&
    autre.relevance > lu.relevance * MARGE &&
    famille(autre.language) !== famille(lu.language)
  ) {
    return null;
  }
  return { noeuds: analyserSortie(lu.value), detecte: true, nom: nomDuLangage(lu.language) };
}

/** Le deuxième langage doit rester sous cette part de la sûreté du premier. */
const MARGE = 0.85;

/** Les langages cousins, qu'on ne départage pas : leur coloration est presque la même. */
const COUSINS = [
  ['javascript', 'typescript'],
  ['c', 'cpp', 'csharp', 'java', 'kotlin'],
];

function famille(langage: string): string {
  return COUSINS.find((groupe) => groupe.includes(langage))?.[0] ?? langage;
}

/** L'étiquette d'un bloc : le langage écrit en toutes lettres, ou le langage reconnu suivi de « (détecté) ». */
export function etiquetteDuBloc(langage: string, coloration: Coloration | null): string {
  return coloration?.detecte === true && coloration.nom !== null
    ? `${coloration.nom} (détecté)`
    : nomDuLangage(langage);
}
