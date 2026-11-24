// Les outils de la barre latérale de l'éditeur : leurs libellés et leurs raccourcis clavier, rangés par groupe.
// Les raccourcis écrits ici sont ceux que reconnaît `raccourciVersAction` (formatage.ts) : un test vérifie qu'ils
// concordent.
import type { Action } from './formatage';

/** Comment le bouton montre son libellé : la mise en forme qu'il applique. */
export type Apparence = 'gras' | 'italique' | 'barre' | 'souligne' | 'surligne' | 'code';

export interface Outil {
  action: Action;
  /** Ce qui est écrit sur le bouton. */
  libelle: string;
  /** Ce que dit l'infobulle, avant le raccourci. */
  description: string;
  /** Le raccourci clavier, écrit « Ctrl+Maj+X ». */
  raccourci: string;
  apparence?: Apparence;
}

export interface GroupeOutils {
  titre: string;
  /** Des boutons courts (H1…H6) : plus serrés que les autres. */
  compact?: boolean;
  outils: Outil[];
}

export const GROUPES: GroupeOutils[] = [
  {
    titre: 'Titres',
    compact: true,
    outils: [
      { action: 'titre1', libelle: 'H1', description: 'Titre 1', raccourci: 'Ctrl+1' },
      { action: 'titre2', libelle: 'H2', description: 'Titre 2', raccourci: 'Ctrl+2' },
      { action: 'titre3', libelle: 'H3', description: 'Titre 3', raccourci: 'Ctrl+3' },
      { action: 'titre4', libelle: 'H4', description: 'Titre 4', raccourci: 'Ctrl+4' },
      { action: 'titre5', libelle: 'H5', description: 'Titre 5', raccourci: 'Ctrl+5' },
      { action: 'titre6', libelle: 'H6', description: 'Titre 6', raccourci: 'Ctrl+6' },
      { action: 'titre0', libelle: 'Texte', description: 'Retirer le titre', raccourci: 'Ctrl+0' },
    ],
  },
  {
    titre: 'Mise en forme',
    outils: [
      { action: 'gras', libelle: 'Gras', description: 'Gras', raccourci: 'Ctrl+B', apparence: 'gras' },
      { action: 'italique', libelle: 'Italique', description: 'Italique', raccourci: 'Ctrl+I', apparence: 'italique' },
      { action: 'barre', libelle: 'Barré', description: 'Barré', raccourci: 'Ctrl+Maj+X', apparence: 'barre' },
      { action: 'surligne', libelle: 'Surligné', description: 'Surligné', raccourci: 'Ctrl+Maj+H', apparence: 'surligne' },
      { action: 'souligne', libelle: 'Souligné', description: 'Souligné', raccourci: 'Ctrl+U', apparence: 'souligne' },
      { action: 'code', libelle: 'Code', description: 'Code en ligne', raccourci: 'Ctrl+E', apparence: 'code' },
    ],
  },
  {
    titre: 'Listes et blocs',
    outils: [
      { action: 'puces', libelle: 'Puces', description: 'Liste à puces', raccourci: 'Ctrl+Maj+8' },
      { action: 'numerotee', libelle: 'Numérotée', description: 'Liste numérotée', raccourci: 'Ctrl+Maj+7' },
      { action: 'taches', libelle: 'Tâches', description: 'Liste de tâches', raccourci: 'Ctrl+Maj+9' },
      { action: 'citation', libelle: 'Citation', description: 'Citation', raccourci: 'Ctrl+Maj+Q' },
      { action: 'blocCode', libelle: 'Bloc de code', description: 'Bloc de code', raccourci: 'Ctrl+Maj+E' },
    ],
  },
  {
    titre: 'Insérer',
    outils: [
      { action: 'lien', libelle: 'Lien', description: 'Lien', raccourci: 'Ctrl+K' },
      { action: 'image', libelle: 'Image', description: 'Image', raccourci: '' },
      { action: 'tableau', libelle: 'Tableau', description: 'Tableau', raccourci: '' },
      { action: 'separateur', libelle: 'Séparateur', description: 'Ligne de séparation', raccourci: '' },
    ],
  },
];

/** L'infobulle d'un outil : sa description, puis son raccourci s'il en a un. */
export function infobulle(outil: Outil): string {
  return outil.raccourci === '' ? outil.description : `${outil.description} (${outil.raccourci})`;
}
