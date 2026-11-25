// La mise en forme Markdown d'une zone de texte : ce que fait chaque raccourci de la barre latérale sur un texte et une
// sélection. Des fonctions pures : elles ne touchent pas au DOM et se testent sans écran.
//
// Une action ne réécrit pas le texte : elle dit quelle partie remplacer et par quoi (une « édition »). L'interface
// applique l'édition par le navigateur, ce qui garde l'historique d'annulation (Ctrl+Z).

/** Tout ce que la barre de raccourcis sait faire. */
export type Action =
  | 'titre0'
  | 'titre1'
  | 'titre2'
  | 'titre3'
  | 'titre4'
  | 'titre5'
  | 'titre6'
  | 'gras'
  | 'italique'
  | 'barre'
  | 'surligne'
  | 'souligne'
  | 'code'
  | 'citation'
  | 'puces'
  | 'numerotee'
  | 'taches'
  | 'blocCode'
  | 'separateur'
  | 'tableau'
  | 'lien'
  | 'image';

/** Une partie du texte à remplacer, et la sélection à retrouver ensuite. */
export interface Edition {
  /** Début de la partie remplacée, dans le texte d'origine. */
  de: number;
  /** Fin (exclue) de la partie remplacée, dans le texte d'origine. */
  a: number;
  /** Ce qui la remplace. */
  par: string;
  /** Début de la sélection après l'édition, dans le nouveau texte. */
  debut: number;
  /** Fin de la sélection après l'édition, dans le nouveau texte. */
  fin: number;
}

/** Le texte une fois l'édition faite. */
export function appliquerEdition(texte: string, edition: Edition): string {
  return texte.slice(0, edition.de) + edition.par + texte.slice(edition.a);
}

type Marque = 'gras' | 'italique' | 'barre' | 'surligne' | 'souligne' | 'code';

/** Les marques qui entourent un bout de texte. Le surligné et le souligné ne sont pas du Markdown standard. */
const MARQUES: Record<Marque, { ouvrant: string; fermant: string }> = {
  gras: { ouvrant: '**', fermant: '**' },
  italique: { ouvrant: '*', fermant: '*' },
  barre: { ouvrant: '~~', fermant: '~~' },
  surligne: { ouvrant: '==', fermant: '==' },
  souligne: { ouvrant: '<u>', fermant: '</u>' },
  code: { ouvrant: '`', fermant: '`' },
};

/** Les marques d'ouverture qui ne sont pas un début de gras : `*` seul est de l'italique, `**` non. */
function finitParOuvrant(marque: Marque, texte: string): boolean {
  return texte.endsWith(MARQUES[marque].ouvrant) && !(marque === 'italique' && texte.endsWith('**'));
}

function commenceParFermant(marque: Marque, texte: string): boolean {
  return texte.startsWith(MARQUES[marque].fermant) && !(marque === 'italique' && texte.startsWith('**'));
}

function commenceParOuvrant(marque: Marque, texte: string): boolean {
  return texte.startsWith(MARQUES[marque].ouvrant) && !(marque === 'italique' && texte.startsWith('**'));
}

function finitParFermant(marque: Marque, texte: string): boolean {
  return texte.endsWith(MARQUES[marque].fermant) && !(marque === 'italique' && texte.endsWith('**'));
}

const estMot = (caractere: string | undefined): boolean => caractere !== undefined && /[\p{L}\p{N}_]/u.test(caractere);

/** Le mot qui touche la position (rien s'il n'y en a pas) : c'est lui qu'on met en forme quand rien n'est sélectionné. */
function motAutour(texte: string, position: number): [number, number] {
  let debut = position;
  let fin = position;
  while (debut > 0 && estMot(texte[debut - 1])) debut -= 1;
  while (fin < texte.length && estMot(texte[fin])) fin += 1;
  return [debut, fin];
}

