<!--
  Un outil de la barre latérale de l'éditeur : un petit bouton en biais qui applique une mise en forme. Il ne prend pas le
  focus à la souris : la zone de texte garde sa sélection, et c'est sur elle que l'outil agit.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** L'infobulle et le nom du bouton pour les lecteurs d'écran : description et raccourci. */
    titre: string;
    onclick: () => void;
    /** Le libellé montre la mise en forme que le bouton applique. */
    apparence?: 'gras' | 'italique' | 'barre' | 'souligne' | 'surligne' | 'code' | undefined;
    children: Snippet;
  }

  let { titre, onclick, apparence, children }: Props = $props();
</script>

<button type="button" class="outil" title={titre} aria-label={titre} onmousedown={(e) => e.preventDefault()} {onclick}>
  <span
    class:gras={apparence === 'gras'}
    class:italique={apparence === 'italique'}
    class:barre={apparence === 'barre'}
    class:souligne={apparence === 'souligne'}
    class:surligne={apparence === 'surligne'}
    class:code={apparence === 'code'}>{@render children()}</span
  >
</button>

<style>
  .outil {
    --biais: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
    min-width: 0;
    height: 30px;
    padding: 1px;
    border: 0;
    cursor: pointer;
    clip-path: var(--biais);
    background: var(--cyan);
    color: var(--cyan);
    font: 600 12px var(--police);
  }

  .outil span {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0 10px;
    clip-path: var(--biais);
    background: var(--panneau);
    white-space: nowrap;
  }

  .outil:hover span,
  .outil:focus-visible span {
    background: color-mix(in srgb, var(--cyan) 14%, var(--panneau));
  }

  .outil .gras {
    font-weight: 800;
  }

  .outil .italique {
    font-style: italic;
  }

  .outil .barre {
    text-decoration: line-through;
  }

  .outil .souligne {
    text-decoration: underline;
  }

  .outil .surligne {
    background: var(--orange);
    color: var(--fond);
  }

  .outil .code {
    font-family: var(--police-code);
    font-weight: 500;
  }
</style>
