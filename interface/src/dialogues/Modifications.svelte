<!--
  Le dialogue « Enregistrer les modifications ? », posé sur la page quand on ouvre un autre document, qu'on en
  commence un nouveau ou qu'on ferme la fenêtre alors que le texte a des modifications non enregistrées.
-->
<script lang="ts">
  import ASavoir from '../lib/composants/ASavoir.svelte';
  import Bouton from '../lib/composants/Bouton.svelte';
  import Dialogue from '../lib/composants/Dialogue.svelte';
  import Panneau from '../lib/composants/Panneau.svelte';

  interface Props {
    nom: string;
    /** Un enregistrement est en cours : rien ne se ferme ni ne se choisit avant la fin. */
    occupe: boolean;
    enregistrer: () => void;
    abandonner: () => void;
    annuler: () => void;
  }

  let { nom, occupe, enregistrer, abandonner, annuler }: Props = $props();
</script>

<Dialogue titre="Enregistrer les modifications ?" fermer={() => !occupe && annuler()}>
  <ASavoir>Rien n'est écrit tant que tu n'as pas choisi. « Annuler » te laisse sur le document.</ASavoir>

  <Panneau titre="Modifications non enregistrées" accentue>
    <p>
      « <strong>{nom}</strong> » a des modifications qui ne sont pas enregistrées. Si tu ne les enregistres pas,
      elles sont perdues.
    </p>
  </Panneau>

  {#snippet pied()}
    <Bouton genre="discret" desactive={occupe} onclick={annuler}>Annuler</Bouton>
    <Bouton desactive={occupe} onclick={abandonner}>Ne pas enregistrer</Bouton>
    <Bouton genre="principal" desactive={occupe} onclick={enregistrer}>Enregistrer</Bouton>
  {/snippet}
</Dialogue>

<style>
  p {
    margin: 0;
  }
</style>
