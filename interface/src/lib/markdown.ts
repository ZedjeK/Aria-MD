// Le moteur Markdown de l'aperçu : il transforme un texte en arbre de blocs (titres, paragraphes, listes…) et de texte
// mis en forme (gras, liens…). Il n'écrit jamais de HTML : l'aperçu dessine l'arbre élément par élément, donc rien de ce
// que contient un document ne peut s'y exécuter ni charger quoi que ce soit.
//
// Ce n'est pas tout CommonMark : il couvre ce qu'on écrit tous les jours. Titres (`#` et soulignés), paragraphes,
// citations, listes à puces, numérotées et de tâches (imbriquées), blocs de code, séparateurs, tableaux ; gras, italique,
// barré `~~`, surligné `==`, souligné `<u>`, code, liens, images, sauts de ligne. Il ne gère pas les notes de bas de page,
// les liens par référence ni le HTML brut, affiché comme du texte.
//
// Chaque bloc retient la ligne (à partir de 0) où il commence : c'est ce qui relie un titre de l'aperçu à son texte.
import { finDeLEnTete } from './plan';

export type Alignement = 'defaut' | 'gauche' | 'centre' | 'droite';

export type EnLigne =
  | { type: 'texte'; texte: string }
  | { type: 'gras' | 'italique' | 'barre' | 'surligne' | 'souligne'; enfants: EnLigne[] }
  | { type: 'code'; texte: string }
  | { type: 'lien'; enfants: EnLigne[]; adresse: string }
  | { type: 'image'; alt: string; adresse: string }
  | { type: 'saut' };

/** Un élément de liste : ses blocs, et s'il a une case à cocher (cochée ou non ; null sans case). */
export interface Item {
  enfants: Bloc[];
  tache: boolean | null;
}

export type Bloc =
  | { type: 'titre'; niveau: number; enfants: EnLigne[]; ligne: number }
  | { type: 'paragraphe'; enfants: EnLigne[]; ligne: number }
  | { type: 'citation'; enfants: Bloc[]; ligne: number }
  | { type: 'liste'; ordonnee: boolean; debut: number; serree: boolean; items: Item[]; ligne: number }
  | { type: 'code'; langage: string; texte: string; ligne: number }
  | { type: 'separateur'; ligne: number }
  | {
      type: 'tableau';
      alignements: Alignement[];
      entete: EnLigne[][];
      lignes: EnLigne[][][];
      ligne: number;
    };

// ---------------------------------------------------------------------------------------------------------------
// Le texte en ligne
// ---------------------------------------------------------------------------------------------------------------

/** Remplace, avant l'analyse, un saut de ligne forcé (deux espaces ou `\` en fin de ligne) : il ne peut pas être du texte. */
const SAUT_FORCE = '';

