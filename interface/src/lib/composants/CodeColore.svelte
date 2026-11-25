<!--
  Du code coloré : les nœuds que la coloration (coloration.ts) a tirés de highlight.js, dessinés un à un en texte et en
  <span>, jamais en HTML. Le balisage tient sur une seule ligne, sans espace ajouté : il est dans un <pre>, où chaque
  espace compte. Les couleurs sont celles du thème « GitHub sombre » de highlight.js, rangées par classe ; elles sont ici,
  avec :global, parce que les classes viennent des données.
-->
<script lang="ts">
  import type { NoeudCode } from '../coloration';
  import CodeColore from './CodeColore.svelte';

  interface Props {
    noeuds: NoeudCode[];
  }

  let { noeuds }: Props = $props();
</script>

{#each noeuds as noeud, i (i)}{#if 'texte' in noeud}{noeud.texte}{:else}<span class={noeud.classe}><CodeColore noeuds={noeud.enfants} /></span>{/if}{/each}

<style>
  :global(.hljs-doctag),
  :global(.hljs-keyword),
  :global(.hljs-meta .hljs-keyword),
  :global(.hljs-template-tag),
  :global(.hljs-template-variable),
  :global(.hljs-type),
  :global(.hljs-variable.language_) {
    color: #ff7b72;
  }

  :global(.hljs-title),
  :global(.hljs-title.class_),
  :global(.hljs-title.class_.inherited__),
  :global(.hljs-title.function_) {
    color: #d2a8ff;
  }

  :global(.hljs-attr),
  :global(.hljs-attribute),
  :global(.hljs-literal),
  :global(.hljs-meta),
  :global(.hljs-number),
  :global(.hljs-operator),
  :global(.hljs-variable),
  :global(.hljs-selector-attr),
  :global(.hljs-selector-class),
  :global(.hljs-selector-id) {
    color: #79c0ff;
  }

  :global(.hljs-regexp),
  :global(.hljs-string),
  :global(.hljs-meta .hljs-string) {
    color: #a5d6ff;
  }

  :global(.hljs-built_in),
  :global(.hljs-symbol) {
    color: #ffa657;
  }

  :global(.hljs-comment),
  :global(.hljs-code),
  :global(.hljs-formula) {
    color: #8b949e;
  }

  :global(.hljs-name),
  :global(.hljs-quote),
  :global(.hljs-selector-tag),
  :global(.hljs-selector-pseudo) {
    color: #7ee787;
  }

  :global(.hljs-subst) {
    color: #c9d1d9;
  }

  /* Le bleu du thème d'origine (#1f6feb) est trop sombre sur le fond d'Aria : celui-ci est le même, éclairci. */
  :global(.hljs-section) {
    color: #58a6ff;
    font-weight: 700;
  }

  :global(.hljs-bullet) {
    color: #f2cc60;
  }

  :global(.hljs-emphasis) {
    color: #c9d1d9;
    font-style: italic;
  }

  :global(.hljs-strong) {
    color: #c9d1d9;
    font-weight: 700;
  }

  :global(.hljs-addition) {
    background-color: #033a16;
    color: #aff5b4;
  }

  :global(.hljs-deletion) {
    background-color: #67060c;
    color: #ffdcd7;
  }
</style>
