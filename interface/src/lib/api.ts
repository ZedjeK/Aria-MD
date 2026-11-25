// Les commandes Rust que l'interface peut appeler (appli\src\commandes.rs, demarrage_auto.rs, documents.rs, icone.rs), avec
// leurs types. Une commande ajoutée ici doit aussi l'être dans appli\build.rs et dans la capacité de la fenêtre
// qui l'appelle (appli\capabilities\principale.json, menu.json ou installation.json).
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export type Vitesse = 'lente' | 'normale' | 'rapide';

export interface ReglagesFond {
  actif: boolean;
  vitesse: Vitesse;
  minimum: number;
  maximum: number;
}

export interface Reglages {
  fond: ReglagesFond;
  proposerInstallation: boolean;
  chercherMisesAJour: boolean;
}

export interface Identite {
  nom: string;
  version: string;
  promesse: string;
  enFond: boolean;
  installable: boolean;
  dossier: string;
}

export const identite = (): Promise<Identite> => invoke<Identite>('identite');

export const lireReglages = (): Promise<Reglages> => invoke<Reglages>('lire_reglages');

/** Renvoie les réglages vraiment enregistrés : les bornes peuvent avoir été ramenées. */
export const enregistrerReglages = (reglages: Reglages): Promise<Reglages> =>
  invoke<Reglages>('enregistrer_reglages', { reglages });

/** Les fins de ligne d'un fichier : le texte de l'interface n'a que des « \n », Rust remet celles du fichier. */
export type FinsDeLigne = 'lf' | 'crlf';

/** Un document ouvert. Le chemin n'est là que pour l'affichage : c'est Rust qui le garde et qui écrit. */
export interface DocumentOuvert {
  chemin: string;
  nom: string;
  contenu: string;
  finsDeLigne: FinsDeLigne;
  bom: boolean;
  /** Le fichier mélange LF et CRLF : les fins de ligne seront unifiées à l'enregistrement. */
  melange: boolean;
  octets: number;
}

/** Ce qu'un enregistrement a fait. */
export interface Enregistre {
  chemin: string;
  nom: string;
  octets: number;
  /** L'ancien contenu a été copié dans sauvegardes\ avant d'être remplacé. */
  copie: boolean;
}

/** Rust montre la boîte « Ouvrir » et ouvre le fichier choisi ; null si on annule. */
export const ouvrirDocument = (): Promise<DocumentOuvert | null> => invoke<DocumentOuvert | null>('ouvrir_document');

/** Enregistre le texte dans le document ouvert, après copie de l'ancien contenu. */
export const enregistrerDocument = (contenu: string): Promise<Enregistre> =>
  invoke<Enregistre>('enregistrer_document', { contenu });

/** Rust montre la boîte « Enregistrer sous » et écrit là ; null si on annule. */
export const enregistrerDocumentSous = (contenu: string): Promise<Enregistre | null> =>
  invoke<Enregistre | null>('enregistrer_document_sous', { contenu });

/** Repart d'un document vide, sans fichier. */
export const nouveauDocument = (): Promise<void> => invoke<void>('nouveau_document');

/** Dit à Rust si le document a des modifications non enregistrées : c'est ce qui retient la fermeture. */
export const signalerModification = (modifie: boolean): Promise<void> =>
  invoke<void>('signaler_modification', { modifie });

/** Un brouillon laissé par un arrêt avant l'enregistrement. */
export interface BrouillonRetrouve {
  contenu: string;
  /** Le nom du fichier dont il vient ; null pour un document qui n'en avait pas. */
  nom: string | null;
  /** Quand il a été écrit, « AAAA-MM-JJ HH:MM:SS ». */
  date: string;
}

/** Garde le texte en brouillon, à la place du précédent. Rust y ajoute le nom du fichier : le chemin ne passe pas par ici. */
export const enregistrerBrouillon = (contenu: string): Promise<void> =>
  invoke<void>('enregistrer_brouillon', { contenu });

/** Le brouillon laissé par un arrêt avant l'enregistrement ; null s'il n'y en a pas. */
export const lireBrouillon = (): Promise<BrouillonRetrouve | null> =>
  invoke<BrouillonRetrouve | null>('lire_brouillon');

/** Efface le brouillon : le document est enregistré, abandonné ou remplacé. */
export const effacerBrouillon = (): Promise<void> => invoke<void>('effacer_brouillon');