/** Resserre une sélection sur son texte : les espaces du bord resteraient dans les marques (`** mot **` n'est pas du gras). */
function rogner(texte: string, debut: number, fin: number): [number, number] {
  let d = debut;
  let f = fin;
  while (d < f && /\s/.test(texte[d] ?? '')) d += 1;
  while (f > d && /\s/.test(texte[f - 1] ?? '')) f -= 1;
  return [d, f];
}

function decouper(ligne: string): { gauche: string; corps: string; droite: string } {
  const lu = /^(\s*)([\s\S]*?)(\s*)$/.exec(ligne);
  return { gauche: lu?.[1] ?? '', corps: lu?.[2] ?? ligne, droite: lu?.[3] ?? '' };
}

/** Une sélection sur plusieurs lignes : chaque ligne non vide est entourée (ou libérée si toutes l'étaient). */
function encadrerLignes(marque: Marque, texte: string, debut: number, fin: number): Edition {
  const { ouvrant, fermant } = MARQUES[marque];
  const lignes = texte.slice(debut, fin).split('\n');
  const pleines = lignes.filter((ligne) => ligne.trim() !== '').map((ligne) => decouper(ligne).corps);
  const toutesEncadrees =
    pleines.length > 0 &&
    pleines.every(
      (corps) =>
        corps.length >= ouvrant.length + fermant.length &&
        commenceParOuvrant(marque, corps) &&
        finitParFermant(marque, corps),
    );
  const nouvelles = lignes.map((ligne) => {
    if (ligne.trim() === '') return ligne;
    const { gauche, corps, droite } = decouper(ligne);
    const nouveau = toutesEncadrees ? corps.slice(ouvrant.length, corps.length - fermant.length) : ouvrant + corps + fermant;
    return gauche + nouveau + droite;
  });
  const par = nouvelles.join('\n');
  return { de: debut, a: fin, par, debut, fin: debut + par.length };
}

/** Gras, italique, barré, surligné, souligné, code : entoure la sélection (ou le mot), ou retire les marques si elles y sont. */
function encadrer(marque: Marque, texte: string, debut: number, fin: number): Edition {
  const { ouvrant, fermant } = MARQUES[marque];
  if (texte.slice(debut, fin).includes('\n')) return encadrerLignes(marque, texte, debut, fin);
  const [d, f] = debut === fin ? motAutour(texte, debut) : rogner(texte, debut, fin);
  const selection = texte.slice(d, f);
  // Les marques entourent déjà la sélection, de l'extérieur : on les retire.
  if (finitParOuvrant(marque, texte.slice(0, d)) && commenceParFermant(marque, texte.slice(f))) {
    const de = d - ouvrant.length;
    return { de, a: f + fermant.length, par: selection, debut: de, fin: de + selection.length };
  }
  // Elles sont dans la sélection : on les retire aussi.
  if (
    selection.length >= ouvrant.length + fermant.length &&
    commenceParOuvrant(marque, selection) &&
    finitParFermant(marque, selection)
  ) {
    const interieur = selection.slice(ouvrant.length, selection.length - fermant.length);
    return { de: d, a: f, par: interieur, debut: d, fin: d + interieur.length };
  }
  // Sinon on les pose ; sans texte, le curseur se met entre les deux.
  const par = ouvrant + selection + fermant;
  return { de: d, a: f, par, debut: d + ouvrant.length, fin: d + ouvrant.length + selection.length };
}

/** Le début de la ligne qui contient la position. */
function debutDeLigne(texte: string, position: number): number {
  return position <= 0 ? 0 : texte.lastIndexOf('\n', position - 1) + 1;
}

/** La fin (le saut de ligne, ou la fin du texte) de la ligne qui contient la position. */
function finDeLigne(texte: string, position: number): number {
  const saut = texte.indexOf('\n', position);
  return saut === -1 ? texte.length : saut;
}

interface Plage {
  de: number;
  a: number;
  lignes: string[];
}

