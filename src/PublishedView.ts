import NostrWriterPlugin from "main";
import {
	ButtonComponent,
	ItemView,
	Notice,
	TFile,
	WorkspaceLeaf,
} from "obsidian";
import { nip19, getPublicKey } from "nostr-tools";

export const PUBLISHED_VIEW = "published-view";

export class PublishedView extends ItemView {
	plugin: NostrWriterPlugin;
	private refreshDisplay: () => void;
	filterHex: string;

	constructor(leaf: WorkspaceLeaf, plugin: NostrWriterPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.refreshDisplay = () => this.onOpen();
		let pk = plugin.settings.privateKey;
		let hexpk = nip19.decode(pk);
		let pub = getPublicKey(hexpk.data as string);
		this.filterHex = pub;
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
				this.refreshDisplay();
				new Notice("View refreshed");
			});

		const publishedFilePath = `${this.plugin.manifest.dir}/published.json`;
		try {
			const file = await this.app.vault.adapter.read(publishedFilePath);
			let publishedNotes = JSON.parse(file);

			// filter notes by profile hexkey usiing this.filterHex

			let selectedProfileKey = "default";

			let filteredNotes = publishedNotes.filter(
				(note: { pubkey: string }) => {
					console.log(this.filterHex);
					return note.pubkey === this.filterHex;
				}
			);

			if (filteredNotes) {
				container.createEl("p", {
					text: `Total: ${publishedNotes.length} ✅`,
				});

				
				if (this.plugin.settings.profiles.length > 0 &&this.plugin.settings.multipleProfilesEnabled) {
					const rowContainer = container.createEl("div", {
						cls: "row-container",
					});

					rowContainer.createEl("label", {
						text: "Select Profile",
						cls: "setting-label",
					});

					const dropdown = rowContainer.createEl("select", {
						cls: "dropdown",
					});

					dropdown.createEl("option", {
						value: "default",
						text: "Default",
					});

					for (const { profileNickname } of this.plugin.settings.profiles) {
						const option = dropdown.createEl("option", {
							value: profileNickname,
							text: profileNickname,
						});

						if (profileNickname === selectedProfileKey) {
							option.selected = true; // Set selected option
						  }
					}

					dropdown.addEventListener("change", (event) => {
						const selectedProfileKey = (event.target as HTMLSelectElement)?.value;
						new Notice(`${selectedProfileKey} selected`);
						let newFilter = setFilter(
							selectedProfileKey,
							this.plugin.settings.profiles
						);
						if (newFilter) {
							this.filterHex = newFilter;
						}
						this.refreshDisplay();
					});
				}

				filteredNotes
					.reverse()
					.forEach(
						(note: {
							tags: any[];
							created_at: number;
							id: string;
							filepath: string;
						}) => {
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
								  ).toLocaleString("en-US", {
										year: "numeric",
										month: "long",
										day: "numeric",
										weekday: "long",
										hour: "2-digit",
										minute: "2-digit",
								  })
								: "No Published Date";

							const cardDiv = container.createEl("div", {
								cls: "published-card",
							});
							cardDiv.createEl("span", { text: `📜 ${title}` });
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
							};
							let nevent = nip19.neventEncode(target);

							new ButtonComponent(detailsDiv)
								.setIcon("popup-open")
								.setCta()
								.setTooltip("View Online")
								.onClick(() => {
									const url = `https://njump.me/${nevent}`;
									window.open(url, "_blank");
								});

							new ButtonComponent(detailsDiv)
								.setIcon("go-to-file")
								.setCta()
								.setTooltip("Go to file in Obsidian")
								.onClick(() => {
									if (note.filepath == null) {
										const openFile =
											this.app.workspace.getActiveFile();
										console.log(openFile?.path);
										new Notice("File path not available");
									} else {
										this.focusFile(note.filepath);
									}
								});
						}
					);
			} else {
				const noPostsDiv = container.createEl("div", {
					cls: "published-card",
				});
				noPostsDiv.createEl("h6", { text: "No Posts 📝" });
			}
		} catch (err) {
			console.error("Error reading published.json:", err);
			const noPostsDiv = container.createEl("div", { cls: "no-posts" });
			noPostsDiv.createEl("h6", { text: "No Posts 📝" });
		}
	}

	focusFile = (path: string, shouldSplit = false): void => {
		const targetFile = this.app.vault.getAbstractFileByPath(path);
		if (targetFile && targetFile instanceof TFile) {
			let leaf = this.app.workspace.getLeaf();
			const createLeaf = shouldSplit || leaf?.getViewState().pinned;
			if (createLeaf) {
				leaf = this.app.workspace.getLeaf("tab");
			}
			leaf?.openFile(targetFile);
		} else {
			new Notice("Cannot find a file with that name");
		}
	};
}

function setFilter(selectedProfileKey: string, profiles: any[]) : string | undefined {
	console.log(selectedProfileKey);
	let currentFilterPubKeyHex 
	// get the pub key hex for the selected profile
	for (const {
		profileNickname: nickname,
		profilePrivateKey: key,
	} of profiles) {
		if (selectedProfileKey === nickname) {
			let pk = nip19.decode(key);
			let pub = getPublicKey(pk.data as string);
			currentFilterPubKeyHex = pub;
			console.log("filter hex" + pub);
		}
	}
	return currentFilterPubKeyHex;
}
