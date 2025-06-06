<script lang="ts">
	import ProjectAvatar from '$components/ProjectAvatar.svelte';
	import ProjectsPopup from '$components/ProjectsPopup.svelte';
	import { Project } from '$lib/project/project';
	import { getContext } from '@gitbutler/shared/context';
	import Icon from '@gitbutler/ui/Icon.svelte';
	import Tooltip from '@gitbutler/ui/Tooltip.svelte';

	interface Props {
		isNavCollapsed: boolean;
	}

	const { isNavCollapsed }: Props = $props();

	const project = getContext(Project);

	let buttonTrigger = $state<HTMLButtonElement>();
	let popup = $state<ReturnType<typeof ProjectsPopup>>();
</script>

<div class="project-selector">
	<Tooltip text={isNavCollapsed ? project?.title : ''} align="start">
		<button
			type="button"
			bind:this={buttonTrigger}
			class="text-input button"
			onmousedown={(e) => {
				e.preventDefault();
				popup?.toggle();
			}}
		>
			<ProjectAvatar name={project?.title} />
			{#if !isNavCollapsed}
				<span class="button__label text-14 text-bold">{project?.title}</span>
				<div class="button__icon">
					<Icon name="select-chevron" />
				</div>
			{/if}
		</button>
	</Tooltip>
	<ProjectsPopup bind:this={popup} target={buttonTrigger} {isNavCollapsed} />
</div>

<style lang="postcss">
	.project-selector {
		position: relative;
		height: fit-content;
		margin-top: 4px;
		margin-bottom: 14px;

		&:hover {
			& .button__icon {
				color: var(--clr-scale-ntrl-40);
			}
		}
	}

	.button {
		display: flex;

		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 8px;
		gap: 10px;

		transition: background-color var(--transition-fast);
	}

	.button__label {
		flex-grow: 1;
		overflow: hidden;
		color: var(--clr-scale-ntrl-0);
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.button__icon {
		display: flex;
		color: var(--clr-scale-ntrl-50);
	}
</style>
