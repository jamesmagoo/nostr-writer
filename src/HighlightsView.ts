import NostrWriterPlugin from "main";
import NostrService from "./service/NostrService";
import { ButtonComponent, ItemView, Notice, TFile, WorkspaceLeaf } from "obsidian";
import { nip19 } from "nostr-tools";
import { parseReferences } from 'nostr-tools/references'

export const HIGHLIGHTS_VIEW = "highlights-view";

export class HighlightsView extends ItemView {
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
		return HIGHLIGHTS_VIEW;
	}

	getDisplayText() {
		return "Your Nostr Highlights";
	}

	getIcon() {
		return "edit";
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		let banner = container.createEl("div", {
			cls: "published-banner-div",
		});
		banner.createEl("h4", { text: "Highlights" });
		new ButtonComponent(banner)
			.setIcon("refresh-cw")
			.setCta()
			.setTooltip("Refresh highlights")
			.onClick(() => {
				this.refreshDisplay()
				new Notice("View refreshed")
			});

		try {
			let bookmarks = await this.nostrService.loadUserBookmarks();
			if (this.nostrService.connectedRelays.length === 0) {
				new Notice("Re-connect to relays...")
			}
			if (bookmarks.length > 0) {
				container.createEl("p", { text: `Total: ${bookmarks.length} ✅` });

				bookmarks.reverse().forEach(async (bookmark) => {
					let bookmarkProfile = await this.nostrService.getUserProfile(bookmark.pubkey);
					let profileName = "";
					let profilePicURL = "";

					try {
						const profileObject = JSON.parse(bookmarkProfile[0].content);
						const { name, picture } = profileObject;
						profileName = name;

						if (picture == undefined) {
							for (const tag of bookmarkProfile.tags) {
								if (tag[0] === "image") {
									const pictureUrl = tag[1];
									profilePicURL = pictureUrl;
									break;
								}
							}
						} else {
							profilePicURL = picture;
						}
					} catch (err) {
						console.error("Problem Parsing Profile...setting defaults...", err)
					}

					const cardDiv = container.createEl("div", {
						cls: "bookmark-card",
					});
					if (bookmark.kind === 30023) {
						const titleTag = bookmark.tags.find((tag: any[]) => tag[0] === "title");
						if (titleTag) {
							const title = titleTag[1];
							cardDiv.createEl("h3", { text: title });
						}
					}

					const contentDiv = cardDiv.createDiv({
						cls: "bookmark-content",
					});

					// parse nostr tags, npubs wtc.
					let references = parseReferences(bookmark)
					let linkedEvent = false;
					let linkedEventURL = "";
					let simpleAugmentedContent = bookmark.content;

					for (let i = 0; i < references.length; i++) {
						let { text, profile, event, address } = references[i];

						let augmentedReference;
						if (profile) {
							const taggedProfile = await this.nostrService.getUserProfile(profile.pubkey);
							const { name } = JSON.parse(taggedProfile[0].content);
							augmentedReference = `<strong>@${name}</strong>`;
						} else if (event) {
							let linkedEventPointer: nip19.EventPointer = {
								id: event.id,
							}
							let x = nip19.neventEncode(linkedEventPointer);
							//augmentedReference = `<a href="https://njump.me/${x}" target="_blank">Referenced Event</a>`;
							augmentedReference = "";
							linkedEvent = true;
							linkedEventURL = `https://njump.me/${x}`
						} else if (address) {
							augmentedReference = `<a href="${text}">Referenced Event</a>`;
						} else {
							augmentedReference = text;
						}
						simpleAugmentedContent = simpleAugmentedContent.replaceAll(text, augmentedReference);
					}

					if (bookmark.kind === 30023) {
						const summaryTag = bookmark.tags.find((tag: any[]) => tag[0] === "summary");
						if (summaryTag) {
							const summary = summaryTag[1];
							simpleAugmentedContent = `<em>${summary}</em>`;

						} else {
							const firstLineIndex = simpleAugmentedContent.indexOf('\n');
							if (firstLineIndex !== -1) {
								simpleAugmentedContent = simpleAugmentedContent.substring(0, firstLineIndex);
							} else {
								simpleAugmentedContent = simpleAugmentedContent.substring(0, 140) + '...'
							}
						}
					}

					contentDiv.innerHTML = simpleAugmentedContent.replace(/\bhttps?:\/\/\S+/gi, "");

					const imageUrls = this.extractImageUrls(bookmark.content);

					imageUrls.forEach((imageUrl) => {
						cardDiv.createEl("img", {
							attr: {
								src: imageUrl,
							},
							cls: "bookmark-image",
						});
					});


					const imageTag = bookmark.tags.find((tag: any[]) => tag[0] === "image");
					if (imageTag) {
						const imageURL = imageTag[1];
						cardDiv.createEl("img", {
							attr: {
								src: imageURL,
							},
							cls: "bookmark-image",
						});
					}


					const publicKeyDiv = cardDiv.createEl("div", {
						cls: "bookmark-pubkey",
					});
					publicKeyDiv.createEl("img", {
						attr: {
							src: `${profilePicURL}`,
							alt: "Profile Pic",
						},
						cls: "bookmark-profile-pic",
					});
					const displayName = profileName ? profileName : "Unknown";

					publicKeyDiv.createEl("span", { text: displayName });

					const createdAt = new Date(bookmark.created_at * 1000).toLocaleString();
					cardDiv.createEl("div", {
						text: `Bookmarked On: ${createdAt}`,
						cls: "bookmark-created-at",
					});

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

					new ButtonComponent(detailsDiv)
						.setIcon("download")
						.setClass("bookmark-btn")
						.setCta()
						.setTooltip("Download & Open in Obsidian")
						.onClick(() => {
							this.downloadBookmark(bookmark);
						});

					if (linkedEvent) {
						new ButtonComponent(detailsDiv)
							.setIcon("link")
							.setCta()
							.setTooltip("View Linked Event")
							.onClick(() => {
								window.open(linkedEventURL, '_blank');
							});

					}
				});
			} else {
				const noBookmarksDiv = container.createEl("div", { cls: "nobookmarks-card" });
				noBookmarksDiv.createEl("h6", { text: "No Bookmarks Found 📚" });
				noBookmarksDiv.createEl("p", { text: "Use listr.lol to edit & manage your bookmarks" });
				const linkEl = noBookmarksDiv.createEl("a", { text: "listr.lol" });
				linkEl.href = "https://listr.lol";
				linkEl.target = "_blank";

			}
		} catch (err) {
			console.error("Error reading bookmarks:", err);
			new Notice("Problem reading bookmarks - re-connect & check you list.")
			const noBookmarksDiv = container.createEl("div", { cls: "nobookmarks-card" });
			noBookmarksDiv.createEl("h6", { text: "No Bookmarks Found 📚" });
			noBookmarksDiv.createEl("p", { text: "Use listr.lol to edit & manage your bookmarks" });
			const linkEl = noBookmarksDiv.createEl("a", { text: "listr.lol" });
			linkEl.href = "https://listr.lol";
			linkEl.target = "_blank";
		}
	}

	openLink(url: string) {
		console.log(url)
		window.open(url, '_blank');
	}


	async downloadBookmark(bookmark: any) {
		try {
			let filename: string;
			const titleTag = bookmark.tags.find((tag: any[]) => tag[0] === "title");
			if (titleTag) {
				filename = `${titleTag[1]}.md`;
			} else {
				filename = `bookmark_${bookmark.id.substring(0, 8)}.md`;
			}
			const content = this.generateMarkdownContent(bookmark); 

			const file: TFile | null = await this.createMarkdownFile(filename, content);

			if (file !== null) {
				await this.app.workspace.openLinkText(filename, file.path, true);
			} else {
				new Notice("Failed to create file. File may already exist.");
			}
		} catch (error) {
			console.error("Error downloading bookmark:", error);
			new Notice("Failed to create file. File may already exist.");
		}
	}


	async createMarkdownFile(filename: string, content: string): Promise<TFile | null> {
		try {
			const file = this.app.vault.create(filename, content);
			return file;
		} catch (error) {
			if (error.message.includes("File already exists")) {
				new Notice("File already exists");
			} else {
				console.error("Error creating file:", error);
			}
			return null;
		}
	}



	generateMarkdownContent(bookmark: any): string {
		const createdAt = new Date(bookmark.created_at * 1000).toLocaleString();

		let source : nip19.ProfilePointer = {
			pubkey: bookmark.pubkey, 
		}
		let y = nip19.nprofileEncode(source);
		const url = `https://njump.me/${y}`;
		const markdownContent = `
# Nostr Bookmark

**Content:** 
\n 
${bookmark.content}
\n
***
**Created At:** ${createdAt}
**Source:** ${url}
		`;

		return markdownContent;
	}


	extractImageUrls(content: string): string[] {
		const urlRegex = /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif))/gi;
		const urls: string[] = [];
		let match;
		while ((match = urlRegex.exec(content)) !== null) {
			urls.push(match[0]);
		}
		return urls;
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


