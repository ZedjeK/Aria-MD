// L'éditeur : ce qui se calcule sans toucher à Rust (nom affiché, document modifié ou non, taille du texte).
import type { FinsDeLigne, Ton } from './api';

/** Le nom d'un document qui n'a pas encore de fichier. */
export const SANS_TITRE = 'Sans titre';

/** Le nom à afficher : celui du fichier, ou « Sans titre ». */
export function nomAffiche(nom: string | null): string {
  return nom === null || nom === '' ? SANS_TITRE : nom;
}

/** Le texte a-t-il changé depuis la dernière ouverture ou le dernier enregistrement ? */
export function estModifie(contenu: string, original: string): boolean {
  return contenu !== original;
}

/** Un brouillon vaut d'être proposé s'il contient quelque chose : un texte tout effacé ne se récupère pas. */
export function brouillonUtile(contenu: string): boolean {
  return contenu.trim() !== '';
}

/** La phrase qui dit d'où vient un brouillon : « notes.md, écrit le 2026-11-25 à 10:02 », ou sans nom pour un document sans fichier. */
export function origineBrouillon(nom: string | null, date: string): string {
  const [jour, heure] = date.split(' ');
  const quand = jour !== undefined && heure !== undefined ? `le ${jour} à ${heure.slice(0, 5)}` : date;
  return nom === null || nom === '' ? `Document sans fichier, écrit ${quand}` : `${nom}, écrit ${quand}`;
}

/** Le nombre de lignes d'un texte : un saut de ligne en ajoute une, et un texte vide en compte une. */
export function nombreDeLignes(contenu: string): number {
  let lignes = 1;
  let position = contenu.indexOf('\n');
  while (position !== -1) {
    lignes += 1;
    position = contenu.indexOf('\n', position + 1);
  }
  return lignes;
}

/** Les fins de ligne, comme on les écrit : LF ou CRLF. */
export function libelleFins(fins: FinsDeLigne): string {
  return fins === 'crlf' ? 'CRLF' : 'LF';
}

/** Le détail de la pastille « Document » : le nom du fichier, et s'il a des modifications. */
export function detailDocument(nom: string | null, modifie: boolean): string {
  if (nom === null && !modifie) return 'aucun';
  return modifie ? `${nomAffiche(nom)} · modifié` : nomAffiche(nom);
}

/** La couleur de la pastille « Document » : à regarder s'il y a des modifications, active si un fichier est ouvert. */
export function tonDocument(nom: string | null, modifie: boolean): Ton {
  if (modifie) return 'attention';
  return nom === null ? 'repos' : 'actif';
}
