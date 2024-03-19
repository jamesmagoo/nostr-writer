import NostrWriterPlugin from "main";
import NostrService from "./nostr/NostrService";
import { ButtonComponent, ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { nip19 } from "nostr-tools";

export const READER_VIEW = "reader-view";

export class ReaderView extends ItemView {
	plugin: NostrWriterPlugin;
	nostrService: NostrService;
	refreshDisplay: () => void;


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
				new Notice("View refreshed")
			});

		//await this.loadUserBookmarks();
		try {
			let bookmarks = await this.nostrService.loadUserBookmarks();

			if (bookmarks) {
				container.createEl("p", { text: `Total: ${bookmarks.length} ✅` });
				bookmarks.reverse().forEach((bookmark) => {
					const cardDiv = container.createEl("div", { cls: "bookmark-card" });

					// Display Content
					cardDiv.createEl("div", {
						text: `${bookmark.content}`,
						cls: "bookmark-content",
					});

					// Format Created At
					const createdAt = new Date(bookmark.created_at * 1000).toLocaleString();
					cardDiv.createEl("div", {
						text: `Created At: ${createdAt}`,
						cls: "bookmark-created-at",
					});

					// Display Public Key (Pubkey)
					const publicKeyDiv = cardDiv.createEl("div", {
						cls: "bookmark-pubkey",
					});
					publicKeyDiv.createEl("img", {
						attr: {
							src: "placeholder.png", // Placeholder for profile pic
							alt: "Profile Pic",
						},
						cls: "bookmark-profile-pic",
					});
					publicKeyDiv.createEl("span", { text: `Public Key: ${bookmark.pubkey}` });

					// Button to View Online
					let detailsDiv = cardDiv.createEl("div", {
						cls: "bookmark-view-online-btn",
					});

					let target: nip19.EventPointer = {
						id: bookmark.id,
						author: bookmark.pubkey,
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
					// Button to Download Content
					const downloadBtn = detailsDiv.createEl("button", {
						cls: "bookmark-download-btn",
						text: "Download",
					});
					downloadBtn.addEventListener("click", () => {
						this.downloadBookmark(bookmark);
					});

				});
			} else {
				const noBookmarksDiv = container.createEl("div", { cls: "bookmark-card" });
				noBookmarksDiv.createEl("h6", { text: "No Bookmarks 📚" });
			}


		} catch (err) {
			console.error("Error reading bookmarks:", err);
			const noBookmarksDiv = container.createEl("div", { cls: "no-bookmarks" });
			noBookmarksDiv.createEl("h6", { text: "Error loading bookmarks" });
		}
	}


	async downloadBookmark(bookmark: any) {
		const filename = `bookmark_${bookmark.id}.md`; // Generate a unique filename
		const content = this.generateMarkdownContent(bookmark); // Generate markdown content

		// Create a new markdown file in the current vault
		const file: TFile = await this.createMarkdownFile(filename, content);

		// Open the newly created markdown file in Obsidian
		await this.app.workspace.openLinkText(filename, file.path, true);
	}

	async createMarkdownFile(filename: string, content: string): Promise<TFile> {
		// Create the markdown file in the current vault
		const file: TFile = this.app.vault.create(filename, content);

		// Return the created file
		return file;
	}


	generateMarkdownContent(bookmark: any): string {
		// Format the created at date
		const createdAt = new Date(bookmark.created_at * 1000).toLocaleString();

		// Generate the markdown content with the bookmark details
		const markdownContent = `
# Bookmark

**Content:** ${bookmark.content}
**Created At:** ${createdAt}
**Public Key:** ${bookmark.pubkey}
`;

		return markdownContent;
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


