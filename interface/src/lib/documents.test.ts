import { describe, expect, it } from 'vitest';
import {
  SANS_TITRE,
  brouillonUtile,
  detailDocument,
  estModifie,
  libelleFins,
  nomAffiche,
  nombreDeLignes,
  origineBrouillon,
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

describe('brouillon', () => {
  it('ne propose pas un texte vide ou fait d’espaces', () => {
    expect(brouillonUtile('')).toBe(false);
    expect(brouillonUtile(' \n\t ')).toBe(false);
    expect(brouillonUtile('a')).toBe(true);
  });

  it('dit d’où vient le brouillon et quand il a été écrit', () => {
    expect(origineBrouillon('notes.md', '2026-11-25 10:02:41')).toBe('notes.md, écrit le 2026-11-25 à 10:02');
    expect(origineBrouillon(null, '2026-11-25 10:02:41')).toBe('Document sans fichier, écrit le 2026-11-25 à 10:02');
    expect(origineBrouillon('', '2026-11-25 10:02:41')).toBe('Document sans fichier, écrit le 2026-11-25 à 10:02');
  });

  it('garde la date telle quelle si elle n’a pas la forme attendue', () => {
    expect(origineBrouillon('a.md', 'hier')).toBe('a.md, écrit hier');
  });
});