/** Les lignes que touche la sélection, en entier. Une sélection qui finit au début d'une ligne ne prend pas cette ligne. */
function plageLignes(texte: string, debut: number, fin: number): Plage {
  const de = debutDeLigne(texte, debut);
  const dernier = fin > debut && texte[fin - 1] === '\n' ? fin - 1 : fin;
  const a = finDeLigne(texte, dernier);
  return { de, a, lignes: texte.slice(de, a).split('\n') };
}

const estPleine = (ligne: string): boolean => ligne.trim() !== '';

/** Remplace les lignes ; sans sélection, le curseur se met à la fin de ce qui vient d'être écrit. */
function remplacerLignes(plage: Plage, nouvelles: string[], curseurSeul: boolean): Edition {
  const par = nouvelles.join('\n');
  const fin = plage.de + par.length;
  return { de: plage.de, a: plage.a, par, debut: curseurSeul ? fin : plage.de, fin };
}

/**
 * Les lignes sur lesquelles agit une action de ligne : celles qui ont du texte, ou, si aucune n'en a (le curseur sur
 * une ligne vide), toutes : c'est là qu'on écrit « # » ou « - ».
 */
function cibles(plage: Plage): (ligne: string) => boolean {
  const aucune = !plage.lignes.some(estPleine);
  return (ligne) => aucune || estPleine(ligne);
}

function titre(niveau: number, texte: string, debut: number, fin: number): Edition {
  const plage = plageLignes(texte, debut, fin);
  const cible = cibles(plage);
  const niveauDe = (ligne: string): number => /^ {0,3}(#{1,6})[ \t]/.exec(ligne)?.[1]?.length ?? 0;
  const pleines = plage.lignes.filter(estPleine);
  // Toutes les lignes ont déjà ce titre : le même raccourci le retire.
  const dejaTous = niveau > 0 && pleines.length > 0 && pleines.every((ligne) => niveauDe(ligne) === niveau);
  const nouvelles = plage.lignes.map((ligne) => {
    if (!cible(ligne)) return ligne;
    const sans = ligne.replace(/^ {0,3}#{1,6}[ \t]+/, '');
    return niveau === 0 || dejaTous ? sans : `${'#'.repeat(niveau)} ${sans}`;
  });
  return remplacerLignes(plage, nouvelles, debut === fin);
}

function citation(texte: string, debut: number, fin: number): Edition {
  const plage = plageLignes(texte, debut, fin);
  const cible = cibles(plage);
  const pleines = plage.lignes.filter(estPleine);
  const toutes = pleines.length > 0 && pleines.every((ligne) => /^\s*>/.test(ligne));
  const nouvelles = plage.lignes.map((ligne) => {
    if (!cible(ligne)) return ligne;
    return toutes ? ligne.replace(/^(\s*)>[ \t]?/, '$1') : `> ${ligne}`;
  });
  return remplacerLignes(plage, nouvelles, debut === fin);
}

const MARQUEUR_DE_LISTE = /^(\s*)(?:[-*+][ \t]+\[[ xX]\][ \t]+|[-*+][ \t]+|\d+[.)][ \t]+)/;

/** L'indentation d'une ligne et son texte, sans puce, numéro ni case à cocher. */
function sansMarqueur(ligne: string): { indentation: string; corps: string } {
  return {
    indentation: /^\s*/.exec(ligne)?.[0] ?? '',
    corps: ligne.replace(MARQUEUR_DE_LISTE, '').trimStart(),
  };
}

type GenreDeListe = 'puces' | 'numerotee' | 'taches';

const CASE_A_COCHER = /^\s*[-*+][ \t]+\[[ xX]\][ \t]+/;
const DEJA_DANS_LA_LISTE: Record<GenreDeListe, (ligne: string) => boolean> = {
  puces: (ligne) => /^\s*[-*+][ \t]+/.test(ligne) && !CASE_A_COCHER.test(ligne),
  numerotee: (ligne) => /^\s*\d+[.)][ \t]+/.test(ligne),
  taches: (ligne) => CASE_A_COCHER.test(ligne),
};

