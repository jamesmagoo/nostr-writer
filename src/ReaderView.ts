import NostrWriterPlugin from "main";
import NostrService from "./nostr/NostrService";
import { ButtonComponent, ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { nip19 } from "nostr-tools";

export const READER_VIEW = "reader-view";

export class ReaderView extends ItemView {
	plugin: NostrWriterPlugin;
	nostrService: NostrService;
	private refreshDisplay: () => void;


	constructor(leaf: WorkspaceLeaf, plugin: NostrWriterPlugin, nostrService: NostrService) {
		super(leaf);
		this.plugin = plugin;
		this.nostrService = nostrService;
		this.refreshDisplay = () => this.onOpen()
	}

	getViewType() {
		return READER_VIEW;
	}

	getDisplayText() {
		return "Your Nostr Bookmarks";
	}

	getIcon() {
		return "star-list";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		let banner = container.createEl("div", {
			cls: "published-banner-div",
		});
		banner.createEl("h4", { text: "Bookmarks" });
		new ButtonComponent(banner)
			.setIcon("refresh-cw")
			.setCta()
			.setTooltip("Refresh bookmarks")
			.onClick(() => {
				this.refreshDisplay()
				this.nostrService.loadUserBookmarks();
				new Notice("View refreshed")
			});

			await this.loadUserBookmarks();
	}

	async loadUserBookmarks() {
		try {
			let bookmarks = await this.nostrService.loadUserBookmarks();
			console.log("reader view has the goods {}" , bookmarks);

			const container = this.containerEl.children[1];

			if (bookmarks.length > 0) {
				container.createEl("p", { text: `Total: ${bookmarks.length} ✅` });
				bookmarks.reverse().forEach((bookmark) => {
					const cardDiv = container.createEl("div", {
						cls: "published-card",
					});

					cardDiv.createEl("span", { text: `📜 ${bookmark.title}` });
					cardDiv.createEl("div", {
						text: `Description: ${bookmark.description}`,
						cls: "published-description",
					});
				});
			} else {
				const noBookmarksDiv = container.createEl("div", { cls: "published-card" });
				noBookmarksDiv.createEl("h6", { text: "No Bookmarks 📚" });
			}
		} catch (err) {
			console.error("Error reading bookmarks:", err);
			const noBookmarksDiv = container.createEl("div", { cls: "no-bookmarks" });
			noBookmarksDiv.createEl("h6", { text: "Error loading bookmarks" });
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


