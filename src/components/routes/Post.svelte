<script>
  import { markdown_to_html } from "../../convert";

  export let message;

  const ts = new Date(message.when);
</script>

<section>
  <div class="sender">
    <span class="user">@{message.who}</span>
    <time>{ts.toLocaleTimeString()}</time>
  </div>
  <div class="content markdown-body">
    {@html markdown_to_html(message.what)}
  </div>
</section>

<style>
  section {
    width: 50%;
    min-width: 335px;
    
    flex: 0.1 0 auto;

    display: grid;
    grid-template-columns: 100%;
    grid-template-rows: min-content auto;

    overflow: auto;

    margin: 16px;

    border: 1px solid var(--color-1);
    border-radius: 4px;

    font-size: 14px;

    background-color: var(--color-6);
  }

  .sender {
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    padding: 0.5em;

    background-color: var(--color-5);
  }

  .user {
    color: var(--color-2);
  }

  time {
    font-size: smaller;
    color: var(--color-3);
  }

  .content {
    width: 100%;
    margin: 6px 0px 6px 0px;
  }

  :global(.content :not(img)) {
    margin: 10px;
  }
</style>
