import { describe, expect, it } from 'vitest';
import { appliquer, appliquerEdition, raccourciVersAction, type Action } from './formatage';

/** Applique une action, et rend le texte obtenu avec ce qui est sélectionné ensuite. */
function faire(action: Action, texte: string, debut: number, fin = debut): { texte: string; selection: string } {
  const edition = appliquer(action, texte, debut, fin);
  const nouveau = appliquerEdition(texte, edition);
  return { texte: nouveau, selection: nouveau.slice(edition.debut, edition.fin) };
}

describe('mise en forme du texte', () => {
  it('entoure la sélection de gras et la garde sélectionnée', () => {
    expect(faire('gras', 'un mot ici', 3, 6)).toEqual({ texte: 'un **mot** ici', selection: 'mot' });
  });

  it('retire le gras quand les marques entourent la sélection', () => {
    expect(faire('gras', 'un **mot** ici', 5, 8)).toEqual({ texte: 'un mot ici', selection: 'mot' });
  });

  it('retire le gras quand les marques sont dans la sélection', () => {
    expect(faire('gras', 'un **mot** ici', 3, 10)).toEqual({ texte: 'un mot ici', selection: 'mot' });
  });

  it('met en forme le mot sous le curseur quand rien n’est sélectionné', () => {
    expect(faire('gras', 'un mot ici', 4)).toEqual({ texte: 'un **mot** ici', selection: 'mot' });
  });

  it('pose deux marques et met le curseur entre elles quand il n’y a pas de mot', () => {
    const resultat = faire('gras', 'a  b', 2);
    expect(resultat.texte).toBe('a **** b');
    expect(resultat.selection).toBe('');
    expect(appliquer('gras', 'a  b', 2, 2).debut).toBe(4);
  });

  it('laisse les espaces du bord hors des marques', () => {
    expect(faire('gras', 'un mot ici', 2, 7).texte).toBe('un **mot** ici');
  });

  it('ne prend pas un gras pour de l’italique, et inversement', () => {
    expect(faire('italique', '**x**', 2, 3)).toEqual({ texte: '***x***', selection: 'x' });
    expect(faire('italique', '*x*', 1, 2)).toEqual({ texte: 'x', selection: 'x' });
  });

  it('met en forme et libère le souligné, le surligné, le barré et le code', () => {
    expect(faire('souligne', 'mot', 0, 3)).toEqual({ texte: '<u>mot</u>', selection: 'mot' });
    expect(faire('souligne', '<u>mot</u>', 3, 6).texte).toBe('mot');
    expect(faire('surligne', 'mot', 0, 3).texte).toBe('==mot==');
    expect(faire('barre', 'mot', 0, 3).texte).toBe('~~mot~~');
    expect(faire('code', 'mot', 0, 3).texte).toBe('`mot`');
  });

  it('met en forme chaque ligne d’une sélection de plusieurs lignes, et la libère de même', () => {
    expect(faire('gras', 'a\nb', 0, 3).texte).toBe('**a**\n**b**');
    expect(faire('gras', 'a\n\nb', 0, 4).texte).toBe('**a**\n\n**b**');
    expect(faire('gras', '  a\n  b', 0, 7).texte).toBe('  **a**\n  **b**');
    expect(faire('gras', '**a**\n**b**', 0, 11).texte).toBe('a\nb');
  });

  it('ramène une position hors du texte dans le texte et accepte une sélection à l’envers', () => {
    expect(faire('gras', 'ab', 5, 9).texte).toBe('**ab**');
    expect(faire('gras', 'un mot', 6, 3).texte).toBe('un **mot**');
  });
});

describe('titres', () => {
  it('pose un titre sur la ligne du curseur', () => {
    expect(faire('titre2', 'un titre\nsuite', 3).texte).toBe('## un titre\nsuite');
  });

  it('remplace le niveau d’un titre qui existe déjà', () => {
    expect(faire('titre1', '## x', 0).texte).toBe('# x');
  });

  it('retire le titre quand le même raccourci revient, ou avec « Texte »', () => {
    expect(faire('titre1', '# x', 0).texte).toBe('x');
    expect(faire('titre0', '### x', 0).texte).toBe('x');
  });

  it('met un titre sur chaque ligne non vide d’une sélection', () => {
    expect(faire('titre1', 'a\n\nb', 0, 4).texte).toBe('# a\n\n# b');
  });

  it('écrit le marqueur sur une ligne vide', () => {
    expect(faire('titre1', '', 0).texte).toBe('# ');
  });

  it('ne prend pas la ligne suivante quand la sélection finit à son début', () => {
    expect(faire('titre1', 'a\nb', 0, 2).texte).toBe('# a\nb');
  });
});

