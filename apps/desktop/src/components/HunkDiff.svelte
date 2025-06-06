<!-- DEPRECATED! -->
<!-- This component is only being used in v2, and will be completely replaced in v3 -->
<!-- by the HunkDiff component inside the @gitbutler/ui package. -->
<script lang="ts">
	import ScrollableContainer from '$components/ConfigurableScrollableContainer.svelte';
	import { SelectedOwnership } from '$lib/branches/ownership';
	import { type Hunk } from '$lib/hunks/hunk';
	import {
		type ContentSection,
		SectionType,
		type Line,
		CountColumnSide
	} from '$lib/utils/fileSections';
	import { create } from '@gitbutler/shared/codeHighlight';
	import { maybeGetContextStore } from '@gitbutler/shared/context';
	import Checkbox from '@gitbutler/ui/Checkbox.svelte';
	import Icon from '@gitbutler/ui/Icon.svelte';
	import { pxToRem } from '@gitbutler/ui/utils/pxToRem';
	import diff_match_patch from 'diff-match-patch';
	import type { Writable } from 'svelte/store';

	interface ContextMenuParams {
		event: MouseEvent;
		beforeLineNumber: number | undefined;
		afterLineNumber: number | undefined;
		hunk: Hunk;
		subsection: ContentSection;
	}

	interface Props {
		hunk: Hunk;
		readonly: boolean;
		filePath: string;
		selectable: boolean;
		subsections: ContentSection[];
		tabSize: number;
		wrapText: boolean;
		diffFont: string;
		diffLigatures: boolean;
		inlineUnifiedDiffs: boolean;
		diffContrast: 'light' | 'medium' | 'strong';
		minWidth: number;
		draggingDisabled: boolean;
		onclick: () => void;
		handleSelected: (hunk: Hunk, isSelected: boolean) => void;
		handleLineContextMenu: (params: ContextMenuParams) => void;
	}

	const {
		hunk,
		readonly = false,
		filePath,
		selectable,
		subsections,
		tabSize,
		wrapText,
		diffFont,
		diffLigatures,
		diffContrast,
		inlineUnifiedDiffs,
		minWidth,
		draggingDisabled = false,
		onclick,
		handleSelected,
		handleLineContextMenu
	}: Props = $props();

	const WHITESPACE_REGEX = /\s/;
	const NUMBER_COLUMN_WIDTH_PX = minWidth * 20;
	const BORDER_WIDTH = 1;

	const selectedOwnership: Writable<SelectedOwnership> | undefined =
		maybeGetContextStore(SelectedOwnership);

	let tableWidth = $state<number>(0);
	let tableHeight = $state<number>(0);
	let numberHeaderWidth = $state<number>(0);

	const selected = $derived($selectedOwnership?.isSelected(hunk.filePath, hunk.id) ?? false);
	const isSelected = $derived(selectable && selected);

	function charDiff(text1: string, text2: string): { 0: number; 1: string }[] {
		const differ = new diff_match_patch();
		const diff = differ.diff_main(text1, text2);
		differ.diff_cleanupSemantic(diff);
		return diff;
	}

	function isLineEmpty(lines: Line[]) {
		const whitespaceRegex = new RegExp(WHITESPACE_REGEX);
		if (!lines[0]?.content.match(whitespaceRegex)) {
			return true;
		}

		return false;
	}

	function createRowData(section: ContentSection): Row[] {
		return section.lines.map((line) => {
			if (line.content === '') {
				// Add extra \n for empty lines for correct copy/pasting output
				line.content = '\n';
			}

			return {
				beforeLineNumber: line.beforeLineNumber,
				afterLineNumber: line.afterLineNumber,
				tokens: toTokens(line.content),
				type: section.sectionType,
				size: line.content.length,
				isLast: false
			};
		});
	}

	function sanitize(text: string) {
		const element = document.createElement('div');
		element.innerText = text;
		return element.innerHTML;
	}

	function toTokens(inputLine: string): string[] {
		let highlighter = create(inputLine, filePath);
		let tokens: string[] = [];
		highlighter.highlight((text, classNames) => {
			const token = classNames
				? `<span data-no-drag class=${classNames}>${sanitize(text)}</span>`
				: sanitize(text);

			tokens.push(token);
		});

		return tokens;
	}

	function computeWordDiff(prevSection: ContentSection, nextSection: ContentSection): DiffRows {
		const numberOfLines = nextSection.lines.length;
		const returnRows: DiffRows = {
			prevRows: [],
			nextRows: []
		};

		// Loop through every line in the section
		// We're only bothered with prev/next sections with equal # of lines changes
		for (let i = 0; i < numberOfLines; i++) {
			const oldLine = prevSection.lines[i] as Line;
			const newLine = nextSection.lines[i] as Line;
			const prevSectionRow = {
				beforeLineNumber: oldLine.beforeLineNumber,
				afterLineNumber: oldLine.afterLineNumber,
				tokens: [] as string[],
				type: prevSection.sectionType,
				size: oldLine.content.length,
				isLast: false
			};
			const nextSectionRow = {
				beforeLineNumber: newLine.beforeLineNumber,
				afterLineNumber: newLine.afterLineNumber,
				tokens: [] as string[],
				type: nextSection.sectionType,
				size: newLine.content.length,
				isLast: false
			};

			const diff = charDiff(oldLine.content, newLine.content);

			for (const token of diff) {
				const text = token[1];
				const type = token[0];

				if (type === Operation.Equal) {
					prevSectionRow.tokens.push(...toTokens(text));
					nextSectionRow.tokens.push(...toTokens(text));
				} else if (type === Operation.Insert) {
					nextSectionRow.tokens.push(
						`<span data-no-drag class="token-inserted">${sanitize(text)}</span>`
					);
				} else if (type === Operation.Delete) {
					prevSectionRow.tokens.push(
						`<span data-no-drag class="token-deleted">${sanitize(text)}</span>`
					);
				}
			}
			returnRows.nextRows.push(nextSectionRow);
			returnRows.prevRows.push(prevSectionRow);
		}

		return returnRows;
	}

	function computeInlineWordDiff(prevSection: ContentSection, nextSection: ContentSection): Row[] {
		const numberOfLines = nextSection.lines.length;

		const rows = [];

		// Loop through every line in the section
		// We're only bothered with prev/next sections with equal # of lines changes
		for (let i = 0; i < numberOfLines; i++) {
			const oldLine = prevSection.lines[i] as Line;
			const newLine = nextSection.lines[i] as Line;

			const sectionRow = {
				beforeLineNumber: newLine.beforeLineNumber,
				afterLineNumber: newLine.afterLineNumber,
				tokens: [] as string[],
				type: nextSection.sectionType,
				size: newLine.content.length,
				isLast: false
			};

			const diff = charDiff(oldLine.content, newLine.content);

			for (const token of diff) {
				const text = token[1];
				const type = token[0];

				if (type === Operation.Equal) {
					sectionRow.tokens.push(...toTokens(text));
				} else if (type === Operation.Insert) {
					sectionRow.tokens.push(
						`<span data-no-drag class="token-inserted">${sanitize(text)}</span>`
					);
				} else if (type === Operation.Delete) {
					sectionRow.tokens.push(
						`<span data-no-drag class="token-deleted token-strikethrough">${sanitize(text)}</span>`
					);
				}
			}
			rows.push(sectionRow);
		}

		return rows;
	}

	function generateRows(subsections: ContentSection[]) {
		const rows = subsections.reduce((acc, nextSection, i) => {
			const prevSection = subsections[i - 1];

			// Filter out section for which we don't need to compute word diffs
			if (!prevSection || nextSection.sectionType === SectionType.Context) {
				acc.push(...createRowData(nextSection));
				return acc;
			}

			if (prevSection.sectionType === SectionType.Context) {
				acc.push(...createRowData(nextSection));
				return acc;
			}

			if (prevSection.lines.length !== nextSection.lines.length) {
				acc.push(...createRowData(nextSection));
				return acc;
			}

			if (isLineEmpty(prevSection.lines)) {
				acc.push(...createRowData(nextSection));
				return acc;
			}

			// Don't do word diff on super long lines
			if (
				prevSection.lines.some((line) => line.content.length > 300) ||
				nextSection.lines.some((line) => line.content.length > 300)
			) {
				acc.push(...createRowData(nextSection));
				return acc;
			}

			if (inlineUnifiedDiffs) {
				const rows = computeInlineWordDiff(prevSection, nextSection);

				acc.splice(-prevSection.lines.length);

				acc.push(...rows);
				return acc;
			} else {
				const { prevRows, nextRows } = computeWordDiff(prevSection, nextSection);

				// Insert returned row datastructures into the correct place
				// Find and replace previous rows with tokenized version
				prevRows.forEach((row, previousRowIndex) => {
					acc[acc.length - (prevRows.length - previousRowIndex)] = row;
				});

				acc.push(...nextRows);

				return acc;
			}
		}, [] as Row[]);

		const last = rows.at(-1);
		if (last) {
			last.isLast = true;
		}

		return rows;
	}

	const renderRows = $derived(generateRows(subsections));

	interface DiffHunkLineInfo {
		beforLineStart: number;
		beforeLineCount: number;
		afterLineStart: number;
		afterLineCount: number;
	}

	function getHunkLineInfo(subsections: ContentSection[]): DiffHunkLineInfo {
		const firstSection = subsections[0];
		const lastSection = subsections.at(-1);

		const beforLineStart = firstSection?.lines[0]?.beforeLineNumber ?? 0;
		const beforeLineEnd = lastSection?.lines?.at(-1)?.beforeLineNumber ?? 0;
		const beforeLineCount = beforeLineEnd - beforLineStart + 1;

		const afterLineStart = firstSection?.lines[0]?.afterLineNumber ?? 0;
		const afterLineEnd = lastSection?.lines?.at(-1)?.afterLineNumber ?? 0;
		const afterLineCount = afterLineEnd - afterLineStart + 1;

		return {
			beforLineStart,
			beforeLineCount,
			afterLineStart,
			afterLineCount
		};
	}

	const hunkLineInfo = $derived(getHunkLineInfo(subsections));

	interface Row {
		beforeLineNumber?: number;
		afterLineNumber?: number;
		tokens: string[];
		type: SectionType;
		size: number;
		isLast: boolean;
	}

	enum Operation {
		Equal = 0,
		Insert = 1,
		Delete = -1,
		Edit = 2
	}

	type DiffRows = { prevRows: Row[]; nextRows: Row[] };
