<script lang="ts">
	import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
	import { fetchGraph } from '$lib/api';
	import { onMount } from 'svelte';

	let container: HTMLDivElement;
	let cy: Core | null = null;
	let loading = $state(false);
	let error = $state<string | null>(null);
	let stats = $state<{ nodes: number; edges: number; labels: string[] }>({ nodes: 0, edges: 0, labels: [] });
	let activeLabel = $state<string | null>(null);

	const PALETTE: Record<string, string> = {
		Client: '#818cf8',
		Presenter: '#34d399',
		Presentation: '#fbbf24',
		Outcome: '#f87171',
		Campaign: '#22d3ee',
		Asset: '#c084fc',
		Kpi: '#fb923c',
		Channel: '#94a3b8',
		Label: '#e879f9',
		EdgeType: '#a3a3a3',
		OntologyVersion: '#60a5fa',
	};

	function colorFor(labels: string[]): string {
		for (const l of labels) if (PALETTE[l]) return PALETTE[l];
		return '#64748b';
	}

	function labelOf(n: { labels: string[]; properties: Record<string, unknown> }): string {
		const name =
			(n.properties.name as string | undefined) ??
			(n.properties.title as string | undefined) ??
			(n.properties.id as string | undefined) ??
			n.labels[0] ??
			'node';
		const max = 24;
		return name.length > max ? name.slice(0, max) + '…' : name;
	}

	async function load() {
		loading = true;
		error = null;
		try {
			const rows = await fetchGraph(500);
			const nodes = new Map<number, ElementDefinition>();
			const edges = new Map<number, ElementDefinition>();
			for (const row of rows) {
				for (const val of Object.values(row)) {
					if ('labels' in val) {
						if (!nodes.has(val.identity)) {
							nodes.set(val.identity, {
								data: {
									id: `n${val.identity}`,
									label: labelOf(val),
									labels: val.labels,
									color: colorFor(val.labels),
								},
							});
						}
					} else if ('type' in val) {
						if (!edges.has(val.identity)) {
							edges.set(val.identity, {
								data: {
									id: `e${val.identity}`,
									source: `n${val.start}`,
									target: `n${val.end}`,
									label: val.type,
								},
							});
						}
					}
				}
			}
			const elements = [...nodes.values(), ...edges.values()];
			stats = {
				nodes: nodes.size,
				edges: edges.size,
				labels: [...new Set([...nodes.values()].flatMap((e) => e.data.labels))].sort(),
			};
			if (cy) {
				cy.elements().remove();
				cy.add(elements);
				cy.layout({ name: 'cose', animate: true, animationDuration: 600 }).run();
			}
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		cy = cytoscape({
			container,
			elements: [],
			style: [
				{
					selector: 'node',
					style: {
						'background-color': 'data(color)',
						label: 'data(label)',
						'font-size': '10px',
						color: '#e5e7eb',
						'text-valign': 'bottom',
						'text-margin-y': 4,
						width: 22,
						height: 22,
						'border-width': 1,
						'border-color': '#ffffff22',
					},
				},
				{
					selector: 'node[?labels]',
					style: {},
				},
				{
					selector: 'edge',
					style: {
						'curve-style': 'bezier',
						'line-color': '#3f3f46',
						'target-arrow-color': '#3f3f46',
						'target-arrow-shape': 'triangle',
						'arrow-scale': 0.8,
						width: 1.5,
						label: 'data(label)',
						'font-size': '8px',
						color: '#71717a',
						'text-background-color': '#18181b',
						'text-background-opacity': 0.8,
						'text-background-padding': '1px',
						'text-rotation': 'autorotate',
					},
				},
				{
					selector: ':selected',
					style: {
						'border-width': 3,
						'border-color': '#818cf8',
						'line-color': '#818cf8',
						'target-arrow-color': '#818cf8',
					},
				},
			],
			layout: { name: 'grid' },
			wheelSensitivity: 0.2,
		});
		void load();
		return () => cy?.destroy();
	});

	function highlight(label: string | null) {
		activeLabel = activeLabel === label ? null : label;
		if (!cy) return;
		cy.elements().removeClass('dim');
		if (activeLabel) {
			const target = activeLabel;
			cy.nodes()
				.filter((n) => !(n.data('labels') as string[])?.includes(target))
				.addClass('dim');
		}
	}
</script>

<div class="mx-auto flex h-full max-w-6xl flex-col">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-xl font-semibold text-zinc-100">Graph visualiser</h1>
			<p class="mt-1 text-sm text-zinc-500">
				{stats.nodes} nodes · {stats.edges} edges
				{#if stats.labels.length}· click a label to filter{/if}
			</p>
		</div>
		<button
			type="button"
			onclick={load}
			disabled={loading}
			class="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:opacity-50"
		>
			{#if loading}
				<svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
				</svg>
				Loading
			{:else}
				<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M16.023 4.379a8 8 0 1 0 3.598 13.644M12 4v4m0 0-2-2m2 2 2-2" />
				</svg>
				Refresh
			{/if}
		</button>
	</div>

	{#if stats.labels.length}
		<div class="mb-3 flex flex-wrap gap-2">
			{#each stats.labels as l}
				<button
					type="button"
					onclick={() => highlight(l)}
					class="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition
						{activeLabel === l ? 'border-zinc-600 bg-zinc-800 text-zinc-100' : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'}"
				>
					<span class="h-2 w-2 rounded-full" style="background:{PALETTE[l] ?? '#64748b'}"></span>
					{l}
				</button>
			{/each}
		</div>
	{/if}

	{#if error}
		<div class="mb-3 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</div>
	{/if}

	<div class="relative flex-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/30">
		<div bind:this={container} class="h-full w-full"></div>
		{#if loading && stats.nodes === 0}
			<div class="absolute inset-0 flex items-center justify-center text-zinc-500">
				<svg class="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
				</svg>
			</div>
		{/if}
	</div>
</div>

<svelte:head>
	<style global>
		:global(.dim) { opacity: 0.15 !important; }
	</style>
</svelte:head>