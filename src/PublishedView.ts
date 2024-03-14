import NostrWriterPlugin from "main";
import { ButtonComponent, ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { nip19 } from "nostr-tools";

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

			if (publishedNotes) {
				container.createEl("p", { text: `Total: ${publishedNotes.length} ✅` })
				publishedNotes
					.reverse()
					.forEach((note: { tags: any[]; created_at: number, id: string, filepath: string, profileNickname: string, pubkey: string, publishedToRelays: string[], kind: number }) => {
						const titleTag = note.tags.find(
							(tag: any[]) => tag[0] === "title"
						);
						const publishedAtTag = note.tags.find(
							(tag: any[]) => tag[0] === "published_at"
						);

						const title = titleTag ? titleTag[1] : "No Title";
						// const summary = summaryTag ? summaryTag[1] : "No Summary";
						const publishedDate = publishedAtTag ? new Date(Number(publishedAtTag[1]) * 1000).toLocaleString('en-US', {
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

						if (this.plugin.settings.multipleProfilesEnabled) {
							if (note.profileNickname) {
								let displayNickname = note.profileNickname
								if (note.profileNickname == "default") {
									displayNickname = "Default Profile"
								}

								cardDiv.createEl("div", {
									text: `👤 - ${displayNickname}`,
									cls: "published-profile",
								});
							}
						}

						let detailsDiv = cardDiv.createEl("div", {
							cls: "published-details-div",
						});

						detailsDiv.createEl("p", {
							text: `${publishedDate}.`,
						});

						let noteDiv = cardDiv.createEl("div", {
							cls: "published-id",
						});

						let target: nip19.EventPointer = {
							id: note.id,
							author: note.pubkey,
							relays: note.publishedToRelays
						}

						let nevent = nip19.neventEncode(target)

						new ButtonComponent(detailsDiv)
							.setIcon("popup-open")
							.setCta()
							.setTooltip("View Online")
							.onClick(() => {
								const url = `https://njump.me/${nevent}`;
								window.open(url, '_blank');
							});

						new ButtonComponent(detailsDiv)
							.setIcon("go-to-file")
							.setCta()
							.setTooltip("Go to file in Obsidian")
							.onClick(() => {
								if (note.filepath == null) {
									const openFile = this.app.workspace.getActiveFile();
									console.log(openFile?.path)
									new Notice("File path not available")
								} else {
									this.focusFile(note.filepath)
								}
							});
					});
			} else {
				const noPostsDiv = container.createEl("div", { cls: "published-card", });
				noPostsDiv.createEl("h6", { text: "No Posts 📝" });
			}
		} catch (err) {
			console.error("Error reading published.json:", err);
			const noPostsDiv = container.createEl("div", { cls: "no-posts", });
			noPostsDiv.createEl("h6", { text: "No Posts 📝" });
		}
	}

	focusFile = (path: string, shouldSplit = false): void => {
		const targetFile = this.app.vault
			.getAbstractFileByPath(path)
		if (targetFile && targetFile instanceof TFile) {
			let leaf = this.app.workspace.getLeaf();
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


