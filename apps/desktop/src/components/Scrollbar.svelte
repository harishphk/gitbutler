<script lang="ts">
	import { SETTINGS, type Settings } from '$lib/settings/userSettings';
	import { getContextStoreBySymbol } from '@gitbutler/shared/context';
	import Scrollbar, { type ScrollbarPaddingType } from '@gitbutler/ui/scroll/Scrollbar.svelte';

	interface Props {
		viewport: HTMLDivElement;
		initiallyVisible?: boolean;
		thickness?: string;
		padding?: ScrollbarPaddingType;
		shift?: string;
		horz?: boolean;
		zIndex?: string;
		onthumbdrag?: (dragging: boolean) => void;
		onscroll?: (e: Event) => void;
		updateTrack?: () => void;
	}

	const {
		viewport,
		initiallyVisible = false,
		thickness = '0.563rem',
		padding = {},
		shift = '0',
		horz = false,
		zIndex = 'var(--z-lifted)',
		onthumbdrag,
		onscroll
	}: Props = $props();

	const userSettings = getContextStoreBySymbol<Settings>(SETTINGS);

	let scrollbar = $state<Scrollbar>();

	export function updateTrack() {
		scrollbar?.updateTrack();
	}
</script>

<Scrollbar
	{viewport}
	{initiallyVisible}
	{thickness}
	{padding}
	{shift}
	{horz}
	{zIndex}
	{onthumbdrag}
	{onscroll}
	whenToShow={$userSettings.scrollbarVisibilityState}
/>
