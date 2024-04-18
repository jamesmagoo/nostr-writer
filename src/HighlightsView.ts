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
			let highlights = await this.nostrService.loadUserHighlights();
			if (this.nostrService.connectedRelays.length === 0) {
				new Notice("Re-connect to relays...")
			}
			if (highlights.length > 0) {
				container.createEl("p", { text: `Total: ${highlights.length} ✅` });

				highlights.reverse().forEach(async (highlight) => {
					const cardDiv = container.createEl("div", {
						cls: "bookmark-card",
					});
					const contentDiv = cardDiv.createDiv({
						cls: "highlight-content",
					});

					// parse nostr tags, npubs wtc.
					let references = parseReferences(highlight)
					let linkedEvent = false;
					let linkedEventURL = "";
					let simpleAugmentedContent = highlight.content;

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

					contentDiv.innerHTML = simpleAugmentedContent.replace(/\bhttps?:\/\/\S+/gi, "");

					contentDiv.addEventListener("click", function() {
						const textToCopy = contentDiv.textContent;
						navigator.clipboard.writeText(textToCopy)
							.then(() => {
								// Show tooltip
								new Notice("📋 Copied to clipboard ✅.")
							})
							.catch(error => {
								console.error("Failed to copy text: ", error);
							});
					});

					const authorTag = highlight.tags.find((tag: any[]) => tag[0] === "p");

					// TODO Need to get the highlight source article and display it with a link this is the "a" tag 
					let sourceTag = highlight.tags.find((tag: any[]) => tag[0] === "a");
					if (sourceTag == undefined) {
						// try the "e" tag
						sourceTag = highlight.tags.find((tag: any[]) => tag[0] === "e");
					}
					const externalSourceTag = highlight.tags.find((tag: any[]) => tag[0] === "r");
					let highlightSource: any = null;
					if (sourceTag !== undefined) {
						highlightSource = await this.nostrService.getEventFromATag(sourceTag[1]);
					}

					if (authorTag !== undefined) {
						let highlightProfile = await this.nostrService.getUserProfile(authorTag[1]);
						let profileName = "";
						let profilePicURL = "";

						try {
							const profileObject = JSON.parse(highlightProfile[0].content);
							const { name, picture } = profileObject;
							profileName = name;

							if (picture == undefined) {
								for (const tag of highlightProfile.tags) {
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

						if (sourceTag !== undefined) {
							if (highlightSource !== null) {
								let sourceTitle = "Unknown..."
								for (const tag of highlightSource.tags) {
									if (tag[0] === "title") {
										sourceTitle = tag[1];
										break;
									}
								}

								let target: nip19.EventPointer = {
									id: highlightSource.id,
									author: highlightSource.pubkey,
								}

								let nevent = nip19.neventEncode(target)
								const url = `https://njump.me/${nevent}`;

								const contentSourceDiv = cardDiv.createEl("div", {
									cls: "highlight-content-source",
								});
								contentSourceDiv.createEl("img", {
									attr: {
										src: `${profilePicURL}`,
										alt: "Profile Pic",
									},
									cls: "bookmark-profile-pic",
								});
								const displayName = profileName ? profileName : "Unknown";

								contentSourceDiv.createEl("a", {
									attr: {
										href: url,
										target: "_blank",
									},
									text: `${sourceTitle}`,
									cls: "source-article-link",
								});

								contentSourceDiv.createEl("span", { text: "  " });
								contentSourceDiv.createEl("span", { text: " | " });
								contentSourceDiv.createEl("span", { text: displayName });
							}
						}
					} else {
						if (externalSourceTag !== undefined) {
							let externalSourceDiv = cardDiv.createEl("div", {
								cls: "highlight-content-source",
							});
							externalSourceDiv.createEl("a", {
								attr: {
									href: externalSourceTag[1],
									target: "_blank",
								},
								text: externalSourceTag[1],
								cls: "source-article-link",
							});
						}
					}

					const createdAt = new Date(highlight.created_at * 1000).toLocaleString();
					let bottomDiv = cardDiv.createEl("div", {
						text: `Highlighted on: ${createdAt}`,
						cls: "highlight-created-at",
					});

					if (highlightSource !== null) {
						new ButtonComponent(bottomDiv)
							.setIcon("download")
							.setClass("highlight-btn")
							.setTooltip("Download full source article.")
							.onClick(() => {
								this.downloadBookmark(highlightSource);
							});
					}
				});
			} else {
				const noBookmarksDiv = container.createEl("div", { cls: "nobookmarks-card" });
				noBookmarksDiv.createEl("h6", { text: "No Highlights Found 📚" });
				noBookmarksDiv.createEl("p", { text: "Use highlighter.com to read and highlight." });
				const linkEl = noBookmarksDiv.createEl("a", { text: "highlighter.com" });
				linkEl.href = "https://highlighter.com";
				linkEl.target = "_blank";

			}
		} catch (err) {
			console.error("Error reading highlights:", err);
			new Notice("Problem reading highlights - re-connect & check you list.")
			const noBookmarksDiv = container.createEl("div", { cls: "nobookmarks-card" });
			noBookmarksDiv.createEl("h6", { text: "No Highlights Found 📚" });
			noBookmarksDiv.createEl("p", { text: "Use highlighter.com to read and highlight." });
			const linkEl = noBookmarksDiv.createEl("a", { text: "highlighter.com" });
			linkEl.href = "https://highlighter.com";
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

		let source: nip19.ProfilePointer = {
			pubkey: bookmark.pubkey,
		}
		let y = nip19.nprofileEncode(source);
		const url = `https://njump.me/${y}`;
		const markdownContent = `
# Nostr Highlight Source

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


