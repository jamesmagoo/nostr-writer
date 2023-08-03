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

		const pathToPlugin = this.app.vault.configDir + "/plugins/obsidian-nostr-writer";
		const publishedFilePath = `${pathToPlugin}/published.json`;
		try {
			const file = await this.app.vault.adapter.read(publishedFilePath);
			const publishedNotes = JSON.parse(file);

			if(publishedNotes){

			publishedNotes
				.reverse()
				.forEach((note: { tags: any[]; created_at: number , id : string}) => {
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
					cardDiv.createEl("b", { text: `${title}` });
					//cardDiv.createEl("p", { text: `${summary}` });
					let detailsDiv = cardDiv.createEl("div", {
						cls: "published-details-div",
					});
					detailsDiv.createEl("p", {
						text: `${publishedDate}`,
					});

					let noteDiv = cardDiv.createEl("div", {
						cls: "published-id",
					});

					let copyButton = new ButtonComponent(detailsDiv)
						.setIcon("copy")
						.setTooltip("Copy Nostr event ID")
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
			} else {
				const noPostsDiv = container.createEl("div", {cls: "published-card",});
				noPostsDiv.createEl("h6", {text : "No Posts 📝" });
			}
		} catch (err) {
			console.error("Error reading published.json:", err);
			const noPostsDiv = container.createEl("div", {cls: "no-posts",});
			noPostsDiv.createEl("h6", {text : "No Posts 📝" });
		}
	}

	async onClose() {
		// Nothing to clean up.
	}
}