const PONCTUATION_ASCII = /[!-/:-@[-`{-~]/;
const PONCTUATION = /[\p{P}\p{S}]/u;

/** Un jeton d'emphase pas encore apparié : une série de `*`, `_`, `~~`, `==` ou une balise `<u>` ou `</u>`. */
interface Delimiteur {
  type: 'delim';
  /** Le caractère : `*`, `_`, `~`, `=`, ou `u` pour les balises de souligné. */
  c: string;
  /** Combien il en reste. */
  n: number;
  ouvre: boolean;
  ferme: boolean;
}

type Jeton = EnLigne | Delimiteur;

const estBlanc = (c: string): boolean => c === '' || c === SAUT_FORCE || /\s/.test(c);
const estPonctuation = (c: string): boolean => c !== '' && PONCTUATION.test(c);

/** Le texte brut d'une suite de nœuds, sans mise en forme : pour le texte alternatif d'une image. */
export function textePlat(noeuds: EnLigne[]): string {
  return noeuds
    .map((noeud) => {
      switch (noeud.type) {
        case 'texte':
        case 'code':
          return noeud.texte;
        case 'image':
          return noeud.alt;
        case 'saut':
          return ' ';
        default:
          return textePlat(noeud.enfants);
      }
    })
    .join('');
}

/** Les guillemets inversés d'un code en ligne : le texte entre deux séries de même longueur. */
function codeEnLigne(texte: string, debut: number): { noeud: EnLigne; fin: number } | null {
  const serie = /^`+/.exec(texte.slice(debut))?.[0] ?? '`';
  let recherche = debut + serie.length;
  while (recherche < texte.length) {
    const suivante = texte.indexOf('`', recherche);
    if (suivante === -1) return null;
    const longueur = /^`+/.exec(texte.slice(suivante))?.[0].length ?? 1;
    if (longueur === serie.length) {
      let contenu = texte.slice(debut + serie.length, suivante).replace(/\n/g, ' ');
      // Un espace de chaque côté sert à écrire un code qui commence ou finit par un guillemet inversé.
      if (contenu.length > 1 && contenu.startsWith(' ') && contenu.endsWith(' ') && contenu.trim() !== '') {
        contenu = contenu.slice(1, -1);
      }
      return { noeud: { type: 'code', texte: contenu }, fin: suivante + longueur };
    }
    recherche = suivante + longueur;
  }
  return null;
}

/** Le `]` qui ferme le `[` de la position, en comptant les crochets imbriqués ; -1 s'il n'y en a pas. */
function fermetureDeCrochet(texte: string, debut: number): number {
  let profondeur = 0;
  for (let i = debut; i < texte.length; i += 1) {
    const c = texte.charAt(i);
    if (c === '\\') {
      i += 1;
    } else if (c === '`') {
      const code = codeEnLigne(texte, i);
      if (code !== null) i = code.fin - 1;
    } else if (c === '[') {
      profondeur += 1;
    } else if (c === ']') {
      profondeur -= 1;
      if (profondeur === 0) return i;
    }
  }
  return -1;
}

