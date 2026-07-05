<script lang="ts">
	import FileDropZone from './FileDropZone.svelte';
	import { ingestAppendFiles, ingestAppendRaw } from '$lib/api';
	import type { IngestResult } from '$lib/types';

	let files = $state<File[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let result = $state<IngestResult | null>(null);

	let mode = $state<'files' | 'raw'>('files');
	let note = $state('');
	let presenterId = $state('');
	let rawLoading = $state(false);
	let rawError = $state<string | null>(null);
	let rawResult = $state<IngestResult | null>(null);

	const ACCEPT = '.pdf,.docx,.txt,.csv,.md,.json,.html,.htm';

	async function ingestFiles() {
		if (files.length === 0 || loading) return;
		loading = true;
		error = null;
		result = null;
		try {
			result = await ingestAppendFiles(files);
			files = [];
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	async function ingestRaw() {
		if (!note.trim() || rawLoading) return;
		rawLoading = true;
		rawError = null;
		rawResult = null;
		try {
			rawResult = await ingestAppendRaw(note.trim(), presenterId.trim() || undefined);
			note = '';
			presenterId = '';
		} catch (e) {
			rawError = (e as Error).message;
		} finally {
			rawLoading = false;
		}
	}

	function formatCounts(c?: Record<string, number>): string {
		if (!c) return '';
		const entries = Object.entries(c).filter(([, v]) => v > 0);
		if (entries.length === 0) return 'no rows';
		return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
	}
</script>

<div class="mx-auto max-w-3xl">
	<div class="mb-6">
		<h1 class="text-xl font-semibold text-zinc-100">Ingestion</h1>
		<p class="mt-1 text-sm text-zinc-500">Upload files or paste a raw note to append data to your knowledge graph.</p>
	</div>

	<div class="mb-4 flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/40 p-1">
		<button
			type="button"
			onclick={() => (mode = 'files')}
			class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition
				{mode === 'files' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}"
		>Files</button>
		<button
			type="button"
			onclick={() => (mode = 'raw')}
			class="flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition
				{mode === 'raw' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}"
		>Raw note</button>
	</div>

	{#if mode === 'files'}
		<div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
			<FileDropZone bind:files accept={ACCEPT} disabled={loading} hint="Drag data files here or click to browse" />

			{#if error}
				<div class="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</div>
			{/if}

			{#if result?.inserted}
				<div class="mt-4 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
					Ingested — {formatCounts(result.inserted)}
				</div>
			{/if}

			<button
				type="button"
				onclick={ingestFiles}
				disabled={files.length === 0 || loading}
				class="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
			>
				{#if loading}
					<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
					</svg>
					Ingesting…
				{:else}
					Ingest {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Files'}
				{/if}
			</button>
		</div>
	{:else}
		<div class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
			<label for="note" class="mb-1.5 block text-sm font-medium text-zinc-300">Free-form note</label>
			<textarea
				id="note"
				bind:value={note}
				rows="6"
				disabled={rawLoading}
				placeholder="Paste any note — meeting recap, deal update, campaign summary… The LLM will infer structured rows."
				class="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
			></textarea>

			<div class="mt-3">
				<label for="pid" class="mb-1.5 block text-xs font-medium text-zinc-400">Presenter ID hint (optional)</label>
				<input
					id="pid"
					bind:value={presenterId}
					disabled={rawLoading}
					placeholder="e.g. presenter-1"
					class="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
				/>
			</div>

			{#if rawError}
				<div class="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">{rawError}</div>
			{/if}

			{#if rawResult?.inferred}
				<div class="mt-4 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
					Inferred rows — {formatCounts(Object.fromEntries(Object.entries(rawResult.inferred).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])))}
				</div>
			{/if}

			<button
				type="button"
				onclick={ingestRaw}
				disabled={!note.trim() || rawLoading}
				class="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
			>
				{#if rawLoading}
					<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
					</svg>
					Parsing…
				{:else}
					Parse & Ingest
				{/if}
			</button>
		</div>
	{/if}
</div>