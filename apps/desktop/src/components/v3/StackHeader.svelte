<script lang="ts">
	import HeaderControlSection from '$components/v3/HeaderControlSection.svelte';
	import HeaderMetaSection from '$components/v3/HeaderMetaSection.svelte';
	import { BranchStack } from '$lib/branches/branch';
	import { StackService } from '$lib/stacks/stackService.svelte';
	import { getContext } from '@gitbutler/shared/context';
	import { isError } from '@gitbutler/ui/utils/typeguards';

	interface Props {
		stack: BranchStack;
		onCollapseButtonClick: () => void;
		projectId: string;
	}

	const stackService = getContext(StackService);

	const { onCollapseButtonClick, stack, projectId }: Props = $props();

	const nonArchivedSeries = $derived(
		stack.series.filter((s) => {
			if (isError(s)) return s;
			return !s.archived;
		})
	);
</script>

<div class="stack-header">
	<HeaderControlSection
		isDefault={stack.selectedForChanges}
		{onCollapseButtonClick}
		onDefaultSet={async () => {
			await stackService.updateStack({
				projectId,
				branch: { id: stack.id, selected_for_changes: true }
			});
		}}
	/>
	<HeaderMetaSection
		{projectId}
		series={nonArchivedSeries}
		{onCollapseButtonClick}
		stackId={stack.id}
	/>
</div>

<style lang="postcss">
	.stack-header {
		display: flex;
		z-index: var(--z-floating);
		position: sticky;
		top: 14px;
		flex-direction: column;
		width: 100%;

		&::after {
			display: block;
			z-index: -1;
			position: absolute;
			top: -20px;
			left: -14px;
			width: calc(100% + 20px);
			height: 40px;
			background-color: var(--clr-bg-2);
			content: '';
		}
	}
</style>