/** L'adresse d'un lien, juste après la parenthèse ouvrante : `adresse`, `<adresse>`, avec un titre facultatif. */
function adresseDeLien(texte: string, debut: number): { adresse: string; fin: number } | null {
  let i = debut;
  while (texte.charAt(i) === ' ') i += 1;
  let adresse: string;
  if (texte.charAt(i) === '<') {
    const fermeture = texte.indexOf('>', i + 1);
    if (fermeture === -1 || texte.slice(i + 1, fermeture).includes('\n')) return null;
    adresse = texte.slice(i + 1, fermeture);
    i = fermeture + 1;
  } else {
    const debutAdresse = i;
    let profondeur = 0;
    while (i < texte.length) {
      const c = texte.charAt(i);
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === ' ' || c === '\n') break;
      if (c === '(') profondeur += 1;
      if (c === ')') {
        if (profondeur === 0) break;
        profondeur -= 1;
      }
      i += 1;
    }
    adresse = texte.slice(debutAdresse, i).replace(/\\([!-/:-@[-`{-~])/g, '$1');
  }
  while (texte.charAt(i) === ' ') i += 1;
  const ouverture = texte.charAt(i);
  if (ouverture === '"' || ouverture === "'" || ouverture === '(') {
    const fermant = ouverture === '(' ? ')' : ouverture;
    const fin = texte.indexOf(fermant, i + 1);
    if (fin === -1) return null;
    i = fin + 1;
    while (texte.charAt(i) === ' ') i += 1;
  }
  return texte.charAt(i) === ')' ? { adresse, fin: i + 1 } : null;
}

/** Le texte en ligne d'un paragraphe, d'un titre ou d'une cellule. */
export function analyserEnLigne(texte: string): EnLigne[] {
  return enLigne(texte.replace(/( {2,}|\\)\n/g, SAUT_FORCE), false);
}

function enLigne(texte: string, dansUnLien: boolean): EnLigne[] {
  const jetons: Jeton[] = [];
  let tampon = '';
  const vider = (): void => {
    if (tampon !== '') {
      jetons.push({ type: 'texte', texte: tampon });
      tampon = '';
    }
  };

  let i = 0;
  while (i < texte.length) {
    const c = texte.charAt(i);

    if (c === '\\') {
      const suivant = texte.charAt(i + 1);
      if (suivant !== '' && PONCTUATION_ASCII.test(suivant)) {
        tampon += suivant;
        i += 2;
      } else {
        tampon += c;
        i += 1;
      }
      continue;
    }
    if (c === SAUT_FORCE) {
      vider();
      jetons.push({ type: 'saut' });
      i += 1;
      continue;
    }
    if (c === '\n') {
      tampon += ' ';
      i += 1;
      continue;
    }

    if (c === '`') {
      const code = codeEnLigne(texte, i);
      if (code !== null) {
        vider();
        jetons.push(code.noeud);
        i = code.fin;
      } else {
        // Sans guillemets pour la fermer, la série est du texte.
        const serie = /^`+/.exec(texte.slice(i))?.[0] ?? '`';
        tampon += serie;
        i += serie.length;
      }
      continue;
    }

    if ((c === '[' && !dansUnLien) || (c === '!' && texte.charAt(i + 1) === '[')) {
      const image = c === '!';
      const ouvrant = image ? i + 1 : i;
      const fermant = fermetureDeCrochet(texte, ouvrant);
      const destination = fermant !== -1 && texte.charAt(fermant + 1) === '(' ? adresseDeLien(texte, fermant + 2) : null;
      if (fermant !== -1 && destination !== null) {
        vider();
        const dedans = texte.slice(ouvrant + 1, fermant);
        jetons.push(
          image
            ? { type: 'image', alt: textePlat(enLigne(dedans, true)), adresse: destination.adresse }
            : { type: 'lien', enfants: enLigne(dedans, true), adresse: destination.adresse },
        );
        i = destination.fin;
        continue;
      }
      // Pas un lien : le crochet (et le point d'exclamation) sont du texte.
      tampon += c;
      i += 1;
      continue;
    }

    if (c === '<') {
      if (texte.startsWith('<u>', i)) {
        vider();
        jetons.push({ type: 'delim', c: 'u', n: 1, ouvre: true, ferme: false });
        i += 3;
        continue;
      }
      if (texte.startsWith('</u>', i)) {
        vider();
        jetons.push({ type: 'delim', c: 'u', n: 1, ouvre: false, ferme: true });
        i += 4;
        continue;
      }
      const auto = /^<(https?:\/\/[^\s<>]+)>/.exec(texte.slice(i));
      if (auto?.[1] !== undefined && !dansUnLien) {
        vider();
        jetons.push({ type: 'lien', enfants: [{ type: 'texte', texte: auto[1] }], adresse: auto[1] });
        i += auto[0].length;
        continue;
      }
    }

    if (c === 'h' && !dansUnLien && texte.startsWith('http', i) && (i === 0 || /[\s(]/.test(texte.charAt(i - 1)))) {
      const nue = /^https?:\/\/[^\s<]+/.exec(texte.slice(i))?.[0];
      if (nue !== undefined) {
        const adresse = nue.replace(/[.,;:!?'")\]]+$/, '');
        if (/^https?:\/\/./.test(adresse)) {
          vider();
          jetons.push({ type: 'lien', enfants: [{ type: 'texte', texte: adresse }], adresse });
          i += adresse.length;
          continue;
        }
      }
    }

    if (c === '*' || c === '_' || c === '~' || c === '=') {
      let n = 0;
      while (texte.charAt(i + n) === c) n += 1;
      // Le barré et le surligné s'écrivent avec deux signes, ni un, ni trois.
      if ((c === '~' || c === '=') && n !== 2) {
        tampon += c.repeat(n);
        i += n;
        continue;
      }
      const avant = texte.charAt(i - 1);
      const apres = texte.charAt(i + n);
      const flancGauche = !estBlanc(apres) && (!estPonctuation(apres) || estBlanc(avant) || estPonctuation(avant));
      const flancDroit = !estBlanc(avant) && (!estPonctuation(avant) || estBlanc(apres) || estPonctuation(apres));
      // Le tiret bas ne forme pas d'emphase au milieu d'un mot (snake_case).
      const ouvre = c === '_' ? flancGauche && (!flancDroit || estPonctuation(avant)) : flancGauche;
      const ferme = c === '_' ? flancDroit && (!flancGauche || estPonctuation(apres)) : flancDroit;
      vider();
      jetons.push({ type: 'delim', c, n, ouvre, ferme });
      i += n;
      continue;
    }

    tampon += c;
    i += 1;
  }
  vider();
  return convertir(apparier(jetons));
}

/** L'emphase finie : le nœud que fait un appariement, selon le signe et le nombre de signes utilisés. */
function noeudDEmphase(c: string, usage: number, enfants: EnLigne[]): EnLigne {
  switch (c) {
    case '~':
      return { type: 'barre', enfants };
    case '=':
      return { type: 'surligne', enfants };
    case 'u':
      return { type: 'souligne', enfants };
    default:
      return { type: usage >= 2 ? 'gras' : 'italique', enfants };
  }
}

/** Apparie les délimiteurs d'emphase, à la manière de CommonMark : chaque fermant cherche l'ouvrant le plus proche. */
function apparier(jetons: Jeton[]): Jeton[] {
  const liste = [...jetons];
  let f = 0;
  while (f < liste.length) {
    const fermant = liste[f];
    if (fermant?.type !== 'delim' || !fermant.ferme || fermant.n <= 0) {
      f += 1;
      continue;
    }
    let o = f - 1;
    let ouvrant: Delimiteur | null = null;
    while (o >= 0) {
      const candidat = liste[o];
      if (candidat?.type === 'delim' && candidat.c === fermant.c && candidat.ouvre && candidat.n > 0) {
        ouvrant = candidat;
        break;
      }
      o -= 1;
    }
    if (ouvrant === null) {
      f += 1;
      continue;
    }
    const usage = fermant.c === '*' || fermant.c === '_' ? (ouvrant.n >= 2 && fermant.n >= 2 ? 2 : 1) : fermant.n;
    const noeud = noeudDEmphase(fermant.c, usage, convertir(liste.slice(o + 1, f)));
    ouvrant.n -= usage;
    fermant.n -= usage;
    liste.splice(o + 1, f - o - 1, noeud);
    f = o + 2;
    if (ouvrant.n <= 0) {
      liste.splice(o, 1);
      f -= 1;
    }
    if (fermant.n <= 0) liste.splice(f, 1);
  }
  return liste;
}

/** Les délimiteurs restés sans partenaire redeviennent du texte ; le texte voisin se rejoint. */
function convertir(jetons: Jeton[]): EnLigne[] {
  const sortie: EnLigne[] = [];
  const ajouter = (noeud: EnLigne): void => {
    const dernier = sortie[sortie.length - 1];
    if (noeud.type === 'texte' && dernier?.type === 'texte') dernier.texte += noeud.texte;
    else sortie.push(noeud);
  };
  for (const jeton of jetons) {
    if (jeton.type !== 'delim') {
      ajouter(jeton);
    } else if (jeton.n > 0) {
      const texte = jeton.c === 'u' ? (jeton.ouvre ? '<u>' : '</u>') : jeton.c.repeat(jeton.n);
      ajouter({ type: 'texte', texte });
    }
  }
  return sortie;
}

// ---------------------------------------------------------------------------------------------------------------
// Les blocs
// ---------------------------------------------------------------------------------------------------------------

const estVide = (ligne: string | undefined): boolean => (ligne ?? '').trim() === '';
const indentation = (ligne: string): number => ligne.length - ligne.trimStart().length;

const SEPARATEUR = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const CITATION = /^ {0,3}>/;
const LIGNE_DE_DELIMITATION = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

function titreAtx(ligne: string): { niveau: number; texte: string } | null {
  const lu = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/.exec(ligne);
  if (lu?.[1] === undefined) return null;
  return { niveau: lu[1].length, texte: (lu[2] ?? '').replace(/[ \t]+#+[ \t]*$/, '') };
}

function ouvertureDeBarriere(ligne: string): { indentation: number; marque: string; langage: string } | null {
  const lu = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/.exec(ligne);
  if (lu?.[2] === undefined) return null;
  const info = (lu[3] ?? '').trim();
  // Après des guillemets inversés, un autre guillemet inversé : c'est du code en ligne, pas un bloc.
  if (lu[2].startsWith('`') && info.includes('`')) return null;
  return { indentation: lu[1]?.length ?? 0, marque: lu[2], langage: info.split(/\s+/)[0] ?? '' };
}

interface Marqueur {
  indentation: number;
  marque: string;
  ordonnee: boolean;
  delimiteur: string;
  numero: number;
  /** La colonne où commence le contenu de l'élément : ce qui est au moins aussi indenté lui appartient. */
  colonne: number;
  /** Le contenu de la première ligne, après le marqueur. */
  contenu: string;
}

function marqueurDeListe(ligne: string): Marqueur | null {
  const lu = /^( {0,3})([-*+]|(\d{1,9})([.)]))(?:( +)(.*))?$/.exec(ligne);
  if (lu?.[2] === undefined) return null;
  const gauche = lu[1] ?? '';
  const espaces = lu[5]?.length ?? 0;
  const reste = lu[6] ?? '';
  // Plus de quatre espaces après le marqueur : le contenu commence un espace après lui.
  const largeur = espaces >= 1 && espaces <= 4 ? espaces : 1;
  return {
    indentation: gauche.length,
    marque: lu[2],
    ordonnee: lu[3] !== undefined,
    delimiteur: lu[4] ?? '',
    numero: Number(lu[3] ?? 0),
    colonne: gauche.length + lu[2].length + largeur,
    contenu: espaces > 4 ? ' '.repeat(espaces - 1) + reste : reste,
  };
}

const memeListe = (a: Marqueur, b: Marqueur): boolean =>
  a.ordonnee === b.ordonnee && (a.ordonnee ? a.delimiteur === b.delimiteur : a.marque === b.marque);

/** Cette ligne coupe-t-elle un paragraphe ? Un bloc qui commence, ou une liste (numérotée seulement si elle commence à 1). */
function interrompt(ligne: string): boolean {
  if (ouvertureDeBarriere(ligne) !== null || titreAtx(ligne) !== null || SEPARATEUR.test(ligne) || CITATION.test(ligne)) {
    return true;
  }
  const marqueur = marqueurDeListe(ligne);
  return marqueur !== null && marqueur.contenu.trim() !== '' && (!marqueur.ordonnee || marqueur.numero === 1);
}

/** Les cellules d'une ligne de tableau : coupée aux `|` qui ne sont pas protégés par `\`. */
function decouperCellules(ligne: string): string[] {
  let texte = ligne.trim();
  if (texte.startsWith('|')) texte = texte.slice(1);
  if (texte.endsWith('|') && !texte.endsWith('\\|')) texte = texte.slice(0, -1);
  const cellules: string[] = [];
  let courante = '';
  for (let i = 0; i < texte.length; i += 1) {
    const c = texte.charAt(i);
    if (c === '\\' && texte.charAt(i + 1) === '|') {
      courante += '|';
      i += 1;
    } else if (c === '|') {
      cellules.push(courante.trim());
      courante = '';
    } else {
      courante += c;
    }
  }
  cellules.push(courante.trim());
  return cellules;
}

function alignementDe(cellule: string): Alignement {
  const gauche = cellule.startsWith(':');
  const droite = cellule.endsWith(':');
  if (gauche && droite) return 'centre';
  if (droite) return 'droite';
  return gauche ? 'gauche' : 'defaut';
}

function analyserTableau(lignes: string[], debut: number, base: number): { bloc: Bloc; suivant: number } | null {
  const entete = lignes[debut] ?? '';
  const delimitation = lignes[debut + 1];
  if (delimitation === undefined || !entete.includes('|') || !LIGNE_DE_DELIMITATION.test(delimitation)) return null;
  const titres = decouperCellules(entete);
  const colonnes = decouperCellules(delimitation);
  if (titres.length !== colonnes.length) return null;
  const rangees: EnLigne[][][] = [];
  let i = debut + 2;
  while (i < lignes.length) {
    const ligne = lignes[i] ?? '';
    if (estVide(ligne) || ouvertureDeBarriere(ligne) !== null || titreAtx(ligne) !== null || CITATION.test(ligne)) break;
    const cellules = decouperCellules(ligne);
    // Une rangée plus courte est complétée de cellules vides, une plus longue est coupée.
    rangees.push(colonnes.map((_, k) => analyserEnLigne(cellules[k] ?? '')));
    i += 1;
  }
  return {
    bloc: {
      type: 'tableau',
      alignements: colonnes.map(alignementDe),
      entete: titres.map((cellule) => analyserEnLigne(cellule)),
      lignes: rangees,
      ligne: base + debut,
    },
    suivant: i,
  };
}

function analyserListe(lignes: string[], debut: number, base: number): { bloc: Bloc; suivant: number } {
  const premier = marqueurDeListe(lignes[debut] ?? '');
  const items: Item[] = [];
  let serree = true;
  let i = debut;
  while (premier !== null && i < lignes.length) {
    const marqueur = marqueurDeListe(lignes[i] ?? '');
    if (marqueur === null || !memeListe(premier, marqueur)) break;
    const debutItem = i;
    const colonne = marqueur.colonne;
    const contenu: string[] = [marqueur.contenu];
    i += 1;
    while (i < lignes.length) {
      const ligne = lignes[i] ?? '';
      if (estVide(ligne)) {
        let j = i;
        while (j < lignes.length && estVide(lignes[j])) j += 1;
        // Des lignes vides suivies de texte assez indenté : l'élément continue.
        if (j < lignes.length && indentation(lignes[j] ?? '') >= colonne) {
          for (let k = i; k < j; k += 1) contenu.push('');
          i = j;
          continue;
        }
        break;
      }
      if (indentation(ligne) >= colonne) {
        contenu.push(ligne.slice(colonne));
        i += 1;
        continue;
      }
      // Une ligne moins indentée prolonge le paragraphe en cours, tant qu'elle ne commence rien de nouveau.
      if (!estVide(contenu[contenu.length - 1]) && !interrompt(ligne) && marqueurDeListe(ligne) === null) {
        contenu.push(ligne.trim());
        i += 1;
        continue;
      }
      break;
    }
    if (contenu.slice(1).includes('')) serree = false;
    // Après un élément, des lignes vides puis un autre élément de la même liste : la liste est « aérée ».
    if (i < lignes.length && estVide(lignes[i])) {
      let j = i;
      while (j < lignes.length && estVide(lignes[j])) j += 1;
      const suivant = marqueurDeListe(lignes[j] ?? '');
      if (suivant !== null && memeListe(premier, suivant)) {
        serree = false;
        i = j;
      }
    }
    let tache: boolean | null = null;
    const caseACocher = /^\[([ xX])\](?:[ \t]+(.*))?$/.exec(contenu[0] ?? '');
    if (caseACocher?.[1] !== undefined) {
      tache = caseACocher[1] !== ' ';
      contenu[0] = caseACocher[2] ?? '';
    }
    items.push({ enfants: analyserBlocs(contenu, base + debutItem), tache });
  }
  return {
    bloc: {
      type: 'liste',
      ordonnee: premier?.ordonnee ?? false,
      debut: premier?.ordonnee === true ? premier.numero : 1,
      serree,
      items,
      ligne: base + debut,
    },
    suivant: Math.max(i, debut + 1),
  };
}

function analyserBlocs(lignes: string[], base: number): Bloc[] {
  const blocs: Bloc[] = [];
  let i = 0;
  while (i < lignes.length) {
    const ligne = lignes[i] ?? '';
    if (estVide(ligne)) {
      i += 1;
      continue;
    }

    const barriere = ouvertureDeBarriere(ligne);
    if (barriere !== null) {
      const code: string[] = [];
      let j = i + 1;
      while (j < lignes.length) {
        const suivante = lignes[j] ?? '';
        const ferme = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(suivante)?.[1];
        if (ferme !== undefined && ferme.startsWith(barriere.marque.charAt(0)) && ferme.length >= barriere.marque.length) break;
        code.push(suivante.replace(new RegExp(`^ {0,${barriere.indentation}}`), ''));
        j += 1;
      }
      blocs.push({ type: 'code', langage: barriere.langage, texte: code.join('\n'), ligne: base + i });
      i = j < lignes.length ? j + 1 : j;
      continue;
    }

    const atx = titreAtx(ligne);
    if (atx !== null) {
      blocs.push({ type: 'titre', niveau: atx.niveau, enfants: analyserEnLigne(atx.texte), ligne: base + i });
      i += 1;
      continue;
    }

    if (SEPARATEUR.test(ligne)) {
      blocs.push({ type: 'separateur', ligne: base + i });
      i += 1;
      continue;
    }

    if (CITATION.test(ligne)) {
      const debut = i;
      const dedans: string[] = [];
      while (i < lignes.length && CITATION.test(lignes[i] ?? '')) {
        dedans.push((lignes[i] ?? '').replace(/^ {0,3}> ?/, ''));
        i += 1;
      }
      // Une ligne sans « > » prolonge le paragraphe de la citation, tant qu'elle ne commence rien de nouveau.
      while (i < lignes.length && !estVide(lignes[i]) && !interrompt(lignes[i] ?? '') && !estVide(dedans[dedans.length - 1])) {
        dedans.push(lignes[i] ?? '');
        i += 1;
      }
      blocs.push({ type: 'citation', enfants: analyserBlocs(dedans, base + debut), ligne: base + debut });
      continue;
    }

    if (marqueurDeListe(ligne) !== null) {
      const liste = analyserListe(lignes, i, base);
      blocs.push(liste.bloc);
      i = liste.suivant;
      continue;
    }

    const tableau = analyserTableau(lignes, i, base);
    if (tableau !== null) {
      blocs.push(tableau.bloc);
      i = tableau.suivant;
      continue;
    }

    // Un paragraphe, ou un titre souligné par === ou ---.
    const debut = i;
    const morceaux: string[] = [];
    let niveau = 0;
    while (i < lignes.length) {
      const courante = lignes[i] ?? '';
      if (estVide(courante) || (i > debut && interrompt(courante))) break;
      morceaux.push(courante.replace(/^ +/, ''));
      i += 1;
      const suivante = lignes[i];
      if (suivante !== undefined && /^ {0,3}=+[ \t]*$/.test(suivante)) {
        niveau = 1;
        i += 1;
        break;
      }
      if (suivante !== undefined && /^ {0,3}-+[ \t]*$/.test(suivante)) {
        niveau = 2;
        i += 1;
        break;
      }
    }
    const texte = morceaux.join('\n').replace(/\s+$/, '');
    blocs.push(
      niveau > 0
        ? { type: 'titre', niveau, enfants: analyserEnLigne(texte), ligne: base + debut }
        : { type: 'paragraphe', enfants: analyserEnLigne(texte), ligne: base + debut },
    );
  }
  return blocs;
}

/** Un document Markdown en blocs. Chaque bloc retient la ligne (à partir de 0) où il commence. */
export function analyser(contenu: string): Bloc[] {
  const lignes = contenu
    .replace(/\r\n?/g, '\n')
    .split('\n')
    // Une tabulation en tête de ligne vaut quatre espaces : l'indentation décide des listes imbriquées et du code.
    .map((ligne) => ligne.replace(/^[ \t]+/, (blancs) => blancs.replace(/\t/g, '    ')));
  const finEnTete = finDeLEnTete(lignes);
  if (finEnTete < 0) return analyserBlocs(lignes, 0);
  const enTete: Bloc = { type: 'code', langage: 'yaml', texte: lignes.slice(1, finEnTete).join('\n'), ligne: 0 };
  return [enTete, ...analyserBlocs(lignes.slice(finEnTete + 1), finEnTete + 1)];
}
