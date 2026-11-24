import { describe, expect, it } from 'vitest';
import { extraireTitres, ligneDuCurseur, titreCourant, type Titre } from './plan';

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
