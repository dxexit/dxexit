<main>
    <form>
        <label for="c">Go to a channel:</label>
        <input name="c" type="text" />
        <button type="submit">Go</button>
    </form>
</main>

<style>
    main {
        display: flex;
        justify-content: center;
        padding-top: 10%;
    }

    form {
        width: 250px;
        height: 120px;
        padding: max(2%, 24px);
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
        margin-bottom: 12px;
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
        width: 30%;
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
