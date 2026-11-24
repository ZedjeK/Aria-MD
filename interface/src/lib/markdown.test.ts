import { describe, expect, it } from 'vitest';
import { analyser, analyserEnLigne, textePlat, type Bloc, type EnLigne, type Item } from './markdown';

const t = (texte: string): EnLigne => ({ type: 'texte', texte });
const gras = (...enfants: EnLigne[]): EnLigne => ({ type: 'gras', enfants });
const italique = (...enfants: EnLigne[]): EnLigne => ({ type: 'italique', enfants });
const para = (ligne: number, ...enfants: EnLigne[]): Bloc => ({ type: 'paragraphe', enfants, ligne });
const titre = (niveau: number, ligne: number, ...enfants: EnLigne[]): Bloc => ({ type: 'titre', niveau, enfants, ligne });
const item = (enfants: Bloc[], tache: boolean | null = null): Item => ({ enfants, tache });

describe('texte en ligne', () => {
  it('garde le texte simple tel quel', () => {
    expect(analyserEnLigne('bonjour')).toEqual([t('bonjour')]);
    expect(analyserEnLigne('')).toEqual([]);
  });

  it('lit le gras, l’italique, le barré, le surligné et le souligné', () => {
    expect(analyserEnLigne('**gras**')).toEqual([gras(t('gras'))]);
    expect(analyserEnLigne('__gras__')).toEqual([gras(t('gras'))]);
    expect(analyserEnLigne('*it*')).toEqual([italique(t('it'))]);
    expect(analyserEnLigne('_it_')).toEqual([italique(t('it'))]);
    expect(analyserEnLigne('~~x~~')).toEqual([{ type: 'barre', enfants: [t('x')] }]);
    expect(analyserEnLigne('==x==')).toEqual([{ type: 'surligne', enfants: [t('x')] }]);
    expect(analyserEnLigne('<u>x</u>')).toEqual([{ type: 'souligne', enfants: [t('x')] }]);
  });

  it('met en forme au milieu d’une phrase', () => {
    expect(analyserEnLigne('a **b** c')).toEqual([t('a '), gras(t('b')), t(' c')]);
  });

  it('lit un gras et un italique ensemble, de l’un dans l’autre', () => {
    expect(analyserEnLigne('***a***')).toEqual([italique(gras(t('a')))]);
    expect(analyserEnLigne('**a *b* c**')).toEqual([gras(t('a '), italique(t('b')), t(' c'))]);
  });

  it('ne fait pas d’emphase d’un tiret bas au milieu d’un mot ni d’une étoile entourée d’espaces', () => {
    expect(analyserEnLigne('un_mot_ici')).toEqual([t('un_mot_ici')]);
    expect(analyserEnLigne('2 * 3 * 4')).toEqual([t('2 * 3 * 4')]);
  });

  it('laisse en texte une marque sans partenaire', () => {
    expect(analyserEnLigne('**a')).toEqual([t('**a')]);
    expect(analyserEnLigne('a <u>b')).toEqual([t('a <u>b')]);
    expect(analyserEnLigne('a ~b~')).toEqual([t('a ~b~')]);
  });

  it('lit le code en ligne, sans mise en forme dedans', () => {
    expect(analyserEnLigne('a `x*y*` b')).toEqual([t('a '), { type: 'code', texte: 'x*y*' }, t(' b')]);
    expect(analyserEnLigne('``a`b``')).toEqual([{ type: 'code', texte: 'a`b' }]);
    expect(analyserEnLigne('`seul')).toEqual([t('`seul')]);
  });

  it('prend un caractère protégé par une barre oblique inverse comme du texte', () => {
    expect(analyserEnLigne('\\*pas\\*')).toEqual([t('*pas*')]);
  });

  it('lit les liens, avec ou sans titre, et leur mise en forme', () => {
    expect(analyserEnLigne('[texte](http://x.fr)')).toEqual([{ type: 'lien', enfants: [t('texte')], adresse: 'http://x.fr' }]);
    expect(analyserEnLigne('[t](http://x "Titre")')).toEqual([{ type: 'lien', enfants: [t('t')], adresse: 'http://x' }]);
    expect(analyserEnLigne('[**g**](u)')).toEqual([{ type: 'lien', enfants: [gras(t('g'))], adresse: 'u' }]);
  });

  it('lit les images', () => {
    expect(analyserEnLigne('![alt text](a.png)')).toEqual([{ type: 'image', alt: 'alt text', adresse: 'a.png' }]);
  });

  it('laisse en texte des crochets qui ne font pas un lien', () => {
    expect(analyserEnLigne('[note]')).toEqual([t('[note]')]);
    expect(analyserEnLigne('[a] (b)')).toEqual([t('[a] (b)')]);
  });

  it('lit les adresses entre chevrons et les adresses nues', () => {
    expect(analyserEnLigne('<https://x.fr>')).toEqual([{ type: 'lien', enfants: [t('https://x.fr')], adresse: 'https://x.fr' }]);
    expect(analyserEnLigne('voir https://x.fr/a.')).toEqual([
      t('voir '),
      { type: 'lien', enfants: [t('https://x.fr/a')], adresse: 'https://x.fr/a' },
      t('.'),
    ]);
  });

  it('lit les sauts de ligne forcés et les retours à la ligne simples', () => {
    expect(analyserEnLigne('a  \nb')).toEqual([t('a'), { type: 'saut' }, t('b')]);
    expect(analyserEnLigne('a\\\nb')).toEqual([t('a'), { type: 'saut' }, t('b')]);
    expect(analyserEnLigne('a\nb')).toEqual([t('a b')]);
  });

  it('ne prend pas du HTML pour autre chose que du texte', () => {
    expect(analyserEnLigne('<div>x</div>')).toEqual([t('<div>x</div>')]);
    expect(analyserEnLigne('<script>alert(1)</script>')).toEqual([t('<script>alert(1)</script>')]);
  });

  it('donne le texte brut d’une mise en forme', () => {
    expect(textePlat(analyserEnLigne('a **b** [c](u) ![d](v)'))).toBe('a b c d');
  });
});

