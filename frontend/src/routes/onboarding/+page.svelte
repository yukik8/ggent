<script lang="ts">
	import Onboarding from '$lib/components/Onboarding.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import type { IngestResult } from '$lib/types';

	async function oncomplete(_r: IngestResult) {
		await invalidateAll();
		await goto('/ingestion', { replaceState: true });
	}
</script>

<Onboarding oncomplete={oncomplete} />