<!--
  L'onglet « Raccourcis » de la barre latérale de l'éditeur : tous les outils de mise en forme Markdown, par groupe
  (titres, mise en forme, listes et blocs, insertions). Chacun agit sur la sélection, ou sur le mot ou la ligne du curseur.
-->
<script lang="ts">
  import type { Action } from '../formatage';
  import { GROUPES, infobulle } from '../outils';
  import Outil from './Outil.svelte';

  interface Props {
    appliquer: (action: Action) => void;
  }

  let { appliquer }: Props = $props();
</script>

{#each GROUPES as groupe (groupe.titre)}
  <section class="groupe" aria-label={groupe.titre}>
    <h4>{groupe.titre}</h4>
    <div class="outils" class:compact={groupe.compact === true}>
      {#each groupe.outils as outil (outil.action)}
        <Outil titre={infobulle(outil)} apparence={outil.apparence} onclick={() => appliquer(outil.action)}>
          {outil.libelle}
        </Outil>
      {/each}
    </div>
  </section>
{/each}

<style>
  .groupe {
    margin-top: 14px;
  }

  h4 {
    margin: 0 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--ligne);
    color: var(--cyan);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .outils {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 6px;
  }

  .outils.compact {
    grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  }
</style>
