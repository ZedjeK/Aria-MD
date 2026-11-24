import { describe, expect, it } from 'vitest';
import { fractionDefilement, positionDeFraction } from './defilement';

describe('défilement lié', () => {
  it('donne la part du parcours déjà faite', () => {
    expect(fractionDefilement(0, 1000, 200)).toBe(0);
    expect(fractionDefilement(400, 1000, 200)).toBe(0.5);
    expect(fractionDefilement(800, 1000, 200)).toBe(1);
  });

  it('reste entre 0 et 1, même si le navigateur dépasse', () => {
    expect(fractionDefilement(-5, 1000, 200)).toBe(0);
    expect(fractionDefilement(900, 1000, 200)).toBe(1);
  });

  it('donne 0 quand tout est visible', () => {
    expect(fractionDefilement(0, 200, 200)).toBe(0);
    expect(fractionDefilement(10, 150, 200)).toBe(0);
    expect(positionDeFraction(0.5, 150, 200)).toBe(0);
  });

  it('retrouve la position qui correspond à une part du parcours', () => {
    expect(positionDeFraction(0, 1000, 200)).toBe(0);
    expect(positionDeFraction(0.5, 1000, 200)).toBe(400);
    expect(positionDeFraction(1, 1000, 200)).toBe(800);
  });

  it('ramène une part hors de 0 à 1 dans le parcours', () => {
    expect(positionDeFraction(-1, 1000, 200)).toBe(0);
    expect(positionDeFraction(2, 1000, 200)).toBe(800);
  });

  it('retrouve la même part dans une vue de hauteur différente', () => {
    const fraction = fractionDefilement(300, 1000, 200);
    expect(positionDeFraction(fraction, 3000, 400)).toBe(Math.round(0.375 * 2600));
  });
});
