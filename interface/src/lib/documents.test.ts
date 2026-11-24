import { describe, expect, it } from 'vitest';
import {
  SANS_TITRE,
  detailDocument,
  estModifie,
  libelleFins,
  nomAffiche,
  nombreDeLignes,
  tonDocument,
} from './documents';

describe('documents', () => {
  it('affiche « Sans titre » pour un document sans fichier', () => {
    expect(nomAffiche(null)).toBe(SANS_TITRE);
    expect(nomAffiche('')).toBe(SANS_TITRE);
    expect(nomAffiche('notes.md')).toBe('notes.md');
  });

  it('voit qu’un texte a changé, et qu’il est revenu à l’identique', () => {
    expect(estModifie('a', 'a')).toBe(false);
    expect(estModifie('ab', 'a')).toBe(true);
    expect(estModifie('', '')).toBe(false);
  });

  it('compte les lignes : un texte vide en a une, chaque saut de ligne en ajoute une', () => {
    expect(nombreDeLignes('')).toBe(1);
    expect(nombreDeLignes('une')).toBe(1);
    expect(nombreDeLignes('a\nb')).toBe(2);
    expect(nombreDeLignes('a\nb\n')).toBe(3);
    expect(nombreDeLignes('\n\n')).toBe(3);
  });

  it('écrit les fins de ligne', () => {
    expect(libelleFins('lf')).toBe('LF');
    expect(libelleFins('crlf')).toBe('CRLF');
  });

  it('résume le document pour la pastille', () => {
    expect(detailDocument(null, false)).toBe('aucun');
    expect(detailDocument('notes.md', false)).toBe('notes.md');
    expect(detailDocument('notes.md', true)).toBe('notes.md · modifié');
    expect(detailDocument(null, true)).toBe('Sans titre · modifié');
  });

  it('colore la pastille selon l’état du document', () => {
    expect(tonDocument(null, false)).toBe('repos');
    expect(tonDocument('notes.md', false)).toBe('actif');
    expect(tonDocument('notes.md', true)).toBe('attention');
    expect(tonDocument(null, true)).toBe('attention');
  });
});
