// La session d'édition : le document ouvert, ce qu'on y a changé, et les gestes qui l'ouvrent ou l'enregistrent.
// Rust garde le chemin du fichier et fait toute l'écriture (boîtes de Windows, copie avant remplacement) : ici,
// seulement le texte et son état.
import {
  enregistrerDocument,
  enregistrerDocumentSous,
  messageErreur,
  nouveauDocument,
  ouvrirDocument,
  signalerModification,
  type DocumentOuvert,
  type Enregistre,
  type FinsDeLigne,
} from './api';
import { estModifie } from './documents';
import { octetsLisibles } from './jauge';

type Signaler = (texte: string, erreur?: boolean) => void;

export class Session {
  /** Le texte à l'écran. */
  contenu = $state('');
  /** Le texte tel qu'il était à la dernière ouverture ou au dernier enregistrement. */
  original = $state('');
  /** Où est le fichier, pour l'affichage ; null tant que le document n'a pas de fichier. */
  chemin = $state<string | null>(null);
  nom = $state<string | null>(null);
  finsDeLigne = $state<FinsDeLigne>('lf');
  /** Le fichier mélange LF et CRLF : elles seront unifiées à l'enregistrement. */
  melange = $state(false);
  /** Une boîte de Windows ou une écriture est en cours : un seul geste à la fois. */
  occupe = $state(false);
  modifie = $derived(estModifie(this.contenu, this.original));

  /** Ce que Rust sait de « modifié » : il n'est prévenu que quand cela change. */
  private dernierSignal = false;
  private readonly signaler: Signaler;

  constructor(signaler: Signaler) {
    this.signaler = signaler;
  }

  /** Le texte change (saisie). */
  changer(contenu: string): void {
    this.contenu = contenu;
    this.relayer();
  }

  /** Prévient Rust quand le document passe de « propre » à « modifié » ou l'inverse : c'est ce qui retient la fermeture. */
  private relayer(): void {
    const modifie = this.modifie;
    if (modifie === this.dernierSignal) return;
    this.dernierSignal = modifie;
    void signalerModification(modifie).catch((e: unknown) => {
      this.signaler(`La fermeture n'est pas protégée : ${messageErreur(e)}`, true);
    });
  }

  private charger(ouvert: DocumentOuvert): void {
    this.contenu = ouvert.contenu;
    this.original = ouvert.contenu;
    this.chemin = ouvert.chemin;
    this.nom = ouvert.nom;
    this.finsDeLigne = ouvert.finsDeLigne;
    this.melange = ouvert.melange;
    // Rust a remis « modifié » à faux en ouvrant le fichier.
    this.dernierSignal = false;
  }

  /** La boîte « Ouvrir » ; true si un document a été ouvert. Les modifications en cours sont déjà réglées. */
  async ouvrir(): Promise<boolean> {
    if (this.occupe) return false;
    this.occupe = true;
    try {
      const ouvert = await ouvrirDocument();
      if (ouvert === null) return false;
      this.charger(ouvert);
      const avertissement = ouvert.melange ? ' Ses fins de ligne sont mélangées.' : '';
      this.signaler(`Ouvert : ${ouvert.nom} (${octetsLisibles(ouvert.octets)}).${avertissement}`);
      return true;
    } catch (e) {
      this.signaler(messageErreur(e), true);
      return false;
    } finally {
      this.occupe = false;
    }
  }

  /** Un document vide, sans fichier. Les modifications en cours sont déjà réglées. */
  async nouveau(): Promise<boolean> {
    if (this.occupe) return false;
    this.occupe = true;
    try {
      await nouveauDocument();
      this.contenu = '';
      this.original = '';
      this.chemin = null;
      this.nom = null;
      this.finsDeLigne = 'lf';
      this.melange = false;
      this.dernierSignal = false;
      this.signaler('Nouveau document.');
      return true;
    } catch (e) {
      this.signaler(messageErreur(e), true);
      return false;
    } finally {
      this.occupe = false;
    }
  }

  /** Enregistre dans le fichier ouvert (ou demande où, s'il n'y en a pas) ; true si c'est fait. */
  async enregistrer(): Promise<boolean> {
    if (this.occupe) return false;
    if (this.chemin === null) return this.enregistrerSous();
    this.occupe = true;
    // Le texte envoyé, pas celui de la fin de l'écriture : ce qui est tapé pendant l'enregistrement reste « modifié ».
    const envoye = this.contenu;
    try {
      this.apresEnregistrement(envoye, await enregistrerDocument(envoye));
      return true;
    } catch (e) {
      this.signaler(messageErreur(e), true);
      return false;
    } finally {
      this.occupe = false;
    }
  }

  /** La boîte « Enregistrer sous » ; true si le document a été enregistré. */
  async enregistrerSous(): Promise<boolean> {
    if (this.occupe) return false;
    this.occupe = true;
    const envoye = this.contenu;
    try {
      const bilan = await enregistrerDocumentSous(envoye);
      if (bilan === null) return false;
      this.apresEnregistrement(envoye, bilan);
      return true;
    } catch (e) {
      this.signaler(messageErreur(e), true);
      return false;
    } finally {
      this.occupe = false;
    }
  }

  private apresEnregistrement(envoye: string, bilan: Enregistre): void {
    this.original = envoye;
    this.chemin = bilan.chemin;
    this.nom = bilan.nom;
    // Rust écrit avec des fins de ligne uniformes : le document n'est plus « mélangé ».
    this.melange = false;
    this.relayer();
    const copie = bilan.copie ? ', ancien contenu gardé dans les sauvegardes' : '';
    this.signaler(`Enregistré : ${bilan.nom} (${octetsLisibles(bilan.octets)})${copie}.`);
  }
}
