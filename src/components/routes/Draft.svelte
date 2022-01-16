<script>
    import { channel } from "../../channel";
    import { markdown_to_html } from "../../convert";
    import { db, user } from "../../user";
    import { draft_open } from "./draft_store";

    let text = "";

    async function send_message() {
        let next_text = text.trim();

        if (next_text) {
            text = "";
            next_text = markdown_to_html(next_text);
            console.log(next_text);
            if (next_text) {
                const secret = await SEA.encrypt(next_text, "#dxexit");
                const message = user.get("all").set({ what: secret });
                const index = new Date().toISOString();
                db.get("dxexithis@-" + channel)
                    .get(index)
                    .put(message);

                window.location.reload();
            }
        }
    }

    function close_draft() {
        draft_open.set(false);
    }
</script>

<div class={$draft_open ? "modal fade-in" : "modal hidden"}>
    <div class="modal-window">
        <button class="draft-close" on:click={close_draft}>X</button>
        <form on:submit|preventDefault={send_message}>
            <span class="draft-title">Post to {channel}</span>
            <textarea
                type="text"
                placeholder="Write something..."
                bind:value={text}
                maxlength="3000"
            />
            <button class="draft-submit" type="submit" disabled={!text.trim()}
                >Post</button
            >
        </form>
    </div>
</div>

<style>
    .modal {
        z-index: 999;
        width: 100vw;
        height: 100vh;

        position: absolute;
        top: 0px;
        left: 0px;

        display: flex;
        justify-content: center;
        align-items: flex-end;

        background-color: #7e7e7e80;
    }

    .modal-window {
        position: relative;

        height: 90%;
        width: 90%;

        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;

        flex: 0.4 1 300px;

        border-radius: 24px 24px 0px 0px;

        background-color: var(--color-5);
    }

    .draft-close {
        width: 32px;
        height: 32px;
        position: absolute;
        top: 10px;
        right: 10px;

        display: flex;
        justify-content: center;
        align-items: center;

        outline: none;
        border: none;
        border-radius: 50%;

        background-color: var(--color-5);
        color: var(--color-3);
        font-size: 24px;

        cursor: pointer;

        transition: background-color 50ms;
    }

    form {
        width: 90%;
        box-sizing: border-box;

        margin: 5%;
        overflow-y: scroll;

        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
    }

    .draft-title {
        font-size: 24px;
        align-self: flex-start;
        overflow-wrap: anywhere;
    }

    textarea {
        width: 100%;
        height: 300px;
        box-sizing: border-box;
        resize: vertical;

        padding: 2em;
        margin: 16px 0px 16px 0px;

        border: 2px solid var(--color-2);
        outline: none;

        font-size: 14px;
        font-family: inherit;
    }

    textarea:active,
    textarea:focus {
        border-color: var(--color-accent);
    }

    .draft-submit {
        align-self: flex-end;
        padding: 8px;

        background-color: var(--color-2);
        color: var(--color-5);
    }

    .draft-submit:disabled {
        background-color: var(--color-3);
        color: var(--color-2);
    }

    button {
        border: none;
        border-radius: 6px;

        font-size: 24px;

        cursor: pointer;

        transition: background-color 50ms;
    }

    button:disabled {
        cursor: not-allowed;
    }

    button:enabled:active,
    button:enabled:focus {
        background-color: var(--color-2);
        color: var(--color-6);
    }

    button:enabled:focus {
        outline: 2px solid var(--color-accent);
    }
</style>
