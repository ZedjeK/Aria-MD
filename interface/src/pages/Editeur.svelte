<!--
  L'éditeur : le texte du document et son aperçu, en trois vues (Code, Aperçu, Double), ses actions, et à droite une
  barre latérale à deux onglets, repliable : « Raccourcis » (la mise en forme Markdown : titres, gras, listes…) et « Plan »
  (les titres du document, cliquables). Le fichier lui-même est géré côté Rust (boîtes « Ouvrir » et « Enregistrer sous »,
  copie avant remplacement) : ici, seulement le texte. Un seul bouton orange : « Enregistrer », sur le panneau accentué.
-->
<script lang="ts">
  import { fractionDefilement, positionDeFraction } from '../lib/defilement';
  import { libelleFins, nomAffiche, nombreDeLignes } from '../lib/documents';
  import { appliquer as appliquerAction, blocDeCodeEn, raccourciVersAction, type Action } from '../lib/formatage';
  import { analyser } from '../lib/markdown';
  import { extraireTitres, ligneDuCurseur, titreCourant, type Titre } from '../lib/plan';
  import type { Session } from '../lib/session.svelte.js';
  import { appliquerDansZone, defilerVersPosition } from '../lib/zoneTexte';
  import Apercu from '../lib/composants/Apercu.svelte';
  import ASavoir from '../lib/composants/ASavoir.svelte';
  import Bouton from '../lib/composants/Bouton.svelte';
  import Panneau from '../lib/composants/Panneau.svelte';
  import PanneauOutils from '../lib/composants/PanneauOutils.svelte';
  import PanneauPlan from '../lib/composants/PanneauPlan.svelte';
  import SousOnglets from '../lib/composants/SousOnglets.svelte';

  interface Props {
    session: Session;
    /** Ouvrir et nouveau passent par l'appli : elle demande d'abord quoi faire des modifications en cours. */
    ouvrir: () => void;
    nouveau: () => void;
  }

  let { session, ouvrir, nouveau }: Props = $props();

  const vues = [
    { id: 'code', titre: 'Code' },
    { id: 'apercu', titre: 'Aperçu' },
    { id: 'double', titre: 'Double' },
  ];
  const onglets = [
    { id: 'raccourcis', titre: 'Raccourcis' },
    { id: 'plan', titre: 'Plan' },
  ];
  const commentaires: Record<string, string> = {
    raccourcis:
      'Chaque bouton agit sur la sélection, ou sur le mot ou la ligne du curseur ; le même raccourci retire la mise en forme. Ctrl+Z annule.',
    plan: 'Un clic sur un titre place le curseur dessus et amène le code et l’aperçu jusque-là. Le titre sous lequel tu écris est marqué. Cherche un titre, replie ses sous-titres, ou numérote le plan.',
  };

  let zone = $state<HTMLTextAreaElement | null>(null);
  let cadreApercu = $state<HTMLDivElement | null>(null);
  /** « code », « apercu » ou « double ». */
  let vue = $state('double');
  let onglet = $state('raccourcis');
  let barreOuverte = $state(true);
  /** Le plan garde sa recherche, ses replis et ses numéros quand on passe à l'autre onglet. */
  let recherchePlan = $state('');
  let repliesPlan = $state<ReadonlySet<string>>(new Set());
  let numerotePlan = $state(false);
  /** La ligne du curseur, pour marquer le titre sous lequel on écrit. */
  let ligneCurseur = $state(0);
  /** Le texte que l'aperçu montre : il suit le texte avec un léger retard, pour ne pas ramer pendant la frappe. */
  let contenuApercu = $state('');

  let premierPassage = true;
  $effect(() => {
    const contenu = session.contenu;
    if (premierPassage) {
      premierPassage = false;
      contenuApercu = contenu;
      return;
    }
    const minuterie = setTimeout(() => {
      contenuApercu = contenu;
    }, 150);
    return () => clearTimeout(minuterie);
  });

  const titre = $derived(`${nomAffiche(session.nom)}${session.modifie ? ' · modifié' : ''}`);
  const lignes = $derived(nombreDeLignes(session.contenu));
  const titres = $derived(extraireTitres(session.contenu));
  const courant = $derived(titreCourant(titres, ligneCurseur));
  const blocs = $derived(vue === 'code' ? [] : analyser(contenuApercu));

  function suivreCurseur() {
    if (zone) ligneCurseur = ligneDuCurseur(zone.value, zone.selectionStart);
  }

  /** Une mise en forme, sur ce qui est sélectionné dans la zone. */
  function appliquer(action: Action) {
    if (!zone || session.occupe || vue === 'apercu') return;
    appliquerDansZone(zone, appliquerAction(action, zone.value, zone.selectionStart, zone.selectionEnd));
    suivreCurseur();
  }

  /** Un bloc de code dans le langage choisi : posé autour de la sélection, ou son langage change si le curseur est dedans. */
  function blocCodeEn(langage: string) {
    if (!zone || session.occupe || vue === 'apercu') return;
    appliquerDansZone(zone, blocDeCodeEn(langage, zone.value, zone.selectionStart, zone.selectionEnd));
    suivreCurseur();
  }

  // Le défilement lié : quand une vue défile, l'autre va à la même part du parcours. Un défilement fait par le code lui-même
  // ne doit pas rebondir sur l'autre vue : on ignore ses échos pendant un court moment.
  let silenceCode = 0;
  let silenceApercu = 0;

  function codeDefile() {
    if (vue !== 'double' || !zone || !cadreApercu || performance.now() < silenceCode) return;
    const part = fractionDefilement(zone.scrollTop, zone.scrollHeight, zone.clientHeight);
    const cible = positionDeFraction(part, cadreApercu.scrollHeight, cadreApercu.clientHeight);
    if (Math.abs(cible - cadreApercu.scrollTop) < 2) return;
    silenceApercu = performance.now() + 120;
    cadreApercu.scrollTop = cible;
  }

  function apercuDefile() {
    if (vue !== 'double' || !zone || !cadreApercu || performance.now() < silenceApercu) return;
    const part = fractionDefilement(cadreApercu.scrollTop, cadreApercu.scrollHeight, cadreApercu.clientHeight);
    const cible = positionDeFraction(part, zone.scrollHeight, zone.clientHeight);
    if (Math.abs(cible - zone.scrollTop) < 2) return;
    silenceCode = performance.now() + 120;
    zone.scrollTop = cible;
  }

  /** Un clic dans le plan : le curseur va au début du titre, et le code comme l'aperçu défilent jusque-là. */
  function aller(cible: Titre) {
    silenceCode = performance.now() + 200;
    silenceApercu = performance.now() + 200;
    if (zone && vue !== 'apercu') {
      zone.focus();
      zone.setSelectionRange(cible.debut, cible.debut);
      defilerVersPosition(zone, cible.debut);
    }
    if (cadreApercu && vue !== 'code') {
      const element = cadreApercu.querySelector(`:is(h1, h2, h3, h4, h5, h6)[data-ligne="${cible.ligne}"]`);
      if (element) {
        const decalage = element.getBoundingClientRect().top - cadreApercu.getBoundingClientRect().top;
        cadreApercu.scrollTop += decalage - 8;
      }
    }
    suivreCurseur();
  }

  function touche(e: KeyboardEvent) {
    const action = raccourciVersAction(e);
    if (action === null) return;
    e.preventDefault();
    appliquer(action);
  }

  function saisie(e: Event & { currentTarget: HTMLTextAreaElement }) {
    session.changer(e.currentTarget.value);
    suivreCurseur();
  }
