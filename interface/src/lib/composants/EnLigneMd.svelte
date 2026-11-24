<!--
  Le texte en ligne de l'aperçu Markdown : gras, italique, code, liens… dessinés élément par élément à partir de l'arbre du
  moteur (markdown.ts). Le texte passe toujours par une interpolation, jamais par du HTML : un document ne peut rien
  exécuter ici. Un lien montre son adresse en infobulle mais ne mène nulle part, et une image n'est jamais chargée.
-->
<script lang="ts">
  import type { EnLigne } from '../markdown';
  import EnLigneMd from './EnLigneMd.svelte';

  interface Props {
    noeuds: EnLigne[];
  }

  let { noeuds }: Props = $props();
</script>

{#each noeuds as noeud, i (i)}{#if noeud.type === 'texte'}{noeud.texte}{:else if noeud.type === 'gras'}<strong><EnLigneMd noeuds={noeud.enfants} /></strong>{:else if noeud.type === 'italique'}<em><EnLigneMd noeuds={noeud.enfants} /></em>{:else if noeud.type === 'barre'}<del><EnLigneMd noeuds={noeud.enfants} /></del>{:else if noeud.type === 'surligne'}<mark><EnLigneMd noeuds={noeud.enfants} /></mark>{:else if noeud.type === 'souligne'}<u><EnLigneMd noeuds={noeud.enfants} /></u>{:else if noeud.type === 'code'}<code>{noeud.texte}</code>{:else if noeud.type === 'lien'}<span class="lien" title={noeud.adresse}><EnLigneMd noeuds={noeud.enfants} /></span>{:else if noeud.type === 'image'}<span class="image" title={noeud.adresse}>Image : {noeud.alt === '' ? 'sans texte' : noeud.alt}</span>{:else}<br />{/if}{/each}
