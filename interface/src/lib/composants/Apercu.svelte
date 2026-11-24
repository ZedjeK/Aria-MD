<!--
  L'aperçu d'un document Markdown : les blocs du moteur (markdown.ts), dessinés dans les couleurs d'Aria. Tous les styles
  sont ici, avec :global, parce que les éléments sont dessinés par les composants BlocMd et EnLigneMd. Rien n'est jamais
  chargé depuis un document : ni image, ni adresse, ni HTML.
-->
<script lang="ts">
  import type { Bloc } from '../markdown';
  import BlocMd from './BlocMd.svelte';

  interface Props {
    blocs: Bloc[];
  }

  let { blocs }: Props = $props();
</script>

<div class="rendu">
  {#if blocs.length === 0}
    <p class="vide">Rien à montrer pour l'instant : l'aperçu se remplit pendant que tu écris.</p>
  {:else}
    {#each blocs as bloc, i (i)}<BlocMd {bloc} />{/each}
  {/if}
</div>

<style>
  .rendu {
    color: var(--texte);
    line-height: 1.65;
    overflow-wrap: anywhere;
  }

  .rendu > :global(:first-child) {
    margin-top: 0;
  }

  .vide {
    margin: 0;
    color: var(--texte-2);
  }

  .rendu :global(h1),
  .rendu :global(h2),
  .rendu :global(h3),
  .rendu :global(h4),
  .rendu :global(h5),
  .rendu :global(h6) {
    margin: 1.3em 0 0.5em;
    line-height: 1.25;
    font-weight: 600;
  }

  .rendu :global(h1) {
    padding-bottom: 6px;
    border-bottom: 1px solid var(--ligne);
    font-size: 26px;
  }

  .rendu :global(h2) {
    padding-bottom: 4px;
    border-bottom: 1px solid var(--ligne);
    font-size: 21px;
  }

  .rendu :global(h3) {
    font-size: 18px;
  }

  .rendu :global(h4) {
    font-size: 16px;
  }

  .rendu :global(h5) {
    font-size: 14px;
  }

  .rendu :global(h6) {
    color: var(--texte-2);
    font-size: 13px;
  }

  .rendu :global(p) {
    margin: 0 0 0.9em;
  }

  .rendu :global(strong) {
    font-weight: 700;
  }

  .rendu :global(del) {
    color: var(--texte-2);
  }

  .rendu :global(mark) {
    padding: 0 3px;
    background: var(--orange);
    color: var(--fond);
  }

  .rendu :global(code) {
    padding: 1px 5px;
    border: 1px solid var(--ligne);
    background: var(--panneau);
    font-family: var(--police-code);
    font-size: 0.92em;
  }

  .rendu :global(pre) {
    position: relative;
    margin: 0 0 1em;
    padding: 12px 14px;
    overflow-x: auto;
    border: 1px solid var(--ligne);
    background: var(--panneau);
    line-height: 1.5;
  }

  .rendu :global(pre code) {
    padding: 0;
    border: 0;
    background: none;
    font-size: 13px;
    white-space: pre;
  }

  .rendu :global(.langage) {
    position: absolute;
    top: 4px;
    right: 8px;
    color: var(--texte-2);
    font: 700 10px var(--police);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .rendu :global(blockquote) {
    margin: 0 0 1em;
    padding: 2px 16px;
    border-left: 3px solid var(--bleu);
    color: var(--texte-2);
  }

  .rendu :global(ul),
  .rendu :global(ol) {
    margin: 0 0 0.9em;
    padding-left: 1.7em;
  }

  .rendu :global(li) {
    margin: 0.25em 0;
  }

  /* Une liste serrée n'écarte pas ses paragraphes. */
  .rendu :global(.serree p) {
    margin: 0;
  }

  .rendu :global(li.tache) {
    display: flex;
    gap: 8px;
    margin-left: -1.4em;
    list-style: none;
  }

  .rendu :global(li.tache > div) {
    flex: 1;
    min-width: 0;
  }

  .rendu :global(li.tache input) {
    flex: none;
    margin-top: 0.4em;
  }

  .rendu :global(hr) {
    margin: 1.5em 0;
    border: 0;
    border-top: 1px solid var(--ligne);
  }

  .rendu :global(.tableau) {
    margin: 0 0 1em;
    overflow-x: auto;
  }

  .rendu :global(table) {
    border-collapse: collapse;
  }

  .rendu :global(th),
  .rendu :global(td) {
    padding: 6px 12px;
    border: 1px solid var(--ligne);
  }

  .rendu :global(th) {
    background: var(--panneau);
    font-weight: 700;
  }

  .rendu :global(.lien) {
    color: var(--cyan);
    text-decoration: underline;
  }

  .rendu :global(.image) {
    display: inline-block;
    padding: 2px 10px;
    border: 1px dashed var(--ligne);
    color: var(--texte-2);
    font-size: 12px;
  }
</style>
