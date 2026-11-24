<!--
  L'éditeur : le texte du document dans une zone de saisie, ses actions, et à droite une barre latérale à deux onglets :
  « Raccourcis » (la mise en forme Markdown : titres, gras, listes…) et « Plan » (les titres du document, cliquables). Le
  fichier lui-même est géré côté Rust (boîtes « Ouvrir » et « Enregistrer sous », copie avant remplacement) : ici,
  seulement le texte. Un seul bouton orange : « Enregistrer », sur le panneau accentué.
-->
<script lang="ts">
  import { libelleFins, nomAffiche, nombreDeLignes } from '../lib/documents';
  import { appliquer as appliquerAction, raccourciVersAction, type Action } from '../lib/formatage';
  import { extraireTitres, ligneDuCurseur, titreCourant, type Titre } from '../lib/plan';
  import type { Session } from '../lib/session.svelte.js';
  import { appliquerDansZone, defilerVersPosition } from '../lib/zoneTexte';
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

  const onglets = [
    { id: 'raccourcis', titre: 'Raccourcis' },
    { id: 'plan', titre: 'Plan' },
  ];
  const commentaires: Record<string, string> = {
    raccourcis:
      "Chaque bouton agit sur la sélection, ou sur le mot ou la ligne du curseur ; le même raccourci retire la mise en forme. Ctrl+Z annule.",
    plan: 'Un clic sur un titre place le curseur dessus et fait défiler le texte. Le titre sous lequel tu écris est marqué.',
  };

  let zone = $state<HTMLTextAreaElement | null>(null);
  let onglet = $state('raccourcis');
  /** La ligne du curseur, pour marquer le titre sous lequel on écrit. */
  let ligneCurseur = $state(0);

  const titre = $derived(`${nomAffiche(session.nom)}${session.modifie ? ' · modifié' : ''}`);
  const lignes = $derived(nombreDeLignes(session.contenu));
  const titres = $derived(extraireTitres(session.contenu));
  const courant = $derived(titreCourant(titres, ligneCurseur));

  function suivreCurseur() {
    if (zone) ligneCurseur = ligneDuCurseur(zone.value, zone.selectionStart);
  }

  /** Une mise en forme, sur ce qui est sélectionné dans la zone. */
  function appliquer(action: Action) {
    if (!zone || session.occupe) return;
    appliquerDansZone(zone, appliquerAction(action, zone.value, zone.selectionStart, zone.selectionEnd));
    suivreCurseur();
  }

  /** Un clic dans le plan : le curseur va au début du titre et le texte défile jusque-là. */
  function aller(cible: Titre) {
    if (!zone) return;
    zone.focus();
    zone.setSelectionRange(cible.debut, cible.debut);
    defilerVersPosition(zone, cible.debut);
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

<div class="espace">
  <Panneau {titre} accentue>
    <textarea
      class="code"
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
    ></textarea>
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

  <aside class="barre" aria-label="Barre latérale de l'éditeur">
    <Panneau titre="Outils">
      <SousOnglets {onglets} bind:actif={onglet} />
      <div class="commentaire"><ASavoir>{commentaires[onglet]}</ASavoir></div>
      {#if onglet === 'raccourcis'}
        <PanneauOutils {appliquer} />
      {:else}
        <PanneauPlan {titres} {courant} {aller} />
      {/if}
    </Panneau>
  </aside>
</div>

<style>
  .espace {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 16px;
    align-items: start;
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

  textarea {
    display: block;
    width: 100%;
    min-height: 56vh;
    padding: 12px 14px;
    border: 1px solid var(--ligne);
    background: var(--fond);
    color: var(--texte);
    font-size: 14px;
    line-height: 1.6;
    resize: vertical;
    tab-size: 4;
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
