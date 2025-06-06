<script lang="ts">
	// This is always displayed in the context of not having a cooresponding vbranch or remote
	import { goto } from '$app/navigation';
	import BaseBranchService from '$lib/baseBranch/baseBranchService.svelte';
	import { VirtualBranchService } from '$lib/branches/virtualBranchService';
	import { showError } from '$lib/notifications/toasts';
	import { Project } from '$lib/project/project';
	import { RemotesService } from '$lib/remotes/remotesService';
	import { StackService } from '$lib/stacks/stackService.svelte';
	import { getContext } from '@gitbutler/shared/context';
	import Badge from '@gitbutler/ui/Badge.svelte';
	import Button from '@gitbutler/ui/Button.svelte';
	import Modal from '@gitbutler/ui/Modal.svelte';
	import Textbox from '@gitbutler/ui/Textbox.svelte';
	import Link from '@gitbutler/ui/link/Link.svelte';
	import Markdown from '@gitbutler/ui/markdown/Markdown.svelte';
	import type { PullRequest } from '$lib/forge/interface/types';

	const { pr }: { pr: PullRequest } = $props();

	const project = getContext(Project);
	const remotesService = getContext(RemotesService);
	const virtualBranchService = getContext(VirtualBranchService);
	const baseBranchService = getContext(BaseBranchService);
	const baseRepoResponse = $derived(baseBranchService.repo(project.id));
	const baseRepo = $derived(baseRepoResponse.current.data);
	const stackService = getContext(StackService);

	let inputRemoteName = $state<string>(pr.repoOwner || '');

	let createRemoteModal: Modal | undefined;

	let loading = $state(false);

	function closeModal(close: () => void) {
		close();
	}

	function getRemoteUrl() {
		if (!baseRepo) return;

		if (baseRepo.protocol?.startsWith('http')) {
			return pr.repositoryHttpsUrl;
		} else {
			return pr.repositorySshUrl;
		}
	}

	async function handleConfirmRemote() {
		const remoteUrl = getRemoteUrl();

		if (!remoteUrl) {
			throw new Error(`Remote url not available for pr #${pr.number}.`);
		}

		loading = true;

		try {
			const remoteRef = 'refs/remotes/' + inputRemoteName + '/' + pr.sourceBranch;
			await remotesService.addRemote(project.id, inputRemoteName, remoteUrl);
			await baseBranchService.fetchFromRemotes(project.id);
			await stackService.createVirtualBranchFromBranch({
				projectId: project.id,
				branch: remoteRef,
				remote: remoteRef,
				prNumber: pr.number
			});
			await virtualBranchService.refresh();

			// This is a little absurd, but it makes it soundly typed
			goto(`/${project.id}/board`);

			createRemoteModal?.close();
		} catch (err: unknown) {
			showError('Failed to apply forked branch', err);
		} finally {
			loading = false;
		}
	}
</script>

<Modal width="small" bind:this={createRemoteModal} onSubmit={handleConfirmRemote}>
	<p class="text-15 fork-notice">
		In order to apply a branch from a fork, GitButler must first add a remote.
	</p>
	<Textbox label="Choose a remote name" bind:value={inputRemoteName} required />
	{#snippet controls(close)}
		<Button kind="outline" onclick={() => closeModal(close)}>Cancel</Button>
		<Button style="pop" type="submit" grow {loading}>Confirm</Button>
	{/snippet}
</Modal>

<div class="wrapper">
	<div class="card">
		<div class="card__header text-14 text-body text-semibold">
			<h2 class="text-14 text-semibold">
				{pr.title}
				<span class="card__title-pr">
					<Link target="_blank" rel="noreferrer" href={pr.htmlUrl}>
						#{pr.number}
					</Link>
				</span>
			</h2>
			{#if pr.draft}
				<Badge size="tag" style="neutral" icon="draft-pr-small">Draft</Badge>
			{:else}
				<Badge size="tag" style="success" icon="pr-small">Open</Badge>
			{/if}
		</div>

		<div class="card__content">
			<div class="text-13">
				<span class="text-bold">
					{pr.author?.name}
				</span>
				wants to merge into
				<span class="code-string">
					{pr.targetBranch}
				</span>
				from
				<span class="code-string">
					{pr.sourceBranch}
				</span>
			</div>
			{#if pr.body}
				<Markdown content={pr.body} />
			{/if}
		</div>
		<div class="card__footer">
			<Button
				style="pop"
				tooltip="Fetch from the remote and apply the branch from there"
				onclick={async () => createRemoteModal?.show()}>Apply from fork</Button
			>
		</div>
	</div>
</div>

<style lang="postcss">
	.wrapper {
		display: flex;
		flex-direction: column;
		max-width: 896px;
		gap: 16px;
	}
	.card__content {
		gap: 12px;
	}
	.card__title-pr {
		margin-left: 4px;
		opacity: 0.4;
	}

	.fork-notice {
		margin-bottom: 8px;
	}
</style>