describe('titres et paragraphes', () => {
  it('lit un titre avec sa ligne', () => {
    expect(analyser('# Titre')).toEqual([titre(1, 0, t('Titre'))]);
  });

  it('retire les dièses de fermeture et accepte un titre vide', () => {
    expect(analyser('## A ##')).toEqual([titre(2, 0, t('A'))]);
    expect(analyser('#')).toEqual([titre(1, 0)]);
  });

  it('ne prend pas sept dièses ni un dièse collé au texte pour un titre', () => {
    expect(analyser('####### x')).toEqual([para(0, t('####### x'))]);
    expect(analyser('#hashtag')).toEqual([para(0, t('#hashtag'))]);
  });

  it('met en forme le texte d’un titre', () => {
    expect(analyser('# **A**')).toEqual([titre(1, 0, gras(t('A')))]);
  });

  it('sépare les paragraphes par une ligne vide et joint les lignes d’un même paragraphe', () => {
    expect(analyser('a\n\nb')).toEqual([para(0, t('a')), para(2, t('b'))]);
    expect(analyser('a\nb')).toEqual([para(0, t('a b'))]);
  });

  it('lit les titres soulignés', () => {
    expect(analyser('Titre\n===')).toEqual([titre(1, 0, t('Titre'))]);
    expect(analyser('Sous\n---')).toEqual([titre(2, 0, t('Sous'))]);
  });

  it('lit les séparateurs', () => {
    for (const ligne of ['---', '***', '___', '- - -']) {
      expect(analyser(ligne), ligne).toEqual([{ type: 'separateur', ligne: 0 }]);
    }
  });

  it('accepte les fins de ligne de Windows et un document vide', () => {
    expect(analyser('a\r\n\r\nb')).toEqual([para(0, t('a')), para(2, t('b'))]);
    expect(analyser('')).toEqual([]);
  });

  it('lit l’en-tête YAML comme un bloc à part, et numérote ensuite les lignes du document', () => {
    expect(analyser('---\ntitre: x\n---\n# T')).toEqual([
      { type: 'code', langage: 'yaml', texte: 'titre: x', ligne: 0 },
      titre(1, 3, t('T')),
    ]);
  });
});

describe('blocs de code', () => {
  it('lit un bloc de code et son langage', () => {
    expect(analyser('```js\nlet a;\n```')).toEqual([{ type: 'code', langage: 'js', texte: 'let a;', ligne: 0 }]);
  });

  it('ferme un bloc resté ouvert à la fin du texte', () => {
    expect(analyser('```\nabc')).toEqual([{ type: 'code', langage: '', texte: 'abc', ligne: 0 }]);
  });

  it('ne lit pas un titre dans un bloc de code', () => {
    expect(analyser('```\n# x\n```')).toEqual([{ type: 'code', langage: '', texte: '# x', ligne: 0 }]);
  });

  it('ne ferme un bloc que par une barrière aussi longue, de la même sorte', () => {
    expect(analyser('````\n```\nx\n````')).toEqual([{ type: 'code', langage: '', texte: '```\nx', ligne: 0 }]);
    expect(analyser('~~~\na\n~~~')).toEqual([{ type: 'code', langage: '', texte: 'a', ligne: 0 }]);
  });
});

describe('citations', () => {
  it('lit une citation, et ses blocs', () => {
    expect(analyser('> a\n> b')).toEqual([{ type: 'citation', enfants: [para(0, t('a b'))], ligne: 0 }]);
    expect(analyser('> # T')).toEqual([{ type: 'citation', enfants: [titre(1, 0, t('T'))], ligne: 0 }]);
  });

  it('lit une citation dans une citation', () => {
    expect(analyser('> > a')).toEqual([
      { type: 'citation', enfants: [{ type: 'citation', enfants: [para(0, t('a'))], ligne: 0 }], ligne: 0 },
    ]);
  });

  it('prolonge la citation par une ligne sans « > »', () => {
    expect(analyser('> a\nb')).toEqual([{ type: 'citation', enfants: [para(0, t('a b'))], ligne: 0 }]);
  });

  it('numérote les lignes des blocs d’une citation par rapport au document', () => {
    expect(analyser('> a\n>\n> # T')).toEqual([
      { type: 'citation', enfants: [para(0, t('a')), titre(1, 2, t('T'))], ligne: 0 },
    ]);
  });
});

