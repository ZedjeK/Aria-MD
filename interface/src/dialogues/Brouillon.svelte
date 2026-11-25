<!--
  Le dialogue « Brouillon retrouvé », posé sur la page au lancement quand l'appli s'est arrêtée avant d'enregistrer : le texte
  était gardé en brouillon. « Récupérer » le reprend comme un document sans fichier, à enregistrer sous un nom ; « Supprimer »
  l'efface. Rien n'est écrit dans un fichier de l'utilisateur ici.
-->
<script lang="ts">
  import { origineBrouillon, nombreDeLignes } from '../lib/documents';
  import type { BrouillonRetrouve } from '../lib/api';
  import ASavoir from '../lib/composants/ASavoir.svelte';
  import Bouton from '../lib/composants/Bouton.svelte';
  import Dialogue from '../lib/composants/Dialogue.svelte';
  import Panneau from '../lib/composants/Panneau.svelte';

  interface Props {
    brouillon: BrouillonRetrouve;
    recuperer: () => void;
    supprimer: () => void;
  }

  let { brouillon, recuperer, supprimer }: Props = $props();

  const lignes = $derived(nombreDeLignes(brouillon.contenu));
  /** Les premières lignes : de quoi reconnaître son texte. */
  const debut = $derived(brouillon.contenu.split('\n').slice(0, 6).join('\n').slice(0, 400));
</script>

<Dialogue titre="Brouillon retrouvé" fermer={recuperer}>
  <ASavoir>
    L'appli s'est arrêtée avant d'enregistrer. Le texte était gardé en brouillon ; ton fichier d'origine n'a pas été touché.
  </ASavoir>

  <Panneau titre="Ce qui a été retrouvé" accentue>
    <p class="origine">
      {origineBrouillon(brouillon.nom, brouillon.date)} · {lignes}
      {lignes > 1 ? 'lignes' : 'ligne'}
    </p>
    <pre class="debut code">{debut}</pre>
  </Panneau>

  {#snippet pied()}
    <Bouton genre="discret" onclick={supprimer}>Supprimer le brouillon</Bouton>
    <Bouton genre="principal" onclick={recuperer}>Récupérer</Bouton>
  {/snippet}
</Dialogue>

<style>
  .origine {
    margin: 0 0 10px;
  }

  .debut {
    max-height: 160px;
    margin: 0;
    padding: 10px 12px;
    overflow: auto;
    border: 1px solid var(--ligne);
    background: var(--fond);
    color: var(--texte-2);
    font-size: 12px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
