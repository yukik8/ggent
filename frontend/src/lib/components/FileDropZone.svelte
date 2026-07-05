<script lang="ts">
	interface Props {
		accept?: string;
		files?: File[];
		disabled?: boolean;
		hint?: string;
	}

	let { accept = '*', files = $bindable([]), disabled = false, hint = 'Drag files here or click to browse' }: Props = $props();

	let dragging = $state(false);
	let fileInput: HTMLInputElement;

	function addFiles(list: FileList | null) {
		if (!list || disabled) return;
		const incoming = Array.from(list);
		files = [...files, ...incoming];
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		if (disabled) return;
		addFiles(e.dataTransfer?.files ?? null);
	}

	function onDragOver(e: DragEvent) {
		e.preventDefault();
		if (!disabled) dragging = true;
	}

	function onDragLeave() {
		dragging = false;
	}

	function remove(i: number) {
		files = files.filter((_, idx) => idx !== i);
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<div class="w-full">
	<button
		type="button"
		class="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition
			{disabled ? 'cursor-not-allowed border-zinc-800 bg-zinc-900/40 opacity-50' :
				dragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-zinc-700 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-900/70'}"
		onclick={() => !disabled && fileInput?.click()}
		ondrop={onDrop}
		ondragover={onDragOver}
		ondragleave={onDragLeave}
		{disabled}
	>
		<svg class="mb-3 h-9 w-9 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75v-2.25M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
		</svg>
		<p class="text-sm font-medium text-zinc-300">{hint}</p>
		<p class="mt-1 text-xs text-zinc-500">Accepted: {accept === '*' ? 'any file' : accept}</p>
	</button>

	<input
		bind:this={fileInput}
		type="file"
		multiple
		{accept}
		class="hidden"
		onchange={(e) => addFiles((e.currentTarget as HTMLInputElement).files)}
	/>

	{#if files.length > 0}
		<ul class="mt-4 space-y-2">
			{#each files as f, i}
				<li class="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
					<div class="flex min-w-0 items-center gap-3">
						<svg class="h-5 w-5 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
						</svg>
						<div class="min-w-0">
							<p class="truncate text-sm text-zinc-200">{f.name}</p>
							<p class="text-xs text-zinc-500">{formatSize(f.size)}</p>
						</div>
					</div>
					{#if !disabled}
						<button
							type="button"
							class="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
							onclick={() => remove(i)}
							aria-label="Remove file"
						>
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>