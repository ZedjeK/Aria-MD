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

/**
 * Les numéros des titres, « 1 », « 1.1 », « 1.2.1 »…, selon leur place dans l'arbre : un titre est le fils du dernier titre de
 * niveau plus petit. Un niveau sauté (un H3 sous un H1) ne laisse pas de trou : il compte comme un fils direct.
 */
export function numeros(titres: Titre[]): string[] {
  const compteurs: number[] = [];
  const pile: number[] = [];
  return titres.map((titre) => {
    while (pile.length > 0 && (pile[pile.length - 1] ?? 0) >= titre.niveau) pile.pop();
    const profondeur = pile.length;
    pile.push(titre.niveau);
    compteurs.length = profondeur + 1;
    compteurs[profondeur] = (compteurs[profondeur] ?? 0) + 1;
    return compteurs.join('.');
  });
}

/** Le titre a-t-il des sous-titres ? C'est le cas si le suivant est d'un niveau plus profond. */
export function aDesSousTitres(titres: Titre[], indice: number): boolean {
  return (titres[indice + 1]?.niveau ?? 0) > (titres[indice]?.niveau ?? 0);
}

/**
 * Ce qui identifie un titre quand le texte change : son niveau, son texte, et combien de titres identiques le précèdent.
 * Un titre replié le reste quand on écrit au-dessus ; renommé, il est déplié.
 */
export function cleDeTitre(titres: Titre[], indice: number): string {
  const titre = titres[indice];
  if (titre === undefined) return '';
  let avant = 0;
  for (let i = 0; i < indice; i += 1) {
    if (titres[i]?.niveau === titre.niveau && titres[i]?.texte === titre.texte) avant += 1;
  }
  return `${titre.niveau}|${titre.texte}|${avant}`;
}

/** Les clés de tous les titres qui ont des sous-titres : de quoi tout replier d'un geste. */
export function clesRepliables(titres: Titre[]): string[] {
  const cles: string[] = [];
  for (let i = 0; i < titres.length; i += 1) {
    if (aDesSousTitres(titres, i)) cles.push(cleDeTitre(titres, i));
  }
  return cles;
}

/** Le texte sans majuscules ni accents : « Écrire » est trouvé par « ecrire ». */
export function normaliser(texte: string): string {
  return texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Les titres à montrer, par leur indice. Avec une recherche : ceux dont le texte la contient, à plat, sans tenir compte des
 * replis. Sans recherche : tous, sauf les sous-titres des titres repliés.
 */
export function indicesVisibles(titres: Titre[], replies: ReadonlySet<string>, recherche: string): number[] {
  const voulu = normaliser(recherche.trim());
  const visibles: number[] = [];
  if (voulu !== '') {
    titres.forEach((titre, i) => {
      if (normaliser(titre.texte).includes(voulu)) visibles.push(i);
    });
    return visibles;
  }
  // Sous un titre replié, tout ce qui est plus profond que lui est caché, jusqu'au prochain titre de son niveau ou plus haut.
  let cacheSousNiveau: number | null = null;
  for (let i = 0; i < titres.length; i += 1) {
    const titre = titres[i];
    if (titre === undefined) continue;
    if (cacheSousNiveau !== null && titre.niveau > cacheSousNiveau) continue;
    cacheSousNiveau = null;
    visibles.push(i);
    if (aDesSousTitres(titres, i) && replies.has(cleDeTitre(titres, i))) cacheSousNiveau = titre.niveau;
  }
  return visibles;
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
