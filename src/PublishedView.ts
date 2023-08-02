import {
	ItemView,
	WorkspaceLeaf,
	normalizePath,
	FileSystemAdapter,
	TFile,
} from "obsidian";

export const VIEW_TYPE_EXAMPLE = "example-view";

export class PublishedView extends ItemView {
	fileSystemAdapter: FileSystemAdapter;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.fileSystemAdapter = new FileSystemAdapter();
	}

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	getDisplayText() {
		return "Published To Nostr";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("h4", { text: "Published To Nostr" });
		// Assuming the path to the published.json file
		const pathToPublished = normalizePath(
			this.app.vault.configDir +
				"//plugins/obsidian-nostr-writer/published.json"
		);
		

		const file = this.app.vault.getAbstractFileByPath(
			pathToPublished
		) as TFile;
		if (file) {
			const content = await this.app.vault.read(file);
			const publishedNotes = JSON.parse(content);

			// Process and display the published notes
			publishedNotes.forEach((note:any) => {
				container.createEl("h5", { text: note.title });
				container.createEl("p", { text: note.summary });
				container.createEl("p", {
					text: new Date(note.timePublished).toLocaleString(),
				});
			});
		} else {
			console.warn("Published file not found.");
		}
	}

	async onClose() {
		// Nothing to clean up.
	}
}
