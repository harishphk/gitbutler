import { isDefined } from '$lib/utils/typeguards';
import { listRemoteCommitFiles } from '$lib/vbranches/remoteCommits';
import { derived } from 'svelte/store';
import type { AnyFile, LocalFile } from '$lib/vbranches/types';

export interface FileKey {
	fileId: string;
	commitId?: string;
}

export function stringifyFileKey(fileId: string, commitId?: string) {
	return fileId + '|' + commitId;
}

export function parseFileKey(fileKeyString: string): FileKey {
	const [fileId, commitId] = fileKeyString.split('|');

	return {
		fileId,
		commitId: commitId == 'undefined' ? undefined : commitId
	};
}

export type SelectedFile = {
	context?: string;
	fileId: string;
};

type CallBack = (value: string[]) => void;

export class FileIdSelection {
	private value: string[];
	private callbacks: CallBack[];

	constructor(value: FileKey[] = []) {
		this.callbacks = [];
		this.value = value.map((key) => stringifyFileKey(key.fileId, key.commitId));
	}

	subscribe(callback: (value: string[]) => void) {
		callback(this.value);
		this.callbacks.push(callback);
		return () => this.unsubscribe(callback);
	}

	unsubscribe(callback: CallBack) {
		this.callbacks = this.callbacks.filter((cb) => cb !== callback);
	}

	add(fileId: string, commitId?: string) {
		this.value.push(stringifyFileKey(fileId, commitId));
		this.emit();
	}

	has(fileId: string, commitId?: string) {
		return this.value.includes(stringifyFileKey(fileId, commitId));
	}

	remove(fileId: string, commitId?: string) {
		this.value = this.value.filter((key) => key != stringifyFileKey(fileId, commitId));
		this.emit();
	}

	map<T>(callback: (fileId: string) => T) {
		return this.value.map((fileKey) => callback(fileKey));
	}

	set(values: string[]) {
		this.value = values;
		this.emit();
	}

	clear() {
		this.value = [];
		this.emit();
	}

	emit() {
		for (const callback of this.callbacks) {
			callback(this.value);
		}
	}

	only(): FileKey | undefined {
		if (this.value.length == 0) return;
		const fileKey = parseFileKey(this.value[0]);
		return fileKey;
	}

	selectedFile(localFiles: LocalFile[], branchId: string) {
		return derived(this, async (value): Promise<AnyFile | undefined> => {
			if (value.length != 1) return;
			const fileKey = parseFileKey(value[0]);
			return await findFileByKey(localFiles, branchId, fileKey);
		});
	}

	files(localFiles: LocalFile[], branchId: string) {
		return derived(this, async (value) => {
			const files = await Promise.all(
				value.map(async (fileKey) => {
					return await findFileByKey(localFiles, branchId, parseFileKey(fileKey));
				})
			);

			return files.filter(isDefined);
		});
	}

	get length() {
		return this.value.length;
	}
}

export async function findFileByKey(localFiles: LocalFile[], projectId: string, key: FileKey) {
	if (key.commitId) {
		const remoteFiles = await listRemoteCommitFiles(projectId, key.commitId);
		return remoteFiles.find((file) => file.id == key.fileId);
	} else {
		return localFiles.find((file) => file.id == key.fileId);
	}
}
