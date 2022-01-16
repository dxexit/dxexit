import { writable } from "svelte/store";

// export let channel = writable('');
export let channel = '';

export function get_and_load_channel() {
    // channel.set(new URLSearchParams(window.location.search).get('c'));
    channel = new URLSearchParams(window.location.search).get('c');
    return channel;
}