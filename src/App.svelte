<script>
  import Main from "./components/Main.svelte";
  import Header from "./components/Header.svelte";
  import { get_and_load_channel } from "./channel";
  import { onMount } from "svelte";

  onMount(() => {
    get_and_load_channel();
  });
</script>

<Header />
<Main />
