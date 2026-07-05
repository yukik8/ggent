<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => goto('/ingestion', { replaceState: true }));
</script>

<div class="flex h-screen items-center justify-center bg-zinc-950 text-zinc-500">
	<svg class="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
		<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
		<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
	</svg>
</div>