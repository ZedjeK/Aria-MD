import { describe, expect, it } from 'vitest';
import {
  DERNIERE_RANGEE,
  NOMBRE_DE_MODELES,
  PREMIERE_RANGEE,
  RANGEES,
  caracteresEcrits,
  dureeDeVie,
  etape,
  opacite,
  partRendu,
  partSource,
  rangeeLibre,
  tirerModele,
} from './fondMarkdown';

/** Un hasard qui rend les valeurs données, l'une après l'autre, puis la dernière. */
function suite(...valeurs: number[]): () => number {
  let i = 0;
  return () => valeurs[Math.min(i++, valeurs.length - 1)] ?? 0;
}

describe('modèles de lignes', () => {
  it('sait écrire plusieurs sortes de Markdown, dont un titre, du gras et du surligné', () => {
    const sources = Array.from({ length: NOMBRE_DE_MODELES }, (_, i) => tirerModele(suite((i + 0.5) / NOMBRE_DE_MODELES)).source);
    expect(NOMBRE_DE_MODELES).toBeGreaterThanOrEqual(10);
    expect(sources.some((s) => s.startsWith('# '))).toBe(true);
    expect(sources.some((s) => /\*\*.+\*\*/.test(s))).toBe(true);
    expect(sources.some((s) => /==.+==/.test(s))).toBe(true);
    expect(new Set(sources).size).toBe(sources.length);
  });

  it('rend chaque ligne avec les mots de sa source, et rien d’autre', () => {
    for (let i = 0; i < NOMBRE_DE_MODELES; i += 1) {
      for (const hasard of [0, 0.37, 0.999_999]) {
        const modele = tirerModele(suite((i + 0.5) / NOMBRE_DE_MODELES, hasard));
        expect(modele.source.trim(), modele.source).not.toBe('');
        expect(modele.rendu.length, modele.source).toBeGreaterThan(0);
        for (const segment of modele.rendu) {
          expect(segment.texte, modele.source).not.toBe('');
          // Seule la puce (« • », « 1. », « ✓ ») est ajoutée par le rendu.
          if (segment.style !== 'puce') expect(modele.source, segment.texte).toContain(segment.texte);
        }
      }
    }
  });

  it('retire les marques une fois rendue : plus de dièse, d’astérisque ni de signe égal', () => {
    for (let i = 0; i < NOMBRE_DE_MODELES; i += 1) {
      const modele = tirerModele(suite((i + 0.5) / NOMBRE_DE_MODELES, 0.2));
      const rendu = modele.rendu.map((s) => s.texte).join('');
      if (/^#{1,2} |\*\*|==|~~/.test(modele.source)) expect(rendu, modele.source).not.toMatch(/^#|\*\*|==|~~/);
    }
  });

  it('ne rend jamais deux fois la même ligne quand le hasard change', () => {
    const lignes = new Set(Array.from({ length: 50 }, (_, i) => tirerModele(suite(0, i / 50)).source));
    expect(lignes.size).toBeGreaterThan(5);
  });
});

describe('vie d’une ligne', () => {
  it('passe par l’écriture, le rendu, le repos puis l’effacement, dans cet ordre', () => {
    const phases = [0, 0.2, 0.35, 0.6, 0.9, 1].map((t) => etape(t).phase);
    expect(phases).toEqual(['ecriture', 'ecriture', 'rendu', 'repos', 'effacement', 'effacement']);
  });

  it('avance de 0 à 1 dans chaque phase', () => {
    for (const t of [0, 0.1, 0.32, 0.4, 0.42, 0.7, 0.82, 0.95, 1]) {
      const { progression } = etape(t);
      expect(progression).toBeGreaterThanOrEqual(0);
      expect(progression).toBeLessThanOrEqual(1);
    }
    expect(etape(0).progression).toBe(0);
    expect(etape(1).progression).toBe(1);
  });

  it('borne le temps : avant la naissance et après la mort', () => {
    expect(etape(-3)).toEqual(etape(0));
    expect(etape(7)).toEqual(etape(1));
  });

  it('écrit les caractères peu à peu, sans dépasser la ligne', () => {
    expect(caracteresEcrits(0, 10)).toBe(0);
    expect(caracteresEcrits(0.5, 10)).toBe(5);
    expect(caracteresEcrits(1, 10)).toBe(10);
    expect(caracteresEcrits(2, 10)).toBe(10);
    expect(caracteresEcrits(-1, 10)).toBe(0);
  });

  it('montre le texte source seul à l’écriture, le rendu seul ensuite, et mélange pendant le rendu', () => {
    expect([partSource(etape(0.1)), partRendu(etape(0.1))]).toEqual([1, 0]);
    expect([partSource(etape(0.6)), partRendu(etape(0.6))]).toEqual([0, 1]);
    const milieu = etape(0.37);
    expect(partSource(milieu) + partRendu(milieu)).toBeCloseTo(1);
    expect(partSource(milieu)).toBeGreaterThan(0);
    expect(partRendu(milieu)).toBeGreaterThan(0);
  });

  it('apparaît dès les premiers caractères et disparaît à la fin', () => {
    expect(opacite(etape(0))).toBe(0);
    expect(opacite(etape(0.1))).toBe(1);
    expect(opacite(etape(0.6))).toBe(1);
    expect(opacite(etape(1))).toBe(0);
    expect(opacite(etape(0.9))).toBeGreaterThan(0);
    expect(opacite(etape(0.9))).toBeLessThan(1);
  });

  it('dure de 0,8 à 1,4 fois la durée moyenne', () => {
    expect(dureeDeVie(1000, () => 0)).toBe(800);
    expect(dureeDeVie(1000, () => 1)).toBeCloseTo(1400);
  });
});

describe('rangées', () => {
  it('ne pose jamais une ligne sous l\x27en-tête ni sur la ligne d\x27état', () => {
    expect(rangeeLibre(new Set(), () => 0)).toBe(PREMIERE_RANGEE);
    expect(rangeeLibre(new Set(), () => 0.999_999)).toBe(DERNIERE_RANGEE);
    expect(PREMIERE_RANGEE).toBeGreaterThanOrEqual(2);
    expect(DERNIERE_RANGEE).toBeLessThan(RANGEES - 1);
    for (let i = 0; i < 200; i += 1) {
      const rangee = rangeeLibre(new Set(), () => i / 200);
      expect(rangee).toBeGreaterThanOrEqual(PREMIERE_RANGEE);
      expect(rangee).toBeLessThanOrEqual(DERNIERE_RANGEE);
    }
  });

  it('choisit une rangée libre', () => {
    const prises = new Set(Array.from({ length: DERNIERE_RANGEE - PREMIERE_RANGEE }, (_, i) => PREMIERE_RANGEE + i));
    expect(rangeeLibre(prises, () => 0)).toBe(DERNIERE_RANGEE);
    expect(rangeeLibre(prises, () => 0.999_999)).toBe(DERNIERE_RANGEE);
  });

  it('prend n\x27importe quelle rangée permise quand toutes sont prises', () => {
    const toutes = new Set(Array.from({ length: RANGEES }, (_, i) => i));
    const rangee = rangeeLibre(toutes, () => 0.5);
    expect(rangee).toBeGreaterThanOrEqual(PREMIERE_RANGEE);
    expect(rangee).toBeLessThanOrEqual(DERNIERE_RANGEE);
  });
});
