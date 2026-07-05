<script lang="ts">
	import { page } from '$app/state';
	import type { OntologyStatus } from '$lib/types';

	interface Props {
		ontology: OntologyStatus;
	}
	let { ontology }: Props = $props();

	const items: { href: string; label: string; soon?: boolean; icon: string }[] = [
		{
			href: '/chat',
			label: 'Chat',
			soon: true,
			icon: 'M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z',
		},
		{
			href: '/ingestion',
			label: 'Ingestion',
			icon: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75v-2.25m-13.5-9 4.5 4.5m0 0 4.5-4.5m-4.5 4.5V3',
		},
		{
			href: '/graph',
			label: 'Graph',
			icon: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25A2.25 2.25 0 0 1 8.25 10.5H6A2.25 2.25 0 0 1 3.75 8.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25A2.25 2.25 0 0 1 10.5 15.75V18A2.25 2.25 0 0 1 8.25 20.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
		},
	];
</script>

<aside class="flex h-full w-60 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
	<div class="flex items-center gap-2.5 px-5 py-5">
		<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600">
			<svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 2.25 3 6.75v10.5L12 21.75l9-4.5V6.75L12 2.25ZM3 6.75 12 11.25l9-4.5M12 11.25v9.75" />
			</svg>
		</div>
		<div>
			<p class="text-sm font-semibold text-zinc-100">ggent</p>
			<p class="text-xs text-zinc-500">knowledge graph</p>
		</div>
	</div>

	{#if ontology.version}
		<div class="mx-3 mb-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
			<p class="truncate text-xs font-medium text-zinc-400">{ontology.version}</p>
			<p class="text-[11px] text-zinc-600">{ontology.labelCount ?? 0} labels · {ontology.edgeCount ?? 0} edges</p>
		</div>
	{/if}

	<nav class="flex-1 space-y-1 px-3 py-2">
		{#each items as item}
			<a
				href={item.href}
				data-sveltekit-preload-data="hover"
				aria-current={page.url.pathname === item.href ? 'page' : undefined}
				class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition
					{page.url.pathname === item.href ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}"
			>
				<svg class="h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
				</svg>
				<span class="flex-1 text-left">{item.label}</span>
				{#if item.soon}
					<span class="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">soon</span>
				{/if}
			</a>
		{/each}
	</nav>

	<div class="border-t border-zinc-900 px-5 py-4">
		<p class="text-xs text-zinc-600">v0.1 · powered by DeepSeek</p>
	</div>
</aside>