describe('citations et listes', () => {
  it('met en citation, puis retire la citation', () => {
    expect(faire('citation', 'a\nb', 0, 3).texte).toBe('> a\n> b');
    expect(faire('citation', '> a\n> b', 0, 7).texte).toBe('a\nb');
  });

  it('met en puces, puis retire les puces', () => {
    expect(faire('puces', 'un\ndeux', 0, 7).texte).toBe('- un\n- deux');
    expect(faire('puces', '- un\n- deux', 0, 11).texte).toBe('un\ndeux');
  });

  it('change une liste numérotée ou à cocher en puces', () => {
    expect(faire('puces', '1. un\n2. deux', 0, 13).texte).toBe('- un\n- deux');
    expect(faire('puces', '- [ ] a', 0, 7).texte).toBe('- a');
  });

  it('numérote les lignes non vides', () => {
    expect(faire('numerotee', 'un\n\ndeux\ntrois', 0, 13).texte).toBe('1. un\n\n2. deux\n3. trois');
  });

  it('pose des cases à cocher, puis les retire, cochées ou non', () => {
    expect(faire('taches', 'un\ndeux', 0, 7).texte).toBe('- [ ] un\n- [ ] deux');
    expect(faire('taches', '- [x] un', 0, 8).texte).toBe('un');
  });

  it('garde l’indentation', () => {
    expect(faire('puces', '  un', 0).texte).toBe('  - un');
  });

  it('écrit la puce sur une ligne vide', () => {
    expect(faire('puces', '', 0).texte).toBe('- ');
  });
});

describe('blocs et insertions', () => {
  it('entoure les lignes d’un bloc de code, puis le retire', () => {
    expect(faire('blocCode', 'a\nb', 0, 3)).toEqual({ texte: '```\na\nb\n```', selection: 'a\nb' });
    expect(faire('blocCode', '```\na\nb\n```', 0, 11).texte).toBe('a\nb');
  });

  it('ouvre un bloc de code vide avec le curseur dedans', () => {
    const resultat = faire('blocCode', '', 0);
    expect(resultat.texte).toBe('```\n\n```');
    expect(appliquer('blocCode', '', 0, 0).debut).toBe(4);
  });

  it('pose un séparateur avec une ligne vide au-dessus', () => {
    expect(faire('separateur', 'texte', 2).texte).toBe('texte\n\n---\n');
    expect(faire('separateur', 'a\n', 2).texte).toBe('a\n\n---\n');
    expect(faire('separateur', 'a\n\n', 3).texte).toBe('a\n\n---\n');
  });

  it('pose un tableau sous la ligne et sélectionne le nom de la première colonne', () => {
    const resultat = faire('tableau', 'texte', 5);
    expect(resultat.texte).toBe('texte\n\n| Colonne 1 | Colonne 2 |\n| --- | --- |\n|  |  |\n');
    expect(resultat.selection).toBe('Colonne 1');
  });

  it('écrit un lien, avec « adresse » sélectionnée quand le texte existe', () => {
    expect(faire('lien', '', 0)).toEqual({ texte: '[texte](adresse)', selection: 'texte' });
    expect(faire('lien', 'voir ici', 5, 8)).toEqual({ texte: 'voir [ici](adresse)', selection: 'adresse' });
  });

  it('garde une adresse sélectionnée comme adresse du lien', () => {
    expect(faire('lien', 'https://exemple.fr', 0, 18)).toEqual({
      texte: '[texte](https://exemple.fr)',
      selection: 'texte',
    });
  });

  it('écrit une image', () => {
    expect(faire('image', '', 0)).toEqual({ texte: '![description](adresse)', selection: 'description' });
    expect(faire('image', 'photo', 0, 5)).toEqual({ texte: '![photo](adresse)', selection: 'adresse' });
  });
});

describe('raccourcis clavier', () => {
  const frappe = (key: string, code: string, ctrlKey = true, shiftKey = false, altKey = false) => ({
    key,
    code,
    ctrlKey,
    shiftKey,
    altKey,
  });

  it('reconnaît les raccourcis de texte', () => {
    expect(raccourciVersAction(frappe('b', 'KeyB'))).toBe('gras');
    expect(raccourciVersAction(frappe('i', 'KeyI'))).toBe('italique');
    expect(raccourciVersAction(frappe('u', 'KeyU'))).toBe('souligne');
    expect(raccourciVersAction(frappe('k', 'KeyK'))).toBe('lien');
    expect(raccourciVersAction(frappe('e', 'KeyE'))).toBe('code');
  });

  it('suit la touche physique pour les chiffres, même sur un clavier où il faut Maj pour un chiffre', () => {
    // Sur un clavier français, Ctrl+3 donne la touche « " » : seul le code de la touche dit que c'est le 3.
    expect(raccourciVersAction(frappe('"', 'Digit3'))).toBe('titre3');
    expect(raccourciVersAction(frappe('à', 'Digit0'))).toBe('titre0');
    expect(raccourciVersAction(frappe('7', 'Digit7', true, true))).toBe('numerotee');
    expect(raccourciVersAction(frappe('8', 'Digit8', true, true))).toBe('puces');
  });

  it('reconnaît les raccourcis à trois touches', () => {
    expect(raccourciVersAction(frappe('X', 'KeyX', true, true))).toBe('barre');
    expect(raccourciVersAction(frappe('H', 'KeyH', true, true))).toBe('surligne');
    expect(raccourciVersAction(frappe('Q', 'KeyQ', true, true))).toBe('citation');
    expect(raccourciVersAction(frappe('E', 'KeyE', true, true))).toBe('blocCode');
  });

  it('ignore ce qui n’est pas un raccourci', () => {
    expect(raccourciVersAction(frappe('b', 'KeyB', false))).toBeNull();
    expect(raccourciVersAction(frappe('b', 'KeyB', true, false, true))).toBeNull();
    expect(raccourciVersAction(frappe('B', 'KeyB', true, true))).toBeNull();
    expect(raccourciVersAction(frappe('7', 'Digit7'))).toBeNull();
    expect(raccourciVersAction(frappe('s', 'KeyS'))).toBeNull();
  });
});