</script>

<h1>Éditeur</h1>
<p class="sous-titre">
  Ouvre un fichier Markdown, modifie-le, enregistre-le. L'ancien contenu est gardé avant chaque remplacement.
</p>

{#if session.melange}
  <ASavoir>Ce fichier mélange des fins de ligne (LF et CRLF) : elles seront unifiées à l'enregistrement.</ASavoir>
{/if}

<div class="espace" class:sans-barre={!barreOuverte}>
  <Panneau {titre} accentue>
    <div class="entete-vues">
      <SousOnglets onglets={vues} bind:actif={vue} />
      <Bouton genre="discret" petit onclick={() => (barreOuverte = !barreOuverte)}>
        {barreOuverte ? 'Masquer la barre' : 'Afficher la barre'}
      </Bouton>
    </div>

    <div class="cadre-vues">
      <div class="vues" data-vue={vue}>
        <textarea
          class="code"
          class:cache={vue === 'apercu'}
          aria-label="Contenu du document"
          spellcheck="false"
          readonly={session.occupe}
          value={session.contenu}
          bind:this={zone}
          oninput={saisie}
          onkeydown={touche}
          onkeyup={suivreCurseur}
          onclick={suivreCurseur}
          onfocus={suivreCurseur}
          onscroll={codeDefile}
        ></textarea>
        <div class="cadre-apercu" class:cache={vue === 'code'} bind:this={cadreApercu} onscroll={apercuDefile}>
          <Apercu {blocs} />
        </div>
      </div>
    </div>

    <p class="infos code discret">
      {lignes}
      {lignes > 1 ? 'lignes' : 'ligne'} · {libelleFins(session.finsDeLigne)}{session.chemin ? ` · ${session.chemin}` : ''}
    </p>
    <div class="actions">
      <Bouton genre="discret" desactive={session.occupe} onclick={nouveau}>Nouveau</Bouton>
      <Bouton desactive={session.occupe} onclick={ouvrir}>Ouvrir</Bouton>
      <Bouton desactive={session.occupe} onclick={() => void session.enregistrerSous()}>Enregistrer sous</Bouton>
      <Bouton genre="principal" desactive={session.occupe} onclick={() => void session.enregistrer()}>
        Enregistrer
      </Bouton>
    </div>
  </Panneau>

  {#if barreOuverte}
    <aside class="barre" aria-label="Barre latérale de l'éditeur">
      <Panneau titre="Outils">
        <SousOnglets {onglets} bind:actif={onglet} />
        <div class="commentaire"><ASavoir>{commentaires[onglet]}</ASavoir></div>
        {#if onglet === 'raccourcis'}
          <PanneauOutils {appliquer} {blocCodeEn} desactive={vue === 'apercu'} />
        {:else}
          <PanneauPlan
            {titres}
            {courant}
            {aller}
            bind:recherche={recherchePlan}
            bind:replies={repliesPlan}
            bind:numerote={numerotePlan}
          />
        {/if}
      </Panneau>
    </aside>
  {/if}
</div>

<style>
  .espace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 16px;
    align-items: start;
  }

  .espace.sans-barre {
    grid-template-columns: minmax(0, 1fr);
  }

  /* Fenêtre étroite : la barre latérale passe sous le texte. */
  @media (max-width: 980px) {
    .espace {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .barre {
    position: sticky;
    top: 0;
  }

  .commentaire {
    margin-top: 10px;
  }

  .entete-vues {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .cadre-vues {
    container-type: inline-size;
  }

  /* Une vue seule remplit la place ; en vue Double, le code et l'aperçu sont l'un sous l'autre, ou côte à côte si la zone est large. */
  .vues {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    gap: 12px;
    height: clamp(360px, 62vh, 960px);
  }

  .vues[data-vue='double'] {
    grid-template-rows: repeat(2, minmax(0, 1fr));
  }

  @container (min-width: 900px) {
    .vues[data-vue='double'] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: minmax(0, 1fr);
    }
  }

  .cache {
    display: none;
  }

  textarea {
    display: block;
    width: 100%;
    height: 100%;
    padding: 12px 14px;
    border: 1px solid var(--ligne);
    background: var(--fond);
    color: var(--texte);
    font-size: 14px;
    line-height: 1.6;
    resize: none;
    tab-size: 4;
  }

  .cadre-apercu {
    height: 100%;
    padding: 14px 20px;
    overflow-y: auto;
    border: 1px solid var(--ligne);
    background: var(--fond);
  }

  .infos {
    margin: 10px 0 0;
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
  }
</style>
