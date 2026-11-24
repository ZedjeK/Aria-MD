<!--
  L'éditeur : le texte du document dans une zone de saisie, avec ses actions. Le fichier lui-même est géré côté Rust
  (boîtes « Ouvrir » et « Enregistrer sous », copie avant remplacement) : ici, seulement le texte. Un seul bouton
  orange : « Enregistrer », sur le panneau accentué.
-->
<script lang="ts">
  import { libelleFins, nomAffiche, nombreDeLignes } from '../lib/documents';
  import type { Session } from '../lib/session.svelte.js';
  import ASavoir from '../lib/composants/ASavoir.svelte';
  import Bouton from '../lib/composants/Bouton.svelte';
  import Panneau from '../lib/composants/Panneau.svelte';

  interface Props {
    session: Session;
    /** Ouvrir et nouveau passent par l'appli : elle demande d'abord quoi faire des modifications en cours. */
    ouvrir: () => void;
    nouveau: () => void;
  }

  let { session, ouvrir, nouveau }: Props = $props();

  const titre = $derived(`${nomAffiche(session.nom)}${session.modifie ? ' · modifié' : ''}`);
  const lignes = $derived(nombreDeLignes(session.contenu));
</script>

<h1>Éditeur</h1>
<p class="sous-titre">
  Ouvre un fichier Markdown, modifie-le, enregistre-le. L'ancien contenu est gardé avant chaque remplacement.
</p>

{#if session.melange}
  <ASavoir>Ce fichier mélange des fins de ligne (LF et CRLF) : elles seront unifiées à l'enregistrement.</ASavoir>
{/if}

<Panneau {titre} accentue>
  <textarea
    class="code"
    aria-label="Contenu du document"
    spellcheck="false"
    readonly={session.occupe}
    value={session.contenu}
    oninput={(e) => session.changer(e.currentTarget.value)}
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

<style>
  textarea {
    display: block;
    width: 100%;
    min-height: 50vh;
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