/** Puces, liste numérotée ou cases à cocher : toutes les lignes en font déjà une du même genre, on la retire ; sinon on la pose. */
function liste(genre: GenreDeListe, texte: string, debut: number, fin: number): Edition {
  const plage = plageLignes(texte, debut, fin);
  const cible = cibles(plage);
  const pleines = plage.lignes.filter(estPleine);
  const toutes = pleines.length > 0 && pleines.every(DEJA_DANS_LA_LISTE[genre]);
  let numero = 0;
  const nouvelles = plage.lignes.map((ligne) => {
    if (!cible(ligne)) return ligne;
    const { indentation, corps } = sansMarqueur(ligne);
    if (toutes) return indentation + corps;
    if (genre === 'puces') return `${indentation}- ${corps}`;
    if (genre === 'taches') return `${indentation}- [ ] ${corps}`;
    numero += 1;
    return `${indentation}${numero}. ${corps}`;
  });
  return remplacerLignes(plage, nouvelles, debut === fin);
}

const estBarriere = (ligne: string | undefined): boolean => /^\s*(```|~~~)/.test(ligne ?? '');

/** Un bloc de code autour des lignes touchées, ou rien du tout si elles en forment déjà un. */
function blocDeCode(texte: string, debut: number, fin: number): Edition {
  const plage = plageLignes(texte, debut, fin);
  const { lignes } = plage;
  if (lignes.length >= 2 && estBarriere(lignes[0]) && estBarriere(lignes[lignes.length - 1])) {
    const interieur = lignes.slice(1, -1).join('\n');
    return { de: plage.de, a: plage.a, par: interieur, debut: plage.de, fin: plage.de + interieur.length };
  }
  const corps = lignes.join('\n');
  const debutCorps = plage.de + '```\n'.length;
  return {
    de: plage.de,
    a: plage.a,
    par: '```\n' + corps + '\n```',
    debut: debutCorps,
    fin: debutCorps + corps.length,
  };
}