</script>

{#snippet countColumn(row: Row, side: CountColumnSide)}
	<td
		class="table__numberColumn"
		data-no-drag
		class:diff-line-deletion={row.type === SectionType.RemovedLines}
		class:diff-line-addition={row.type === SectionType.AddedLines}
		style="--number-col-width: {pxToRem(NUMBER_COLUMN_WIDTH_PX + 2)}rem;"
		align="center"
		class:is-last={row.isLast}
		class:is-before={side === CountColumnSide.Before}
		class:selected={isSelected}
		onclick={() => {
			if (selectable) {
				handleSelected(hunk, !isSelected);
			}
		}}
	>
		{side === CountColumnSide.Before ? row.beforeLineNumber : row.afterLineNumber}
	</td>
{/snippet}

<div
	bind:clientWidth={tableWidth}
	bind:clientHeight={tableHeight}
	class="table__wrapper hide-native-scrollbar contrast-{diffContrast}"
	style="--tab-size: {tabSize}; --diff-font: {diffFont};"
	style:font-variant-ligatures={diffLigatures ? 'common-ligatures' : 'none'}
>
	<ScrollableContainer horz padding={{ left: NUMBER_COLUMN_WIDTH_PX * 2 + 2 }}>
		<table data-hunk-id={hunk.id} class="table__section">
			<thead class="table__title" class:draggable={!draggingDisabled}>
				<tr
					onclick={() => {
						if (selectable) {
							handleSelected(hunk, !isSelected);
						}
					}}
				>
					<th
						bind:clientWidth={numberHeaderWidth}
						class="table__checkbox-container"
						style="--border-width: {BORDER_WIDTH}px;"
						class:selected={isSelected}
						colspan={2}
					>
						<div class="table__checkbox">
							{#if selectable}
								<Checkbox
									checked={isSelected}
									small
									onclick={() => {
										if (selectable) {
											handleSelected(hunk, !isSelected);
										}
									}}
								/>
							{/if}
						</div>
						<div
							class="table__title-content"
							style="--number-col-width: {numberHeaderWidth}px; --table-width: {tableWidth}px; --border-width: {BORDER_WIDTH}px; --top: -{BORDER_WIDTH}px"
						>
							<span>
								{`@@ -${hunkLineInfo.beforLineStart},${hunkLineInfo.beforeLineCount} +${hunkLineInfo.afterLineStart},${hunkLineInfo.afterLineCount} @@`}
							</span>
							{#if hunk.locked}
								<div class="table__lock">
									<Icon name="locked-small" color="warning" />
								</div>
							{/if}
							{#if !draggingDisabled}
								<div class="table__drag-handle">
									<Icon name="draggable" />
								</div>
							{/if}
						</div>
					</th>
				</tr>
			</thead>

			<tbody>
				<tr>
					<td>
						<div
							class="table__right-box"
							style="--number-col-width: {numberHeaderWidth}px; --table-width: {tableWidth}px; --table-height: {tableHeight}px;"
						></div>
					</td>
				</tr>
				{#each renderRows as row}
					<tr data-no-drag>
						{@render countColumn(row, CountColumnSide.Before)}
						{@render countColumn(row, CountColumnSide.After)}
						<td
							{onclick}
							class="table__textContent"
							style="--tab-size: {tabSize}; --wrap: {wrapText ? 'wrap' : 'nowrap'}"
							class:readonly
							data-no-drag
							class:diff-line-deletion={row.type === SectionType.RemovedLines}
							class:diff-line-addition={row.type === SectionType.AddedLines}
							class:is-last={row.isLast}
							oncontextmenu={(event) => {
								handleLineContextMenu({
									event,
									hunk,
									beforeLineNumber: row.beforeLineNumber,
									afterLineNumber: row.afterLineNumber,
									subsection: subsections[0] as ContentSection
								});
							}}
						>
							{@html row.tokens.join('')}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</ScrollableContainer>
</div>

<style lang="postcss">
	.table__wrapper {
		overflow-x: auto;
		border-radius: var(--radius-s);
		background-color: var(--clr-diff-line-bg);

		&:hover .table__drag-handle {
			transform: scale(1);
			opacity: 1;
		}

		&:hover .table__lock {
			transform: translateX(-20px);
		}
	}

	table,
	.table__section {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		font-family: var(--diff-font);
	}

	thead {
		width: 100%;
		padding: 0;
	}

	tbody {
		z-index: var(--z-lifted);
	}

	th,
	td,
	tr {
		margin: 0;
		padding: 0;
	}

	table thead th {
		position: sticky;
		top: 0;
		left: 0;
		height: 28px;
	}

	.table__checkbox-container {
		box-sizing: border-box;
		z-index: var(--z-lifted);

		border-width: var(--border-width);
		border-style: solid;
		border-top-left-radius: var(--radius-s);
		border-color: var(--clr-border-2);
		background-color: var(--clr-diff-count-bg);

		&.selected {
			border-color: var(--clr-diff-selected-count-border);
			background-color: var(--clr-diff-selected-count-bg);
		}
	}

	.table__checkbox {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 6px;
	}

	.table__title {
		user-select: none;
	}

	.draggable {
		cursor: grab;
	}

	.table__drag-handle {
		box-sizing: border-box;
		display: flex;
		position: fixed;
		top: 6px;
		right: 6px;
		align-items: center;
		justify-content: center;
		transform: scale(0.9);
		transform-origin: top right;
		border-radius: var(--radius-s);
		background-color: var(--clr-bg-1);
		color: var(--clr-text-2);
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.2s,
			transform 0.2s;
	}

	.table__lock {
		box-sizing: border-box;
		display: flex;
		position: fixed;
		top: 6px;
		right: 6px;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-s);
		background-color: var(--clr-theme-warn-soft);
		color: var(--clr-text-2);
		pointer-events: none;
		transition: transform var(--transition-medium);
	}

	.table__right-box {
		position: absolute;
		top: 0;
		left: var(--number-col-width);
		width: calc(var(--table-width) - var(--number-col-width));
		height: var(--table-height);
		border-right: 1px solid var(--clr-border-2);
		border-bottom: 1px solid var(--clr-border-2);
		border-bottom-right-radius: var(--radius-s);
		pointer-events: none;
	}

	.table__title-content {
		box-sizing: border-box;
		display: flex;
		position: absolute;
		top: var(--top);
		left: var(--number-col-width);
		align-items: center;
		width: calc(var(--table-width) - var(--number-col-width));
		height: calc(100% + var(--border-width) * 2);
		padding: 4px 6px;
		border-top: 1px solid var(--clr-border-2);
		border-right: 1px solid var(--clr-border-2);
		border-bottom: 1px solid var(--clr-border-2);
		border-top-right-radius: var(--radius-m);
		color: var(--clr-text-2);
		font-weight: 400;
		font-size: 12px;
		text-wrap: nowrap;
	}

	.table__numberColumn {
		position: sticky;
		left: calc(var(--number-col-width));
		width: var(--number-col-width);
		min-width: var(--number-col-width);
		padding: 0 4px;
		border-color: var(--clr-diff-count-border);

		border-right: 1px solid var(--clr-border-2);
		background-color: var(--clr-diff-count-bg);
		color: var(--clr-diff-count-text);
		font-size: 11px;
		text-align: center;
		text-align: right;
		vertical-align: top;
		user-select: none;

		&.diff-line-addition {
			border-color: var(--clr-diff-addition-count-border);
			background-color: var(--clr-diff-addition-count-bg);
			color: var(--clr-diff-addition-count-text);
		}

		&.diff-line-deletion {
			border-color: var(--clr-diff-deletion-count-border);
			background-color: var(--clr-diff-deletion-count-bg);
			color: var(--clr-diff-deletion-count-text);
		}

		&.selected {
			border-color: var(--clr-diff-selected-count-border);
			background-color: var(--clr-diff-selected-count-bg);
			color: var(--clr-diff-selected-count-text);
		}

		&.is-last {
			border-bottom-width: 1px;
		}

		&.is-before {
			border-left-width: 1px;
		}

		&.is-before.is-last {
			border-bottom-left-radius: var(--radius-s);
		}
	}

	.table__numberColumn:first-of-type {
		left: 0px;
		width: var(--number-col-width);
		min-width: var(--number-col-width);
	}

	.table__textContent {
		z-index: var(--z-lifted);
		width: 100%;
		padding-left: 4px;
		font-size: 12px;
		line-height: 1.25;
		text-wrap: var(--wrap);
		white-space: pre;
		cursor: text;
		tab-size: var(--tab-size);
		user-select: text;
	}

	/* DIFF LINE */
	.diff-line-marker-addition,
	.diff-line-addition {
		background-color: var(--clr-diff-addition-line-bg);
	}

	.diff-line-marker-deletion,
	.diff-line-deletion {
		background-color: var(--clr-diff-deletion-line-bg);
	}

	/* CONTRAST MODIFIERS */
	.table__wrapper {
		&.contrast-light {
			--clr-diff-count-text: var('--', var(--clr-diff-count-text));
			/* deletion */
			--clr-diff-deletion-line-bg: var('--', var(--clr-diff-deletion-line-bg));
			--clr-diff-deletion-line-highlight: var('--', var(--clr-diff-deletion-line-highlight));
			--clr-diff-deletion-count-bg: var('--', var(--clr-diff-deletion-count-bg));
			--clr-diff-deletion-count-text: var('--', var(--clr-diff-deletion-count-text));
			--clr-diff-deletion-count-border: var('--', var(--clr-diff-deletion-count-border));
			/* addition */
			--ctx-diff-addition-line-bg: var('--', var(--clr-diff-addition-line-bg));
			--clr-diff-addition-line-highlight: var('--', var(--clr-diff-addition-line-highlight));
			--clr-diff-addition-count-bg: var('--', var(--clr-diff-addition-count-bg));
			--clr-diff-addition-count-text: var('--', var(--clr-diff-addition-count-text));
			--clr-diff-addition-count-border: var('--', var(--clr-diff-addition-count-border));
		}

		&.contrast-medium {
			--clr-diff-count-text: var(--clr-diff-count-text-contrast-2);
			/* deletion */
			--clr-diff-deletion-line-bg: var(--clr-diff-deletion-contrast-2-line-bg);
			--clr-diff-deletion-line-highlight: var(--clr-diff-deletion-contrast-2-line-highlight);
			--clr-diff-deletion-count-bg: var(--clr-diff-deletion-contrast-2-count-bg);
			--clr-diff-deletion-count-text: var(--clr-diff-deletion-contrast-2-count-text);
			--clr-diff-deletion-count-border: var(--clr-diff-deletion-contrast-2-count-border);
			/* addition */
			--clr-diff-addition-line-bg: var(--clr-diff-addition-contrast-2-line-bg);
			--clr-diff-addition-line-highlight: var(--clr-diff-addition-contrast-2-line-highlight);
			--clr-diff-addition-count-bg: var(--clr-diff-addition-contrast-2-count-bg);
			--clr-diff-addition-count-text: var(--clr-diff-addition-contrast-2-count-text);
			--clr-diff-addition-count-border: var(--clr-diff-addition-contrast-2-count-border);
		}

		&.contrast-strong {
			--clr-diff-count-text: var(--clr-diff-count-text-contrast-3);
			/* deletion */
			--clr-diff-deletion-line-bg: var(--clr-diff-deletion-contrast-3-line-bg);
			--clr-diff-deletion-line-highlight: var(--clr-diff-deletion-contrast-3-line-highlight);
			--clr-diff-deletion-count-bg: var(--clr-diff-deletion-contrast-3-count-bg);
			--clr-diff-deletion-count-text: var(--clr-diff-deletion-contrast-3-count-text);
			--clr-diff-deletion-count-border: var(--clr-diff-deletion-contrast-3-count-border);
			/* addition */
			--clr-diff-addition-line-bg: var(--clr-diff-addition-contrast-3-line-bg);
			--clr-diff-addition-line-highlight: var(--clr-diff-addition-contrast-3-line-highlight);
			--clr-diff-addition-count-bg: var(--clr-diff-addition-contrast-3-count-bg);
			--clr-diff-addition-count-text: var(--clr-diff-addition-contrast-3-count-text);
			--clr-diff-addition-count-border: var(--clr-diff-addition-contrast-3-count-border);
		}
	}
</style>
