<script>
  import { user } from "../../user";

  let username;
  let password;

  function login() {
    user.auth(username, password, ({ err }) => err && alert(err));
  }

  function signup() {
    user.create(username, password, ({ err }) => {
      if (err) {
        alert(err);
      } else {
        login();
      }
    });
  }
</script>

<main>
  <form on:submit|preventDefault>
    <label for="username">Username</label>
    <input name="username" bind:value={username} minlength="3" maxlength="16" />

    <label for="password">Password</label>
    <input name="password" bind:value={password} type="password" />

    <button class="login" on:click={login}>Login</button>
    <button class="login" on:click={signup}>Sign Up</button>
  </form>
</main>

<style>
  main {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  form {
    width: 250px;
    height: 300px;
    padding: max(2%, 20px);
    flex: 0.1 1;

    display: flex;
    flex-direction: column;

    border-bottom: 4px solid var(--color-3);
    border-radius: 20px;

    background-color: var(--color-5);
    font-size: 18px;
  }

  label {
    margin-bottom: 3px;
  }

  input {
    margin-bottom: 16px;
    padding: 3px;
    /* outline: none; */
    border: none;
    border-radius: 6px;

    font-size: inherit;
  }

  input:focus {
    outline-color: var(--color-accent);
  }

  button {
    margin-top: 12px;
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
