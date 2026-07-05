<script lang="ts">
	import FileDropZone from './FileDropZone.svelte';
	import { ingestInitial } from '$lib/api';
	import type { IngestResult } from '$lib/types';

	interface Props {
		oncomplete?: (r: IngestResult) => void;
	}
	let { oncomplete }: Props = $props();

	let files = $state<File[]>([]);
	let questions = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<IngestResult | null>(null);

	const ACCEPT = '.pdf,.docx,.txt,.csv,.md,.json,.html,.htm';

	async function build() {
		if (files.length === 0 || loading) return;
		loading = true;
		error = null;
		result = null;
		try {
			const r = await ingestInitial(files, questions.trim() || undefined);
			result = r;
			oncomplete?.(r);
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
	<div class="w-full max-w-2xl">
		<div class="mb-8 text-center">
			<div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
				<svg class="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 2.25 3 6.75v10.5L12 21.75l9-4.5V6.75L12 2.25ZM3 6.75 12 11.25l9-4.5M12 11.25v9.75" />
				</svg>
			</div>
			<h1 class="text-2xl font-semibold text-zinc-100">Build your knowledge graph</h1>
			<p class="mt-2 text-sm text-zinc-400">
				Upload domain documents. We'll infer an ontology from the content and seed your graph.
			</p>
		</div>

		<div class="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
			<FileDropZone bind:files accept={ACCEPT} disabled={loading} />

			<div class="mt-5">
				<label for="qs" class="mb-1.5 block text-sm font-medium text-zinc-300">
					Questions you want answered <span class="text-zinc-500">(optional)</span>
				</label>
				<textarea
					id="qs"
					bind:value={questions}
					disabled={loading}
					rows="3"
					placeholder="e.g. What distinguishes high-performing presenters from low ones? Is ad creative quality tied to presenter tier?"
					class="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
				></textarea>
			</div>

			{#if error}
				<div class="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
					{error}
				</div>
			{/if}

			{#if result?.nodeCounts}
				<div class="mt-4 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
					Ontology built. Seed rows: {Object.entries(result.nodeCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}
				</div>
			{/if}

			<button
				type="button"
				onclick={build}
				disabled={files.length === 0 || loading}
				class="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
			>
				{#if loading}
					<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
					</svg>
					Building ontology…
				{:else}
					Build Ontology
				{/if}
			</button>
		</div>
		<p class="mt-4 text-center text-xs text-zinc-600">ggent — knowledge graph engine</p>
	</div>
</div>