const OUVERTURE_DE_BLOC = /^( {0,3})(`{3,}|~{3,})(.*)$/;
const FERMETURE_DE_BLOC = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;

interface Ouverture {
  /** Début et fin (hors saut de ligne) de la ligne qui ouvre le bloc. */
  de: number;
  a: number;
  indentation: string;
  /** Les guillemets inversés ou les tildes qui ouvrent le bloc, tels qu'écrits. */
  barriere: string;
}

/**
 * La ligne d'ouverture du bloc de code que touche la sélection, ou rien. Un bloc commence par trois guillemets inversés
 * (ou tildes) et finit par une ligne de la même sorte, au moins aussi longue ; un bloc jamais refermé va jusqu'à la fin du
 * texte, comme dans l'aperçu.
 */
function ouvertureDuBlocTouche(texte: string, debut: number, fin: number): Ouverture | null {
  let position = 0;
  let ouvert: Ouverture | null = null;
  for (const ligne of texte.split('\n')) {
    const finLigne = position + ligne.length;
    if (ouvert === null) {
      const lu = OUVERTURE_DE_BLOC.exec(ligne);
      const barriere = lu?.[2] ?? '';
      // Une ouverture avec des guillemets inversés ne peut pas en avoir dans son texte : c'est alors un code en ligne.
      if (lu !== null && !(barriere.startsWith('`') && (lu[3] ?? '').includes('`'))) {
        ouvert = { de: position, a: finLigne, indentation: lu[1] ?? '', barriere };
      }
    } else {
      const fermante = FERMETURE_DE_BLOC.exec(ligne)?.[1] ?? '';
      if (fermante.startsWith(ouvert.barriere[0] ?? '') && fermante.length >= ouvert.barriere.length) {
        if (touche(ouvert.de, finLigne, debut, fin)) return ouvert;
        ouvert = null;
      }
    }
    position = finLigne + 1;
  }
  return ouvert !== null && touche(ouvert.de, texte.length, debut, fin) ? ouvert : null;
}

/** La sélection (ou le curseur) est-elle dans l'étendue [de, a] ? Une sélection qui ne fait que la frôler n'y est pas. */
function touche(de: number, a: number, debut: number, fin: number): boolean {
  return debut === fin ? debut >= de && debut <= a : debut < a && fin > de;
}

/**
 * Un bloc de code dont le langage est choisi (`js`, `python`, rien pour « sans langage »). Si la sélection touche déjà un
 * bloc, c'est son langage qui change, le code n'est pas touché ; sinon les lignes touchées sont entourées, avec le curseur
 * ou la sélection dans le code.
 */
export function blocDeCodeEn(langage: string, texte: string, debut: number, fin: number): Edition {
  const d = Math.max(0, Math.min(Math.min(debut, fin), texte.length));
  const f = Math.max(d, Math.min(Math.max(debut, fin), texte.length));
  const nom = langage.trim();
  const ouverture = ouvertureDuBlocTouche(texte, d, f);
  if (ouverture !== null) {
    const ligne = `${ouverture.indentation}${ouverture.barriere}${nom}`;
    const ancienne = texte.slice(ouverture.de, ouverture.a);
    if (ligne === ancienne) return { de: d, a: d, par: '', debut: d, fin: f };
    const ecart = ligne.length - ancienne.length;
    // Ce qui est avant la ligne ne bouge pas, ce qui est après glisse ; sur la ligne même, la sélection se range à sa fin.
    const apres = ouverture.de + ligne.length;
    const decaler = (position: number): number =>
      position <= ouverture.de ? position : position <= ouverture.a ? apres : position + ecart;
    return { de: ouverture.de, a: ouverture.a, par: ligne, debut: decaler(d), fin: decaler(f) };
  }
  const plage = plageLignes(texte, d, f);
  const corps = plage.lignes.join('\n');
  const entete = `\`\`\`${nom}\n`;
  const debutCorps = plage.de + entete.length;
  return {
    de: plage.de,
    a: plage.a,
    par: `${entete}${corps}\n\`\`\``,
    debut: debutCorps,
    fin: debutCorps + corps.length,
  };
}

/** Ce qu'il faut écrire avant un bloc posé à la fin de la ligne : une ligne vide au-dessus, pour qu'il ne se colle pas au texte. */
function separationAvant(texte: string, position: number): string {
  const debutLigne = debutDeLigne(texte, position);
  if (texte.slice(debutLigne, position).trim() !== '') return '\n\n';
  if (debutLigne === 0) return '';
  const precedente = texte.slice(debutDeLigne(texte, debutLigne - 1), debutLigne - 1);
  return precedente.trim() === '' ? '' : '\n';
}

function separateur(texte: string, fin: number): Edition {
  const position = finDeLigne(texte, fin);
  const par = `${separationAvant(texte, position)}---\n`;
  return { de: position, a: position, par, debut: position + par.length, fin: position + par.length };
}

const MODELE_DE_TABLEAU = '| Colonne 1 | Colonne 2 |\n| --- | --- |\n|  |  |';

function tableau(texte: string, fin: number): Edition {
  const position = finDeLigne(texte, fin);
  const avant = separationAvant(texte, position);
  const debut = position + avant.length + '| '.length;
  return {
    de: position,
    a: position,
    par: `${avant}${MODELE_DE_TABLEAU}\n`,
    debut,
    fin: debut + 'Colonne 1'.length,
  };
}

/**
 * Un lien ou une image : la sélection devient le texte, et « adresse » est sélectionnée pour être remplacée. Sans
 * sélection, c'est le texte (`etiquette`) qui est sélectionné ; avec une adresse sélectionnée, c'est elle qui est gardée.
 */
