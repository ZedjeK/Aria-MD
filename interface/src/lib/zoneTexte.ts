// Ce qui touche la zone de saisie du navigateur : appliquer une édition en gardant Ctrl+Z, et faire défiler jusqu'à
// une position. C'est le seul fichier de l'éditeur qui parle au DOM : le reste (formatage.ts, plan.ts) est pur.
import type { Edition } from './formatage';

/**
 * Applique une édition à la zone de saisie et sélectionne ce qu'elle prévoit. Le texte passe par `execCommand`, qui est
 * déprécié mais reste la seule voie qui garde l'historique d'annulation (Ctrl+Z) d'une zone de saisie. Si le navigateur le
 * refuse, `setRangeText` écrit sans historique plutôt que de ne rien faire.
 */
export function appliquerDansZone(zone: HTMLTextAreaElement, edition: Edition): void {
  zone.focus();
  if (edition.de === edition.a && edition.par === '') {
    zone.setSelectionRange(edition.debut, edition.fin);
    return;
  }
  zone.setSelectionRange(edition.de, edition.a);
  const fait =
    edition.par === '' ? document.execCommand('delete') : document.execCommand('insertText', false, edition.par);
  if (!fait) {
    zone.setRangeText(edition.par, edition.de, edition.a, 'end');
    zone.dispatchEvent(new Event('input', { bubbles: true }));
  }
  zone.setSelectionRange(edition.debut, edition.fin);
}

/** Ce qui fait la forme du texte, à recopier sur la copie cachée qui sert à mesurer. */
const PROPRIETES_DU_TEXTE = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'tabSize',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
] as const;

/**
 * Fait défiler la zone pour que la position soit visible, au tiers de sa hauteur. La hauteur d'une ligne ne suffit pas :
 * les lignes longues passent à la ligne. On mesure donc le texte jusqu'à la position dans une copie cachée, de même
 * largeur et de même police.
 */
export function defilerVersPosition(zone: HTMLTextAreaElement, position: number): void {
  const style = getComputedStyle(zone);
  const copie = document.createElement('div');
  for (const propriete of PROPRIETES_DU_TEXTE) copie.style[propriete] = style[propriete];
  copie.style.boxSizing = 'border-box';
  copie.style.position = 'absolute';
  copie.style.visibility = 'hidden';
  copie.style.top = '0';
  copie.style.left = '-9999px';
  // La largeur utile de la zone : sans la barre de défilement ni les bordures.
  copie.style.width = `${zone.clientWidth}px`;
  copie.style.whiteSpace = 'pre-wrap';
  copie.style.overflowWrap = 'break-word';
  copie.textContent = zone.value.slice(0, position);
  const repere = document.createElement('span');
  repere.textContent = '​';
  copie.append(repere);
  document.body.append(copie);
  const hauteur = repere.offsetTop;
  copie.remove();
  zone.scrollTop = Math.max(0, hauteur - zone.clientHeight / 3);
}
