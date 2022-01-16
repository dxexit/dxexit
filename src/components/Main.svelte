<script>
  import { channel } from "../channel";
  import { username } from "../user";
  import Channel from "./routes/Channel.svelte";
  import Home from "./routes/Home.svelte";
  import Login from "./routes/Login.svelte";
</script>

{#if $username}
  {#if channel}
    <Channel />
  {:else}
    <Home />
  {/if}
{:else}
  <Login />
{/if}
