import { describe, expect, it } from 'vitest';
import { raccourciVersAction, type Action } from './formatage';
import { GROUPES, infobulle } from './outils';

const TOUTES_LES_ACTIONS: Action[] = [
  'titre0',
  'titre1',
  'titre2',
  'titre3',
  'titre4',
  'titre5',
  'titre6',
  'gras',
  'italique',
  'barre',
  'surligne',
  'souligne',
  'code',
  'citation',
  'puces',
  'numerotee',
  'taches',
  'blocCode',
  'separateur',
  'tableau',
  'lien',
  'image',
];

const outils = GROUPES.flatMap((groupe) => groupe.outils);

/** La frappe que décrit un raccourci écrit « Ctrl+Maj+X » ou « Ctrl+3 ». */
function frappeDe(raccourci: string): { key: string; code: string; ctrlKey: boolean; shiftKey: boolean; altKey: boolean } {
  const touches = raccourci.split('+');
  const derniere = touches[touches.length - 1] ?? '';
  const maj = touches.includes('Maj');
  const chiffre = /^\d$/.test(derniere);
  return {
    key: chiffre ? derniere : maj ? derniere : derniere.toLowerCase(),
    code: chiffre ? `Digit${derniere}` : `Key${derniere}`,
    ctrlKey: touches.includes('Ctrl'),
    shiftKey: maj,
    altKey: false,
  };
}

describe('outils de la barre latérale', () => {
  it('proposent chaque action une fois, ni plus ni moins', () => {
    expect(outils.map((o) => o.action).sort()).toEqual([...TOUTES_LES_ACTIONS].sort());
  });

  it('ont des libellés et des raccourcis qui ne se répètent pas', () => {
    const libelles = outils.map((o) => o.libelle);
    expect(new Set(libelles).size).toBe(libelles.length);
    const raccourcis = outils.map((o) => o.raccourci).filter((r) => r !== '');
    expect(new Set(raccourcis).size).toBe(raccourcis.length);
  });

  it('annoncent des raccourcis que le clavier reconnaît, et pour la même action', () => {
    for (const outil of outils.filter((o) => o.raccourci !== '')) {
      expect(raccourciVersAction(frappeDe(outil.raccourci)), outil.raccourci).toBe(outil.action);
    }
  });

  it('écrivent l’infobulle avec le raccourci quand il y en a un', () => {
    expect(infobulle({ action: 'gras', libelle: 'Gras', description: 'Gras', raccourci: 'Ctrl+B' })).toBe('Gras (Ctrl+B)');
    expect(infobulle({ action: 'image', libelle: 'Image', description: 'Image', raccourci: '' })).toBe('Image');
  });
});
