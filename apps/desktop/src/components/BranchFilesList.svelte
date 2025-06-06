<script lang="ts">
	import BranchFilesHeader from '$components/BranchFilesHeader.svelte';
	import FileListItemWrapper from '$components/FileListItemWrapper.svelte';
	import LazyloadContainer from '$components/LazyloadContainer.svelte';
	import { writeClipboard } from '$lib/backend/clipboard';
	import { SelectedOwnership, updateOwnership } from '$lib/branches/ownership';
	import { getCommitStore } from '$lib/commits/contexts';
	import { conflictEntryHint } from '$lib/conflictEntryPresence';
	import { sortLikeFileTree } from '$lib/files/filetree';
	import { FileIdSelection, stringifyKey } from '$lib/selection/fileIdSelection';
	import { chunk } from '$lib/utils/array';
	import { selectFilesInList } from '$lib/utils/selectFilesInList';
	import { updateSelection } from '$lib/utils/selection';
	import { getContext, maybeGetContextStore } from '@gitbutler/shared/context';
	import Button from '@gitbutler/ui/Button.svelte';
	import Textbox from '@gitbutler/ui/Textbox.svelte';
	import FileListItem from '@gitbutler/ui/file/FileListItem.svelte';
	import { KeyName } from '@gitbutler/ui/utils/hotkeys';
	import type { ConflictEntries } from '$lib/files/conflicts';
	import type { AnyFile } from '$lib/files/file';
	import type { Writable } from 'svelte/store';

	const MERGE_DIFF_COMMAND = 'git diff-tree --cc ';

	interface Props {
		projectId?: string;
		files: AnyFile[];
		isUnapplied?: boolean;
		showCheckboxes?: boolean;
		allowMultiple?: boolean;
		readonly?: boolean;
		commitDialogExpanded?: Writable<boolean>;
		focusCommitDialog?: () => void;
		conflictedFiles?: ConflictEntries;
	}

	const {
		projectId,
		files,
		isUnapplied = false,
		showCheckboxes = false,
		allowMultiple = false,
		readonly = false,
		commitDialogExpanded,
		focusCommitDialog,
		conflictedFiles
	}: Props = $props();

	const fileIdSelection = getContext(FileIdSelection);
	const selectedOwnership: Writable<SelectedOwnership> | undefined =
		maybeGetContextStore(SelectedOwnership);
	const commit = getCommitStore();

	const chunkedFiles: AnyFile[][] = $derived(chunk(sortLikeFileTree(files), 100));
	let currentDisplayIndex = $state(0);
	const displayedFiles: AnyFile[] = $derived(chunkedFiles.slice(0, currentDisplayIndex + 1).flat());

	function handleSpace() {
		if (commitDialogExpanded === undefined) return;

		if (!$commitDialogExpanded) {
			$commitDialogExpanded = true;
			return;
		}

		updateOwnership({
			selectedFileIds: $fileIdSelection,
			files: displayedFiles,
			selectedOwnership
		});
	}

	function handleEnter() {
		if (commitDialogExpanded === undefined || focusCommitDialog === undefined) return;
		if ($commitDialogExpanded) {
			focusCommitDialog();
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		updateSelection({
			allowMultiple,
			metaKey: e.metaKey,
			shiftKey: e.shiftKey,
			key: e.key,
			targetElement: e.currentTarget as HTMLElement,
			files: displayedFiles,
			selectedFileIds: $fileIdSelection,
			fileIdSelection,
			commitId: $commit?.id,
			preventDefault: () => e.preventDefault()
		});

		switch (e.key) {
			case KeyName.Space: {
				handleSpace();
				break;
			}
			case KeyName.Enter: {
				handleEnter();
				break;
			}
		}
	}

	function loadMore() {
		if (currentDisplayIndex + 1 >= chunkedFiles.length) return;
		currentDisplayIndex += 1;
	}
</script>

{#if !$commit?.isMergeCommit()}
	<BranchFilesHeader title="Changed files" {files} {showCheckboxes} {conflictedFiles} />
{:else}
	<div class="merge-commit-error">
		<p class="info">
			Displaying diffs for merge commits is currently not supported. Please view the merge commit in
			GitHub, or run the following command in your project directory:
		</p>
		<div class="command">
			<Textbox value={MERGE_DIFF_COMMAND + $commit.id.slice(0, 7)} wide readonly />
			<Button
				icon="copy"
				kind="outline"
				onmousedown={() => writeClipboard(MERGE_DIFF_COMMAND + $commit.id.slice(0, 7))}
			/>
		</div>
	</div>
{/if}

{#if displayedFiles.length > 0 || (conflictedFiles?.entries.size || 0) > 0}
	<!-- Maximum amount for initial render is 100 files
	`minTriggerCount` set to 80 in order to start the loading a bit earlier. -->

	{#if conflictedFiles}
		{#each conflictedFiles.entries.entries() as [key, value]}
			<FileListItem filePath={key} conflicted={true} conflictHint={conflictEntryHint(value)} />
		{/each}
	{/if}
	<LazyloadContainer
		minTriggerCount={80}
		ontrigger={() => {
			loadMore();
		}}
		role="listbox"
		onkeydown={handleKeyDown}
	>
		{#each displayedFiles as file (file.id)}
			<FileListItemWrapper
				{projectId}
				{file}
				{readonly}
				{isUnapplied}
				showCheckbox={showCheckboxes}
				selected={$fileIdSelection.includes(stringifyKey(file.id, $commit?.id))}
				onclick={(e) => {
					selectFilesInList(e, file, fileIdSelection, displayedFiles, allowMultiple, $commit);
				}}
			/>
		{/each}
	</LazyloadContainer>
{/if}

<style lang="postcss">
	.merge-commit-error {
		display: flex;
		flex-direction: column;
		padding: 14px;
		gap: 14px;

		& .info {
			color: var(--clr-text-2);
		}

		& .command {
			display: flex;
			align-items: center;
			width: 100%;
			gap: 8px;
		}
	}
</style>
