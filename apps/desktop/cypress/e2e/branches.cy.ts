import { clearCommandMocks, mockCommand } from './support';
import { PROJECT_ID } from './support/mock/projects';
import UnappliedBranchesAndTargetCommits from './support/scenarios/unappliedBranchesAndTargetCommits';

describe('Branches', () => {
	let mockBackend: UnappliedBranchesAndTargetCommits;

	beforeEach(() => {
		mockBackend = new UnappliedBranchesAndTargetCommits();
		mockCommand('stack_details', (params) => mockBackend.getStackDetails(params));
		mockCommand('update_commit_message', (params) => mockBackend.updateCommitMessage(params));
		mockCommand('changes_in_worktree', (params) => mockBackend.getWorktreeChanges(params));
		mockCommand('tree_change_diffs', (params) => mockBackend.getDiff(params));
		mockCommand('commit_details', (params) => mockBackend.getCommitChanges(params));
		mockCommand('create_commit_from_worktree_changes', (params) =>
			mockBackend.createCommit(params)
		);
		mockCommand('undo_commit', (params) => mockBackend.undoCommit(params));
		mockCommand('list_branches', (params) => mockBackend.listBranches(params));
		mockCommand('branch_details', (params) => mockBackend.getBranchDetails(params));
		mockCommand('changes_in_branch', (args) => mockBackend.getBranchChanges(args));
		mockCommand('target_commits', (args) => mockBackend.getBaseBranchCommits(args));
		mockCommand('create_virtual_branch_from_branch', (args) =>
			mockBackend.createVirtualBranchFromBranch(args)
		);
		mockCommand('delete_local_branch', (params) => mockBackend.deleteLocalBranch(params));

		cy.visit('/');

		cy.url({ timeout: 3000 }).should('include', `/${PROJECT_ID}/workspace`);

		// Click on the branches button
		cy.getByTestId('navigation-branches-button').should('be.visible').should('be.enabled').click();

		// Be able to see the branches page
		cy.url({ timeout: 3000 }).should('include', `/${PROJECT_ID}/branches`);
	});

	afterEach(() => {
		clearCommandMocks();
	});

	it('should navigate to the branches page when clicking the branches button', () => {
		// The target branch should be automatically selected
		cy.getByTestId('target-commit-list-header')
			.should('be.visible')
			.should('contain', mockBackend.getBaseBranchName());

		// The branch drawer should be visible
		cy.getByTestId('unapplied-branch-drawer')
			.should('be.visible')
			.should('contain', mockBackend.getBaseBranchName());

		// The branch action buttons should not be visible
		cy.getByTestId('branches-view-apply-branch-button').should('not.exist');
		cy.getByTestId('branches-view-delete-local-branch-button').should('not.exist');
	});

	it('should navigate to the workspace after applying a branch', () => {
		// Click on the first branch
		cy.getByTestId('branch-list-card', mockBackend.branchListing.name)
			.first()
			.should('be.visible')
			.click();

		// The branch should be displayed
		cy.getByTestId('branch-header')
			.should('be.visible')
			.should('contain', mockBackend.branchListing.name);

		// The branch drawer should be visible
		cy.getByTestId('unapplied-branch-drawer')
			.should('be.visible')
			.should('contain', mockBackend.branchListing.name);

		// The branch action buttons should be visible
		cy.getByTestId('branches-view-apply-branch-button').should('be.visible').should('be.enabled');
		cy.getByTestId('branches-view-delete-local-branch-button')
			.should('be.visible')
			.should('be.enabled');

		// Click on the apply branch button
		cy.getByTestId('branches-view-apply-branch-button').click();

		// The workspace should be displayed
		cy.url({ timeout: 3000 }).should('include', `/${PROJECT_ID}/workspace`);
	});

	it('should be able to delete a local branch', () => {
		// Click on the first branch
		cy.getByTestId('branch-list-card', mockBackend.branchListing.name)
			.first()
			.should('be.visible')
			.click();

		// The branch should be displayed
		cy.getByTestId('branch-header')
			.should('be.visible')
			.should('contain', mockBackend.branchListing.name);

		// The branch drawer should be visible
		cy.getByTestId('unapplied-branch-drawer')
			.should('be.visible')
			.should('contain', mockBackend.branchListing.name);

		// The branch action buttons should be visible
		cy.getByTestId('branches-view-apply-branch-button').should('be.visible').should('be.enabled');
		cy.getByTestId('branches-view-delete-local-branch-button')
			.should('be.visible')
			.should('be.enabled');

		// Click on the delete branch button
		cy.getByTestId('branches-view-delete-local-branch-button').click();

		// The delete branch confirmation modal should be displayed
		cy.getByTestId('delete-local-branch-confirmation-modal')
			.should('be.visible')
			.should('contain', mockBackend.branchListing.name);

		// Click on the cancel button
		cy.getByTestId('delete-local-branch-confirmation-modal-cancel').click();

		// The delete branch confirmation modal should be closed
		cy.getByTestId('delete-local-branch-confirmation-modal').should('not.exist');

		// The branch drawer should be visible
		cy.getByTestId('unapplied-branch-drawer')
			.should('be.visible')
			.should('contain', mockBackend.branchListing.name);

		// Click on the delete branch button
		cy.getByTestId('branches-view-delete-local-branch-button').click();

		// The delete branch confirmation modal should be displayed
		cy.getByTestId('delete-local-branch-confirmation-modal')
			.should('be.visible')
			.should('contain', mockBackend.branchListing.name);

		// Click on the delete button
		cy.getByTestId('delete-local-branch-confirmation-modal-delete').click();

		// The delete branch confirmation modal should be closed
		cy.getByTestId('delete-local-branch-confirmation-modal').should('not.exist');

		// The branch drawer should be visible but should show the base branch name
		cy.getByTestId('unapplied-branch-drawer')
			.should('be.visible')
			.should('contain', mockBackend.getBaseBranchName());
	});
});
