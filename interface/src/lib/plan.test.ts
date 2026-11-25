import { describe, expect, it } from 'vitest';
import {
  aDesSousTitres,
  cleDeTitre,
  clesRepliables,
  extraireTitres,
  indicesVisibles,
  ligneDuCurseur,
  normaliser,
  numeros,
  titreCourant,
  type Titre,
} from './plan';

const textes = (contenu: string): string[] => extraireTitres(contenu).map((t) => t.texte);

describe('plan du document', () => {
  it('liste les titres avec leur niveau, leur ligne et l’endroit où ils commencent', () => {
    const titres = extraireTitres('# Un\n\ntexte\n\n## Deux\n### Trois');
    expect(titres.map((t) => [t.niveau, t.texte, t.ligne, t.debut])).toEqual([
      [1, 'Un', 0, 0],
      [2, 'Deux', 4, 13],
      [3, 'Trois', 5, 21],
    ]);
  });

  it('ignore les titres écrits dans un bloc de code', () => {
    expect(textes('```\n# faux\n```\n# vrai')).toEqual(['vrai']);
    expect(textes('~~~\n# faux\n~~~')).toEqual([]);
    expect(textes('````\n```\n# faux\n````\n# vrai')).toEqual(['vrai']);
  });

  it('ne prend pas du code en ligne en début de ligne pour un bloc de code', () => {
    expect(textes('```code``` du texte\n# vrai')).toEqual(['vrai']);
  });

  it('retire les dièses de fermeture et la mise en forme', () => {
    expect(textes('# Titre ##')).toEqual(['Titre']);
    expect(textes('## **Gras** et `code` [lien](http://x)')).toEqual(['Gras et code lien']);
  });

  it('ignore un titre vide et plus de six dièses', () => {
    expect(textes('#\n# \n# a')).toEqual(['a']);
    expect(textes('####### sept')).toEqual([]);
  });

  it('ne prend pas du code indenté de quatre espaces pour un titre', () => {
    expect(textes('    # code')).toEqual([]);
  });

  it('lit les titres soulignés par === ou ---', () => {
    const titres = extraireTitres('Titre\n=====\n\nSous\n-----');
    expect(titres.map((t) => [t.niveau, t.texte, t.ligne])).toEqual([
      [1, 'Titre', 0],
      [2, 'Sous', 3],
    ]);
  });

  it('ne prend pas une ligne de séparation, une puce ou un tableau pour un titre souligné', () => {
    expect(textes('texte\n\n---\n')).toEqual([]);
    expect(textes('- item\n---')).toEqual([]);
    expect(textes('a | b\n--- | ---')).toEqual([]);
  });

  it('ignore l’en-tête YAML du début', () => {
    expect(textes('---\ntitre: x\n---\n# Vrai')).toEqual(['Vrai']);
    expect(textes('---\n# a')).toEqual(['a']);
  });

  it('trouve la ligne où se trouve la position', () => {
    const texte = 'a\nbc\nd';
    expect([0, 1, 2, 4, 5].map((p) => ligneDuCurseur(texte, p))).toEqual([0, 0, 1, 1, 2]);
    expect(ligneDuCurseur(texte, 99)).toBe(2);
    expect(ligneDuCurseur(texte, -3)).toBe(0);
  });

  it('trouve le titre sous lequel se trouve une ligne', () => {
    const titre = (ligne: number): Titre => ({ niveau: 1, texte: 't', ligne, debut: 0 });
    const titres = [titre(0), titre(4), titre(5)];
    expect([0, 3, 4, 9].map((ligne) => titreCourant(titres, ligne))).toEqual([0, 0, 1, 2]);
    expect(titreCourant([titre(2)], 1)).toBe(-1);
    expect(titreCourant([], 3)).toBe(-1);
  });
});

describe('plan enrichi : numéros, replis et recherche', () => {
  const doc = '# A\n## B\n### C\n## D\n# E\n## F\n';
  const titres = extraireTitres(doc);

  it('numérote selon la place dans l’arbre', () => {
    expect(numeros(titres)).toEqual(['1', '1.1', '1.1.1', '1.2', '2', '2.1']);
  });

  it('ne laisse pas de trou quand un niveau est sauté', () => {
    expect(numeros(extraireTitres('# A\n### B\n## C\n# D\n#### E'))).toEqual(['1', '1.1', '1.2', '2', '2.1']);
    expect(numeros(extraireTitres('## A\n# B\n## C'))).toEqual(['1', '2', '2.1']);
  });

  it('repart de 1 sous chaque nouveau parent', () => {
    expect(numeros(extraireTitres('# A\n## a\n## b\n# B\n## c'))).toEqual(['1', '1.1', '1.2', '2', '2.1']);
  });

  it('sait quels titres ont des sous-titres', () => {
    expect(titres.map((_, i) => aDesSousTitres(titres, i))).toEqual([true, true, false, false, true, false]);
  });

  it('donne une clé qui distingue deux titres identiques', () => {
    const doubles = extraireTitres('# A\n## Notes\n# B\n## Notes');
    expect(cleDeTitre(doubles, 1)).not.toBe(cleDeTitre(doubles, 3));
    expect(cleDeTitre(doubles, 5)).toBe('');
  });

  it('garde la clé d’un titre quand on écrit au-dessus', () => {
    const avant = extraireTitres('# A\n## Notes');
    const apres = extraireTitres('# Nouveau\n\ntexte\n\n# A\n## Notes');
    expect(cleDeTitre(avant, 1)).toBe(cleDeTitre(apres, 2));
  });

  it('liste les clés des titres repliables', () => {
    expect(clesRepliables(titres)).toEqual([cleDeTitre(titres, 0), cleDeTitre(titres, 1), cleDeTitre(titres, 4)]);
  });

  it('montre tous les titres quand rien n’est replié', () => {
    expect(indicesVisibles(titres, new Set(), '')).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('cache les sous-titres d’un titre replié, jusqu’au prochain de son niveau ou plus haut', () => {
    expect(indicesVisibles(titres, new Set([cleDeTitre(titres, 1)]), '')).toEqual([0, 1, 3, 4, 5]);
    expect(indicesVisibles(titres, new Set([cleDeTitre(titres, 0)]), '')).toEqual([0, 4, 5]);
    expect(indicesVisibles(titres, new Set([cleDeTitre(titres, 0), cleDeTitre(titres, 4)]), '')).toEqual([0, 4]);
  });

  it('ignore le repli d’un titre qui n’a plus de sous-titres', () => {
    const seul = extraireTitres('# A\n# B');
    expect(indicesVisibles(seul, new Set([cleDeTitre(seul, 0)]), '')).toEqual([0, 1]);
  });

  it('cherche sans tenir compte des majuscules ni des accents, et sans tenir compte des replis', () => {
    const lettres = extraireTitres('# Écrire un Plan\n## Détails\n## Autre\n# Résumé');
    expect(indicesVisibles(lettres, new Set(), 'ecrire')).toEqual([0]);
    expect(indicesVisibles(lettres, new Set(), ' RÉSUMÉ ')).toEqual([3]);
    expect(indicesVisibles(lettres, new Set([cleDeTitre(lettres, 0)]), 'detail')).toEqual([1]);
    expect(indicesVisibles(lettres, new Set(), 'zzz')).toEqual([]);
  });

  it('normalise les accents et la casse', () => {
    expect(normaliser('Éléphant ÇA')).toBe('elephant ca');
  });
});