describe('listes', () => {
  it('lit une liste à puces', () => {
    expect(analyser('- a\n- b')).toEqual([
      {
        type: 'liste',
        ordonnee: false,
        debut: 1,
        serree: true,
        items: [item([para(0, t('a'))]), item([para(1, t('b'))])],
        ligne: 0,
      },
    ]);
  });

  it('lit une liste numérotée et son premier numéro', () => {
    const liste = analyser('3. a\n4. b')[0];
    expect(liste).toMatchObject({ type: 'liste', ordonnee: true, debut: 3 });
  });

  it('lit les cases à cocher, cochées ou non', () => {
    expect(analyser('- [ ] a\n- [x] b')).toEqual([
      {
        type: 'liste',
        ordonnee: false,
        debut: 1,
        serree: true,
        items: [item([para(0, t('a'))], false), item([para(1, t('b'))], true)],
        ligne: 0,
      },
    ]);
  });

  it('lit une liste dans une liste', () => {
    expect(analyser('- a\n  - b\n- c')).toEqual([
      {
        type: 'liste',
        ordonnee: false,
        debut: 1,
        serree: true,
        items: [
          item([
            para(0, t('a')),
            { type: 'liste', ordonnee: false, debut: 1, serree: true, items: [item([para(1, t('b'))])], ligne: 1 },
          ]),
          item([para(2, t('c'))]),
        ],
        ligne: 0,
      },
    ]);
  });

  it('dit qu’une liste est aérée quand des lignes vides séparent ses éléments ou ses blocs', () => {
    expect(analyser('- a\n\n- b')[0]).toMatchObject({ type: 'liste', serree: false });
    expect(analyser('- a\n\n  b')).toEqual([
      { type: 'liste', ordonnee: false, debut: 1, serree: false, items: [item([para(0, t('a')), para(2, t('b'))])], ligne: 0 },
    ]);
  });

  it('lit un bloc de code dans un élément de liste', () => {
    const liste = analyser('- a\n\n  ```\n  x\n  ```')[0];
    expect(liste).toMatchObject({ type: 'liste' });
    if (liste?.type !== 'liste') throw new Error('une liste était attendue');
    expect(liste.items[0]?.enfants[1]).toEqual({ type: 'code', langage: '', texte: 'x', ligne: 2 });
  });

  it('commence une liste sous un paragraphe, mais pas avec un numéro autre que 1', () => {
    expect(analyser('texte\n- a')).toEqual([
      para(0, t('texte')),
      { type: 'liste', ordonnee: false, debut: 1, serree: true, items: [item([para(1, t('a'))])], ligne: 1 },
    ]);
    expect(analyser('texte\n2. x')).toEqual([para(0, t('texte 2. x'))]);
  });

  it('commence une autre liste quand la puce change', () => {
    const blocs = analyser('- a\n* b');
    expect(blocs.map((bloc) => bloc.type)).toEqual(['liste', 'liste']);
  });
});

describe('tableaux', () => {
  it('lit un tableau, avec les alignements de ses colonnes', () => {
    expect(analyser('| a | b |\n| --- | :---: |\n| 1 | 2 |')).toEqual([
      {
        type: 'tableau',
        alignements: ['defaut', 'centre'],
        entete: [[t('a')], [t('b')]],
        lignes: [[[t('1')], [t('2')]]],
        ligne: 0,
      },
    ]);
  });

  it('lit les alignements à gauche et à droite', () => {
    const tableau = analyser('| a | b |\n| :-- | --: |')[0];
    expect(tableau).toMatchObject({ type: 'tableau', alignements: ['gauche', 'droite'] });
  });

  it('complète une rangée trop courte', () => {
    const tableau = analyser('| a | b |\n|---|---|\n| 1 |')[0];
    expect(tableau).toMatchObject({ type: 'tableau', lignes: [[[t('1')], []]] });
  });

  it('lit un tableau sans barres aux extrémités', () => {
    const tableau = analyser('a | b\n--|--\n1 | 2')[0];
    expect(tableau).toMatchObject({ type: 'tableau', entete: [[t('a')], [t('b')]], lignes: [[[t('1')], [t('2')]]] });
  });

  it('ne coupe pas une cellule à une barre protégée', () => {
    const tableau = analyser('| a \\| b | c |\n|---|---|')[0];
    expect(tableau).toMatchObject({ type: 'tableau', entete: [[t('a | b')], [t('c')]] });
  });
});