/** Une opération du journal (journal.json). */
export interface Operation {
  /** RFC 3339, heure locale. */
  date: string;
  type: string;
  bilan: string;
}

/** Les dernières opérations, la plus récente d'abord. */
export const lireJournal = (): Promise<Operation[]> => invoke<Operation[]>('lire_journal');

/** Quitte l'appli, icône de notification comprise. */
export const quitter = (): Promise<void> => invoke<void>('quitter');

/** « Démarrer avec Windows », relu dans le registre à chaque appel. */
export const lireDemarrageAuto = (): Promise<boolean> => invoke<boolean>('lire_demarrage_auto');

/** Coche ou décoche « Démarrer avec Windows » ; renvoie l'état relu ensuite. */
export const reglerDemarrageAuto = (actif: boolean): Promise<boolean> =>
  invoke<boolean>('regler_demarrage_auto', { actif });

/** Couleur du point d'une ligne « État » du menu de l'icône. */
export type Ton = 'repos' | 'actif' | 'attention' | 'information';

export interface LigneMenu {
  ton: Ton;
  texte: string;
}

export interface EtatMenu {
  nom: string;
  lignes: LigneMenu[];
  demarrageAuto: boolean;
  /** La version disponible : « Voir la mise à jour » n'apparaît qu'avec elle. */
  miseAJour: string | null;
}

export type ActionMenu = 'ouvrir' | 'parametres' | 'miseAJour' | 'quitter';

export const etatMenu = (): Promise<EtatMenu> => invoke<EtatMenu>('etat_menu');

/** Le menu se range, puis l'action se fait. */
export const actionMenu = (action: ActionMenu): Promise<void> => invoke<void>('action_menu', { action });

/** La fenêtre du menu prend la hauteur de son contenu. */
export const tailleMenu = (hauteur: number): Promise<void> => invoke<void>('taille_menu', { hauteur });

export interface InfosInstallation {
  nom: string;
  version: string;
  /** Le dossier programme\ du dossier de données. */
  dossier: string;
  versionInstallee: string | null;
  /** Le raccourci du Bureau qui serait créé ; null si le Bureau est introuvable. */
  raccourci: string | null;
}

export const infosInstallation = (): Promise<InfosInstallation> => invoke<InfosInstallation>('infos_installation');

/** Installe, puis l'appli se relance depuis son dossier et ce lancement se ferme : seul un échec revient ici. */
export const installer = (raccourci: boolean): Promise<void> => invoke<void>('installer', { raccourci });

export const lancerSansInstaller = (nePlusProposer: boolean): Promise<void> =>
  invoke<void>('lancer_sans_installer', { nePlusProposer });

export interface InfosMiseAJour {
  nom: string;
  actuelle: string;
  version: string;
  /** Taille du zip, en octets. */
  taille: number;
}

/** La mise à jour trouvée au lancement ; null s'il n'y en a pas (ou pas encore). */
export const miseAJourDisponible = (): Promise<InfosMiseAJour | null> =>
  invoke<InfosMiseAJour | null>('mise_a_jour_disponible');

/** Ouvre la page de la release dans le navigateur. */
export const voirNotes = (): Promise<void> => invoke<void>('voir_notes');

/** Télécharge, vérifie et installe, puis l'appli se relance : seul un échec revient ici. */
export const installerMiseAJour = (): Promise<void> => invoke<void>('installer_mise_a_jour');

/**
 * Événements envoyés par l'appli : « etat-icone » (le menu relit son état), « aller-a » (page ou dialogue à
 * montrer : « parametres », « mise-a-jour »), « mise-a-jour » (version disponible), « fermeture-demandee » (la
 * fenêtre voulait se fermer avec des modifications non enregistrées : l'interface demande quoi en faire).
 */
export const ecouter = <T>(
  evenement: 'etat-icone' | 'aller-a' | 'mise-a-jour' | 'fermeture-demandee',
  rappel: (charge: T) => void,
): Promise<UnlistenFn> =>
  listen<T>(evenement, (e) => rappel(e.payload));

/** Le message d'une erreur renvoyée par une commande Rust (du texte) ou par le navigateur. */
export function messageErreur(erreur: unknown): string {
  if (typeof erreur === 'string') return erreur;
  if (erreur instanceof Error) return erreur.message;
  return 'erreur inconnue';
}
