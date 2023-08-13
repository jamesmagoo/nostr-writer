import NostrWriterPlugin from "main";
import { ButtonComponent, ItemView, Notice, WorkspaceLeaf } from "obsidian";

export const PUBLISHED_VIEW = "published-view";

export class PublishedView extends ItemView {
	plugin: NostrWriterPlugin;
	private refreshDisplay: () => void;


	constructor(leaf: WorkspaceLeaf, plugin: NostrWriterPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.refreshDisplay = () => this.onOpen()
	}

	getViewType() {
		return PUBLISHED_VIEW;
	}

	getDisplayText() {
		return "Published To Nostr";
	}

	getIcon() {
		return "scroll";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		let banner = container.createEl("div", {
			cls: "published-banner-div",
		});
		banner.createEl("h4", { text: "Published" });
		new ButtonComponent(banner)
						.setIcon("refresh-cw")
						.setCta()
						.setTooltip("Refresh view")
						.onClick(() => {
							this.refreshDisplay()		
							new Notice("View refreshed")					
						});
		
		const publishedFilePath = `${this.plugin.manifest.dir}/published.json`;
		try {
			const file = await this.app.vault.adapter.read(publishedFilePath);
			const publishedNotes = JSON.parse(file);
			
			if(publishedNotes){				
			container.createEl("p", {text: `Total: ${publishedNotes.length} ✅` })
			publishedNotes
				.reverse()
				.forEach((note: { tags: any[]; created_at: number , id : string, filepath: string}) => {
					const titleTag = note.tags.find(
						(tag: any[]) => tag[0] === "title"
					);
					const publishedAtTag = note.tags.find(
						(tag: any[]) => tag[0] === "published_at"
					);

					const title = titleTag ? titleTag[1] : "No Title";
					// const summary = summaryTag ? summaryTag[1] : "No Summary";
					const publishedDate = publishedAtTag
						? new Date(
								Number(publishedAtTag[1]) * 1000
						  ).toLocaleString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric',
							weekday: 'long',
							hour: '2-digit',
							minute: '2-digit',
						  })
						: "No Published Date";

					const cardDiv = container.createEl("div", {
						cls: "published-card",
					});
					cardDiv.createEl("span", { text: `📜 ${title}` });
					//cardDiv.createEl("p", { text: `${summary}` });
					let detailsDiv = cardDiv.createEl("div", {
						cls: "published-details-div",
					});
					detailsDiv.createEl("p", {
						text: `${publishedDate}.`,
					});

					let noteDiv = cardDiv.createEl("div", {
						cls: "published-id",
					});

					new ButtonComponent(detailsDiv)
						.setIcon("copy")
						.setCta()
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
					
						new ButtonComponent(detailsDiv)
						.setIcon("file-text")
						.setCta()
						.setTooltip("Go to file in Obsidian")
						.onClick(() => {
							if(note.filepath == null){
								const openFile = this.app.workspace.getActiveFile();
								console.log(openFile?.path)
								new Notice("File path not available")
							} else {
								this.focusFile(note.filepath)
							}
						});
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

	focusFile = (path: string, shouldSplit = false): void => {
		const targetFile = this.app.vault
		  .getFiles()
		  .find((f) => f.path === path);
		if (targetFile) {
		  let leaf = this.app.workspace.getMostRecentLeaf();
		  const createLeaf = shouldSplit || leaf?.getViewState().pinned;
		  if (createLeaf) {
			  leaf = this.app.workspace.getLeaf('tab');
		  }
		  leaf?.openFile(targetFile);
		} else {
		  new Notice('Cannot find a file with that name');
		}
	};

}



