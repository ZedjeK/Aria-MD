<!--
  Fond animé « Markdown qui se rend » : la zone principale seulement, jamais sous le menu latéral ; les panneaux, opaques,
  passent dessus. Des lignes de Markdown fantômes (# Titre, **gras**, ==surligné==…) s'écrivent, se rendent (le dièse devient
  un titre, les astérisques disparaissent, le surligné passe à l'orange), restent un moment, puis s'effacent. Le moment, la
  durée, le contenu et ce qui se rend sont tirés au hasard. Les règles (coupé, en pause, durée, nombre de lignes) sont dans
  lib\fond.ts ; les modèles et le cycle de vie, dans lib\fondMarkdown.ts : ce composant ne fait que dessiner.
-->
<script lang="ts">
  import type { ReglagesFond } from '../api';
  import { dureePassage, modeFond, tirage } from '../fond';
  import {
    RANGEES,
    caracteresEcrits,
    dureeDeVie,
    etape,
    opacite,
    partRendu,
    partSource,
    rangeeLibre,
    tirerModele,
    type Modele,
    type Style,
  } from '../fondMarkdown';

  interface Props {
    reglages: ReglagesFond;
  }

  let { reglages }: Props = $props();

  const moinsAnimations = matchMedia('(prefers-reduced-motion: reduce)');
  let toile = $state<HTMLCanvasElement | undefined>();
  let visible = $state(!document.hidden);
  let animations = $state(!moinsAnimations.matches);
  const mode = $derived(modeFond(reglages, visible, animations));

  /** Une ligne fantôme : où elle est, quand elle naît, combien de temps elle vit. */
  interface Ligne {
    modele: Modele;
    rangee: number;
    /** Sa place de gauche à droite, en part de la largeur. */
    x: number;
    naissance: number;
    vie: number;
    echelle: number;
  }

  // Windows qui change de réglage, fenêtre cachée ou réduite : le fond suit, sans redémarrer l'appli.
  $effect(() => {
    const surMouvement = () => (animations = !moinsAnimations.matches);
    const surVisibilite = () => (visible = !document.hidden);
    moinsAnimations.addEventListener('change', surMouvement);
    document.addEventListener('visibilitychange', surVisibilite);
    return () => {
      moinsAnimations.removeEventListener('change', surMouvement);
      document.removeEventListener('visibilitychange', surVisibilite);
    };
  });

  $effect(() => {
    const canvas = toile;
    const contexte = canvas?.getContext('2d');
    if (!canvas || !contexte) return;
    if (mode !== 'actif') {
      contexte.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const style = getComputedStyle(canvas);
    const couleur = (nom: string) => style.getPropertyValue(nom).trim();
    const teintes = {
      texte: couleur('--texte'),
      discret: couleur('--texte-2'),
      cyan: couleur('--cyan'),
      bleu: couleur('--bleu'),
      orange: couleur('--orange'),
      fond: couleur('--fond'),
      panneau: couleur('--panneau'),
      ligne: couleur('--ligne'),
    };
    const policeCode = couleur('--police-code') || 'monospace';
    const policeTexte = couleur('--police') || 'sans-serif';
    const moyenne = dureePassage(reglages.vitesse) * 1.6;
    const fond = { ...reglages };

    let lignes: Ligne[] = [];
    let cible = tirage(fond);

    const naitre = (maintenant: number, etale: number) => {
      lignes.push({
        modele: tirerModele(),
        rangee: rangeeLibre(new Set(lignes.map((l) => l.rangee))),
        x: 0.03 + Math.random() * 0.5,
        naissance: maintenant + Math.random() * moyenne * etale,
        vie: dureeDeVie(moyenne),
        echelle: 0.9 + Math.random() * 0.3,
      });
    };
    // Au départ, elles naissent à des moments différents : le fond ne démarre pas en rang.
    const depart = performance.now();
    for (let i = 0; i < cible; i += 1) naitre(depart, 0.6);

    /** La police d'un morceau de texte rendu, et sa couleur. */
    const mise = (s: Style, taille: number): { police: string; teinte: string } => {
      switch (s) {
        case 'titre1':
          return { police: `700 ${taille * 1.6}px ${policeTexte}`, teinte: teintes.cyan };
        case 'titre2':
          return { police: `700 ${taille * 1.3}px ${policeTexte}`, teinte: teintes.cyan };
        case 'gras':
          return { police: `700 ${taille}px ${policeTexte}`, teinte: teintes.texte };
        case 'italique':
          return { police: `italic 500 ${taille}px ${policeTexte}`, teinte: teintes.discret };
        case 'surligne':
          return { police: `600 ${taille}px ${policeTexte}`, teinte: teintes.fond };
        case 'code':
          return { police: `500 ${taille * 0.95}px ${policeCode}`, teinte: teintes.cyan };
        case 'lien':
          return { police: `500 ${taille}px ${policeTexte}`, teinte: teintes.cyan };
        case 'puce':
          return { police: `700 ${taille}px ${policeTexte}`, teinte: teintes.bleu };
        default:
          return { police: `500 ${taille}px ${policeTexte}`, teinte: teintes.discret };
      }
    };

    const dessinerRendu = (ligne: Ligne, x: number, y: number, taille: number, ratio: number) => {
      let cx = x;
      for (const segment of ligne.modele.rendu) {
        const { police, teinte } = mise(segment.style, taille);
        contexte.font = police;
        const largeur = contexte.measureText(segment.texte).width;
        if (segment.style === 'surligne') {
          // Le surligné passe à l'orange : une pastille derrière, le texte sombre dessus.
          contexte.fillStyle = teintes.orange;
          contexte.fillRect(cx - 3 * ratio, y - taille * 0.95, largeur + 6 * ratio, taille * 1.3);
        } else if (segment.style === 'code') {
          contexte.fillStyle = teintes.panneau;
          contexte.fillRect(cx - 4 * ratio, y - taille * 0.95, largeur + 8 * ratio, taille * 1.3);
          contexte.strokeStyle = teintes.ligne;
          contexte.lineWidth = ratio;
          contexte.strokeRect(cx - 4 * ratio, y - taille * 0.95, largeur + 8 * ratio, taille * 1.3);
        } else if (segment.style === 'citation') {
          contexte.fillStyle = teintes.bleu;
          contexte.fillRect(cx - 10 * ratio, y - taille * 0.95, 3 * ratio, taille * 1.3);
        }
        contexte.fillStyle = teinte;
        contexte.fillText(segment.texte, cx, y);
        if (segment.style === 'barre' || segment.style === 'lien') {
          const trait = segment.style === 'barre' ? y - taille * 0.3 : y + 3 * ratio;
          contexte.fillRect(cx, trait, largeur, Math.max(1, ratio));
        }
        cx += largeur;
      }
    };

    let image = 0;
    const dessiner = (maintenant: number) => {
      const ratio = window.devicePixelRatio || 1;
      const largeur = Math.round(canvas.clientWidth * ratio);
      const hauteur = Math.round(canvas.clientHeight * ratio);
      if (canvas.width !== largeur || canvas.height !== hauteur) {
        canvas.width = largeur;
        canvas.height = hauteur;
      }
      // Les lignes finies s'en vont, de nouvelles naissent : leur nombre suit un tirage, renouvelé à chaque départ.
      const avant = lignes.length;
      lignes = lignes.filter((l) => maintenant < l.naissance + l.vie);
      if (lignes.length < avant) cible = tirage(fond);
      while (lignes.length < cible) naitre(maintenant, 0.35);

      contexte.clearRect(0, 0, largeur, hauteur);
      contexte.textBaseline = 'alphabetic';
      for (const ligne of lignes) {
        const t = (maintenant - ligne.naissance) / ligne.vie;
        if (t <= 0) continue;
        const e = etape(t);
        const taille = 14 * ratio * ligne.echelle;
        const x = ligne.x * largeur;
        const y = ((ligne.rangee + 0.5) / RANGEES) * hauteur;
        const base = 0.5 * opacite(e);

        const source = partSource(e);
        if (source > 0 && base > 0) {
          const caracteres = e.phase === 'ecriture' ? caracteresEcrits(e.progression, ligne.modele.source.length) : ligne.modele.source.length;
          const texte = ligne.modele.source.slice(0, caracteres);
          contexte.font = `500 ${taille}px ${policeCode}`;
          contexte.globalAlpha = base * source;
          contexte.fillStyle = teintes.bleu;
          contexte.fillText(texte, x, y);
          // Le curseur d'écriture clignote au bout du texte, tant que la ligne s'écrit.
          if (e.phase === 'ecriture' && Math.floor(maintenant / 450) % 2 === 0) {
            contexte.fillStyle = teintes.cyan;
            contexte.fillRect(x + contexte.measureText(texte).width + 2 * ratio, y - taille * 0.85, 1.5 * ratio, taille);
          }
        }
        const rendu = partRendu(e);
        if (rendu > 0 && base > 0) {
          contexte.globalAlpha = base * rendu;
          dessinerRendu(ligne, x, y, taille, ratio);
        }
      }
      contexte.globalAlpha = 1;
      image = requestAnimationFrame(dessiner);
    };

    image = requestAnimationFrame(dessiner);
    return () => cancelAnimationFrame(image);
  });
</script>

<canvas bind:this={toile} class="fond" aria-hidden="true"></canvas>

<style>
  .fond {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
  }
</style>
