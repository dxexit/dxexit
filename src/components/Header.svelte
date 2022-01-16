<script>
  import { username, user } from "../user";
  import { channel, get_and_load_channel } from "../channel";

  function signout() {
    user.leave();
    username.set("");
  }
</script>

<header>
  <a href="./"><img src="./favicon.png" alt="forus" class="icon"></a>

  {#if get_and_load_channel()}
    <span class="channel">/{channel}</span>
  {/if}

  {#if $username}
    <div class="user-bio">
      <strong>@{$username}</strong>
    </div>

    <button class="signout-button" on:click={signout}>Sign Out</button>
  {/if}
</header>

<style>
  header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;

    padding: 16px;

    background-color: var(--color-4);
  }

  .icon {
    width: 4em;
  }

  .channel {
    font-size: smaller;
  }

  h1 {
    font-size: 20px;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  .user-bio {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  button {
    width: 6em;
    align-self: center;

    padding: 3px;
    outline: none;
    border: none;
    border-radius: 6px;

    background-color: var(--color-1);
    color: var(--color-5);
    font-size: inherit;

    cursor: pointer;

    transition: background-color 50ms;
  }

  button:active,
  button:focus {
    background-color: var(--color-2);
    color: var(--color-6);
  }

  button:focus {
    outline: 2px solid var(--color-accent);
  }
</style>