function adresse(prefixe: '[' | '![', etiquette: string, texte: string, debut: number, fin: number): Edition {
  const selection = texte.slice(debut, fin);
  const decalage = prefixe.length;
  if (selection === '' || /^https?:\/\/\S+$/.test(selection)) {
    const cible = selection === '' ? 'adresse' : selection;
    const par = `${prefixe}${etiquette}](${cible})`;
    return { de: debut, a: fin, par, debut: debut + decalage, fin: debut + decalage + etiquette.length };
  }
  const par = `${prefixe}${selection}](adresse)`;
  const apresTexte = debut + decalage + selection.length + 2; // « ]( »
  return { de: debut, a: fin, par, debut: apresTexte, fin: apresTexte + 'adresse'.length };
}

/** Ce que fait une action sur un texte et une sélection (`debut` et `fin` : les positions de la sélection). */
export function appliquer(action: Action, texte: string, debut: number, fin: number): Edition {
  const d = Math.max(0, Math.min(Math.min(debut, fin), texte.length));
  const f = Math.max(d, Math.min(Math.max(debut, fin), texte.length));
  switch (action) {
    case 'titre0':
      return titre(0, texte, d, f);
    case 'titre1':
      return titre(1, texte, d, f);
    case 'titre2':
      return titre(2, texte, d, f);
    case 'titre3':
      return titre(3, texte, d, f);
    case 'titre4':
      return titre(4, texte, d, f);
    case 'titre5':
      return titre(5, texte, d, f);
    case 'titre6':
      return titre(6, texte, d, f);
    case 'gras':
    case 'italique':
    case 'barre':
    case 'surligne':
    case 'souligne':
    case 'code':
      return encadrer(action, texte, d, f);
    case 'citation':
      return citation(texte, d, f);
    case 'puces':
    case 'numerotee':
    case 'taches':
      return liste(action, texte, d, f);
    case 'blocCode':
      return blocDeCode(texte, d, f);
    case 'separateur':
      return separateur(texte, f);
    case 'tableau':
      return tableau(texte, f);
    case 'lien':
      return adresse('[', 'texte', texte, d, f);
    case 'image':
      return adresse('![', 'description', texte, d, f);
  }
}

/** Les actions de titre, dans l'ordre des chiffres : Ctrl+0 retire le titre, Ctrl+1 à Ctrl+6 le posent. */
const ACTIONS_DE_TITRE: readonly Action[] = ['titre0', 'titre1', 'titre2', 'titre3', 'titre4', 'titre5', 'titre6'];

/** Ce qu'une frappe demande, ou rien : Ctrl+B, Ctrl+I, Ctrl+1 à Ctrl+6… Les chiffres suivent la touche physique, pas le clavier. */
export function raccourciVersAction(frappe: {
  key: string;
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): Action | null {
  if (!frappe.ctrlKey || frappe.altKey) return null;
  if (!frappe.shiftKey) {
    const chiffre = /^Digit([0-6])$/.exec(frappe.code)?.[1];
    if (chiffre !== undefined) return ACTIONS_DE_TITRE[Number(chiffre)] ?? null;
    switch (frappe.key.toLowerCase()) {
      case 'b':
        return 'gras';
      case 'i':
        return 'italique';
      case 'u':
        return 'souligne';
      case 'k':
        return 'lien';
      case 'e':
        return 'code';
      default:
        return null;
    }
  }
  switch (frappe.code) {
    case 'Digit7':
      return 'numerotee';
    case 'Digit8':
      return 'puces';
    case 'Digit9':
      return 'taches';
    case 'KeyX':
      return 'barre';
    case 'KeyH':
      return 'surligne';
    case 'KeyQ':
      return 'citation';
    case 'KeyE':
      return 'blocCode';
    default:
      return null;
  }
}
