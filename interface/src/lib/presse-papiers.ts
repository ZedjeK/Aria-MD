// Copier un texte dans le presse-papiers de Windows. L'API du navigateur d'abord ; si WebView2 la refuse, un repli par une
// zone de saisie cachée et la commande « copy ». Aucune permission de Tauri n'est nécessaire : c'est un geste de
// l'utilisateur (un clic) dans la page.

/** Copie le texte ; renvoie false si ni l'API ni le repli n'ont pu le faire. */
export async function copier(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    // Pas d'API, ou elle a refusé : le repli ci-dessous.
    return copierParSelection(texte);
  }
}

function copierParSelection(texte: string): boolean {
  const zone = document.createElement('textarea');
  zone.value = texte;
  zone.setAttribute('readonly', '');
  zone.setAttribute('aria-hidden', 'true');
  // Hors de l'écran, sans bloquer le défilement de la page ni prendre le focus durablement.
  zone.style.position = 'fixed';
  zone.style.top = '0';
  zone.style.left = '-9999px';
  document.body.append(zone);
  const precedent = document.activeElement;
  zone.select();
  let fait = false;
  try {
    fait = document.execCommand('copy');
  } catch {
    fait = false;
  } finally {
    zone.remove();
    if (precedent instanceof HTMLElement) precedent.focus();
  }
  return fait;
}
