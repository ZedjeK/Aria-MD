<!--
  L'onglet « Plan » de la barre latérale de l'éditeur : les titres du document en puces, indentés selon leur niveau. Un
  clic sur un titre place le curseur dessus ; celui sous lequel se trouve le curseur est marqué.
-->
<script lang="ts">
  import type { Titre } from '../plan';

  interface Props {
    titres: Titre[];
    /** L'indice du titre sous le curseur dans `titres` ; -1 avant le premier titre. */
    courant: number;
    aller: (titre: Titre) => void;
  }

  let { titres, courant, aller }: Props = $props();
</script>

{#if titres.length === 0}
  <p class="vide">Aucun titre pour l'instant. Écris « # Titre », ou utilise les boutons H1 à H6 de l'onglet Raccourcis.</p>
{:else}
  <nav aria-label="Plan du document">
    <ul>
      {#each titres as titre, i (titre.debut)}
        <li style:padding-left={`${(titre.niveau - 1) * 14}px`}>
          <button
            type="button"
            class="titre"
            class:courant={i === courant}
            aria-current={i === courant ? 'location' : undefined}
            onmousedown={(e) => e.preventDefault()}
            onclick={() => aller(titre)}
          >
            <span class="puce" aria-hidden="true"></span>{titre.texte}
          </button>
        </li>
      {/each}
    </ul>
  </nav>
{/if}

<style>
  .vide {
    margin: 14px 0 0;
    color: var(--texte-2);
  }

  ul {
    margin: 10px 0 0;
    padding: 0;
    list-style: none;
  }

  .titre {
    display: flex;
    align-items: baseline;
    gap: 8px;
    width: 100%;
    padding: 5px 8px;
    border: 0;
    border-left: 2px solid transparent;
    background: none;
    color: var(--texte);
    cursor: pointer;
    font: inherit;
    text-align: left;
  }

  .titre:hover,
  .titre:focus-visible {
    background: color-mix(in srgb, var(--cyan) 10%, transparent);
  }

  .puce {
    flex: none;
    width: 6px;
    height: 6px;
    background: var(--bleu);
  }

  .courant {
    border-left-color: var(--cyan);
    color: var(--cyan);
  }

  .courant .puce {
    background: var(--cyan);
  }
</style>
