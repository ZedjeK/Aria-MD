// Le défilement lié des deux vues de l'éditeur (code et aperçu) : la position d'un défilement exprimée par sa part de
// parcours, pour la retrouver dans l'autre vue. Des fonctions pures, testées sans écran.

/** La part du parcours déjà faite : 0 en haut, 1 tout en bas ; 0 s'il n'y a rien à faire défiler. */
export function fractionDefilement(haut: number, hauteurTotale: number, hauteurVisible: number): number {
  const parcours = hauteurTotale - hauteurVisible;
  if (parcours <= 0) return 0;
  return Math.min(1, Math.max(0, haut / parcours));
}

/** La position de défilement qui correspond à une part du parcours. */
export function positionDeFraction(fraction: number, hauteurTotale: number, hauteurVisible: number): number {
  const parcours = hauteurTotale - hauteurVisible;
  if (parcours <= 0) return 0;
  return Math.round(Math.min(1, Math.max(0, fraction)) * parcours);
}
