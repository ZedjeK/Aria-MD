// Le plan d'un document : ses titres, pour la barre latérale. Des fonctions pures, testées sans écran.

/** Un titre du document. */
export interface Titre {
  /** 1 à 6. */
  niveau: number;
  /** Le texte du titre, sans les marques de mise en forme. */
  texte: string;
  /** Le numéro de sa ligne, à partir de 0. */
  ligne: number;
  /** Où commence sa ligne dans le texte. */
  debut: number;
}

/** Le texte d'un titre tel qu'on l'affiche : sans gras, code, barré, surligné ni lien. */
function nettoyer(texte: string): string {
  return texte
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<\/?u>/g, '')
    .replace(/~~|==/g, '')
    .replace(/[*`]/g, '')
    .trim();
}

/** Les lignes d'un en-tête YAML (entre deux `---` au tout début) : ce ne sont pas des titres. */
export function finDeLEnTete(lignes: string[]): number {
  if ((lignes[0] ?? '').trim() !== '---') return -1;
  for (let i = 1; i < lignes.length; i += 1) {
    const ligne = (lignes[i] ?? '').trim();
    if (ligne === '---' || ligne === '...') return i;
  }
  return -1;
}

/** Une ligne qui ne peut pas être le texte d'un titre à soulignement (liste, citation, tableau, code, titre…). */
const PAS_UN_TEXTE_DE_TITRE = /^\s*([-*+>#|]|\d+[.)]|```|~~~|<)/;

/**
 * Les titres d'un document, dans l'ordre : `# Titre` (de 1 à 6 dièses) et les titres soulignés par `===` ou `---`. Ni les
 * blocs de code ni l'en-tête YAML n'en contiennent.
 */
export function extraireTitres(contenu: string): Titre[] {
  const lignes = contenu.split('\n');
  const titres: Titre[] = [];
  const finEnTete = finDeLEnTete(lignes);
  let barriere: string | null = null;
  let debut = 0;
  for (let i = 0; i < lignes.length; i += 1) {
    const ligne = lignes[i] ?? '';
    const debutDeLigne = debut;
    debut += ligne.length + 1;
    if (i <= finEnTete) continue;

    const rencontre = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(ligne);
    if (barriere !== null) {
      // Une barrière ferme le bloc si elle est de la même sorte, au moins aussi longue, et seule sur sa ligne.
      const ferme = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(ligne)?.[1];
      if (ferme !== undefined && ferme.startsWith(barriere.charAt(0)) && ferme.length >= barriere.length) barriere = null;
      continue;
    }
    // Une barrière de guillemets inversés ne peut pas avoir de guillemet inversé après elle : ce serait du code en ligne.
    const marque = rencontre?.[1];
    if (marque !== undefined && !(marque.startsWith('`') && (rencontre?.[2] ?? '').includes('`'))) {
      barriere = marque;
      continue;
    }

    const dieses = /^ {0,3}(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/.exec(ligne);
    const niveauDieses = dieses?.[1]?.length;
    if (niveauDieses !== undefined) {
      const texte = nettoyer(dieses?.[2] ?? '');
      if (texte !== '') titres.push({ niveau: niveauDieses, texte, ligne: i, debut: debutDeLigne });
      continue;
    }

    if (ligne.trim() !== '' && !PAS_UN_TEXTE_DE_TITRE.test(ligne)) {
      const suivante = lignes[i + 1] ?? '';
      const niveau = /^ {0,3}=+[ \t]*$/.test(suivante) ? 1 : /^ {0,3}-+[ \t]*$/.test(suivante) ? 2 : 0;
      const texte = nettoyer(ligne);
      if (niveau > 0 && texte !== '') titres.push({ niveau, texte, ligne: i, debut: debutDeLigne });
    }
  }
  return titres;
}

/** Le numéro de la ligne (à partir de 0) où se trouve la position dans le texte. */
export function ligneDuCurseur(contenu: string, position: number): number {
  let lignes = 0;
  const fin = Math.min(Math.max(position, 0), contenu.length);
  let saut = contenu.indexOf('\n');
  while (saut !== -1 && saut < fin) {
    lignes += 1;
    saut = contenu.indexOf('\n', saut + 1);
  }
  return lignes;
}

/** Le titre sous lequel se trouve une ligne : le dernier à ne pas la dépasser. -1 avant le premier titre. */
export function titreCourant(titres: Titre[], ligne: number): number {
  let courant = -1;
  for (let i = 0; i < titres.length; i += 1) {
    if ((titres[i]?.ligne ?? Number.POSITIVE_INFINITY) <= ligne) courant = i;
    else break;
  }
  return courant;
}
