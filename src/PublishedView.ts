import { ButtonComponent, ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_EXAMPLE = "example-view";

export class PublishedView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
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

		const pathToPlugin =
			this.app.vault.configDir + "/plugins/obsidian-nostr-writer";
		const publishedFilePath = `${pathToPlugin}/published.json`;

		console.log("File Path:", publishedFilePath); // Debugging line

		try {
			const file = await this.app.vault.adapter.read(publishedFilePath);
			const publishedNotes = JSON.parse(file);

			publishedNotes
				.reverse()
				.forEach((note: { tags: any[]; created_at: number }) => {
					const titleTag = note.tags.find(
						(tag: any[]) => tag[0] === "title"
					);
					const summaryTag = note.tags.find(
						(tag: any[]) => tag[0] === "summary"
					);
					const publishedAtTag = note.tags.find(
						(tag: any[]) => tag[0] === "published_at"
					);

					const title = titleTag ? titleTag[1] : "No Title";
					const summary = summaryTag ? summaryTag[1] : "No Summary";
					const publishedDate = publishedAtTag
						? new Date(
								Number(publishedAtTag[1]) * 1000
						  ).toLocaleString()
						: "No Published Date";

					const cardDiv = container.createEl("div", {
						cls: "published-card",
					});
					cardDiv.createEl("h5", { text: `${title}` });
					cardDiv.createEl("p", { text: `${summary}` });
					cardDiv.createEl("p", {
						text: `Published: ${publishedDate}`,
					});

					let noteDiv = cardDiv.createDiv("note-card");

					let copyButton = new ButtonComponent(noteDiv)
						.setButtonText("Copy ID to Clipboard")
						.setCta()
						.onClick(() => {
							// Copy the note ID to the clipboard
							navigator.clipboard
								.writeText(note.id)
								.then(() => {
									new Notice("ID copied to clipboard.");
								})
								.catch(() => {
									new Notice(
										"Failed to copy ID to clipboard."
									);
								});
						});



					// const idDiv = cardDiv.createEl("div", {
					// 	cls: "published-id",
					// });
					// const copyButton = idDiv.createEl("button", {
					// 	text: "Copy Nostr Event ID to Clipboard",
					// });

					// copyButton.addEventListener("click", () => {
					// 	navigator.clipboard
					// 		.writeText(note.id)
					// 		.then(() => {
					// 			new Notice("ID copied to clipboard.");
					// 		})
					// 		.catch((err) => {
					// 			new Notice("Failed to copy ID to clipboard.");
					// 			console.error("Could not copy text:", err);
					// 		});
					// });
				});
		} catch (err) {
			console.error("Error reading published.json:", err);
		}
	}

	async onClose() {
		// Nothing to clean up.
	}
}
