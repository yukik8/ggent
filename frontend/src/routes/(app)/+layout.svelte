<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { getOntologyStatus } from '$lib/api';
	import type { OntologyStatus } from '$lib/types';
	import { goto } from '$app/navigation';

	let { children } = $props();

	let mode = $state<'loading' | 'empty' | 'ready'>('loading');
	let ontology = $state<OntologyStatus | null>(null);
	let error = $state<string | null>(null);

	$effect(() => {
		void (async () => {
			mode = 'loading';
			error = null;
			try {
				ontology = await getOntologyStatus();
				if (!ontology.exists) {
					await goto('/onboarding', { replaceState: true });
					return;
				}
				mode = 'ready';
			} catch (e) {
				error = (e as Error).message;
				mode = 'empty';
				await goto('/onboarding', { replaceState: true });
			}
		})();
	});
</script>

<svelte:head><title>ggent</title></svelte:head>

{#if mode === 'loading'}
	<div class="flex h-screen items-center justify-center bg-zinc-950 text-zinc-500">
		<svg class="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
		</svg>
	</div>
{:else if mode === 'ready' && ontology}
	<div class="flex h-screen w-full overflow-hidden bg-zinc-950 text-zinc-200">
		<Sidebar {ontology} />
		<main class="flex-1 overflow-y-auto p-8">
			{@render children()}
		</main>
	</div>
{/if}