<script>
    import GUN from "gun";
    import { onMount } from "svelte";
    import { channel } from "../../channel";
    import { username } from "../../user";
    import Draft from "./Draft.svelte";
    import { draft_open } from "./draft_store";
    import ChatMessage from "./Post.svelte";
    const db = GUN();

    let messages = [];

    onMount(() => {
        const match = {
            // lexical queries are kind of like a limited RegEx or Glob.
            ".": {
                // property selector
                ">": new Date(
                    +new Date() - 1 * 1000 * 60 * 60 * 36
                ).toISOString(), // find any indexed property within a time (36h)
            },
            "-": 1, // filter in reverse
        };

        // Get Messages
        db.get("dxexithis@-" + channel)
            .map(match)
            .once(async (data, id) => {
                if (data) {
                    // Key for end-to-end encryption (unset, can be read and set from user if needed)
                    const key = "#dxexit";

                    var message = {
                        // transform the data
                        who: await db.user(data).get("alias"), // a user might lie who they are! So let the user system detect whose data it is.
                        what: (await SEA.decrypt(data.what, key)) + "", // force decrypt as text.
                        when: GUN.state.is(data, "what"), // get the internal timestamp for the what property.
                    };

                    if (message.what) {
                        messages = [...messages.slice(-100), message].sort(
                            (a, b) => b.when - a.when
                        );
                    }
                }
            });
    });

    function show_draft() {
        draft_open.set(true);
    }
</script>

<main>
    <div class="history">
        {#each messages as message (message.when)}
            <ChatMessage {message} />
        {/each}
    </div>
    <button on:click={show_draft}>+</button>
</main>

<Draft active={$draft_open} />

<style>
    main {
        width: 100vw;
        height: 100%;

        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;

        position: relative;

        background-color: var(--color-2);
    }

    .history {
        width: 100vw;

        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
        flex-grow: 1;

        overflow-x: hidden;
        overflow-y: scroll;
    }

    button {
        width: 32px;
        height: 32px;
        position: absolute;
        top: 10px;
        right: 10px;

        display: flex;
        justify-content: center;
        align-items: center;

        outline: 2px solid var(--color-3);
        border: none;
        border-radius: 6px;

        background-color: var(--color-5);
        color: var(--color-3);
        font-size: 24px;

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
