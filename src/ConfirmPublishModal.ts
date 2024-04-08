import {
	ButtonComponent,
	Modal,
	Notice,
	TFile,
	App,
	Setting,
	TextAreaComponent,
	TextComponent,
} from "obsidian";
import NostrService from "./service/NostrService";
import NostrWriterPlugin from "../main";

export default class ConfirmPublishModal extends Modal {

	plugin: NostrWriterPlugin;

	constructor(
		app: App,
		private nostrService: NostrService,
		private file: TFile,
		plugin: NostrWriterPlugin
	) {
		super(app);
		this.plugin = plugin;
	}

	async onOpen() {
		let { contentEl } = this;

		const frontmatter = this.app.metadataCache.getFileCache(this.file)?.frontmatter;

		// TODO check our Progress Bar Component...

		const frontmatterRegex = /---\s*[\s\S]*?\s*---/g;
		const content = (await this.app.vault.read(this.file)).replace(frontmatterRegex, "").trim();

		const noteWordCount = content.split(" ").length;

		let noteCategoryTags: string[] = [];

		const regex = /#\w+/g;
		const matches = content.match(regex) || [];
		const hashtags = matches.map((match: string) => match.slice(1));

		const properties = {
			title: frontmatter?.title || this.file.basename,
			summary: frontmatter?.summary || "",
			image: isValidURL(frontmatter?.image) ? frontmatter?.image : "",
			tags: frontmatter?.tags || hashtags,
		}

		for (const tag of properties.tags) {
			noteCategoryTags.push(tag);
		}

		contentEl.createEl("h2", { text: `Publish` });
		const titleContainer = contentEl.createEl("div");
		titleContainer.addClass("publish-title-container");

		titleContainer.createEl("p", { text: `${noteWordCount} words` });

		contentEl.createEl("h6", { text: `Title` });
		let titleText = new TextComponent(contentEl)
			.setPlaceholder(`${properties.title}`)
			.setValue(`${properties.title}`);

		contentEl.createEl("h6", { text: `Tags` });
		const tagContainer = contentEl.createEl("div");
		tagContainer.addClass("publish-title-container");

		tagContainer.createEl("p", {
			text: `Tags (#tags) from your file are automatically added below. Add more to help people discover your work. Remove any by clicking the X. `,
		});

		let tagsText = new TextComponent(contentEl).setPlaceholder(
			`Add a tag here and press enter`
		);

		tagsText.inputEl.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				addTagAsPill(tagsText.getValue());
			}
		});

		tagsText.inputEl.setCssStyles({
			width: "100%",
			marginBottom: "10px",
		});

		const pillsContainer = contentEl.createEl("div");
		pillsContainer.addClass("pills-container");
		noteCategoryTags.forEach((tag) => {
			const pillElement = createPillElement(tag);
			pillsContainer.appendChild(pillElement);
		});

		contentEl.createEl("h6", { text: `Summary & Banner Image (optional)` });
		let summaryText = new TextAreaComponent(contentEl)
			.setPlaceholder("Enter a brief summary here...(optional)")
			.setValue(properties.summary);

		//		let imageUrlText = new TextAreaComponent(contentEl)
		//			.setPlaceholder(
		//				"Enter an image URL here to accompany your article...(optional)"
		//			)
		//			.setValue(properties.image);

		let vaultFiles = this.app.vault.getFiles();
		console.log(vaultFiles)
		const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
		let imageFiles = vaultFiles.filter(file => {
			const extension = file.extension.toLowerCase();
			return imageExtensions.includes(extension);
		});
		console.log(imageFiles)

		new Setting(contentEl)
			.setName("Select Cover Image")
			.setDesc("Select an image for your articles banner.")
			.addDropdown((dropdown) => {
				dropdown.addOption("default", "No Image");
				for (const { name } of imageFiles) {
					dropdown.addOption(name, name);
				}
				dropdown.setValue("default");
				dropdown.onChange(async (value) => {
					selectedProfileKey = value;
					new Notice(`${selectedProfileKey} selected`);
					console.log(selectedProfileKey)
				});
			});

		titleText.inputEl.setCssStyles({
			width: "100%",
			marginBottom: "10px",
		});

		summaryText.inputEl.setCssStyles({
			width: "100%",
			height: "75px",
			marginBottom: "10px",
		});

		tagsText.inputEl.setCssStyles({
			width: "100%",
		});

		tagsText.inputEl.addClass("features");

		//imageUrlText.inputEl.setCssStyles({
		//	width: "100%",
		//	marginBottom: "10px",
		//	marginTop: "10px",
		//});

		let selectedProfileKey = "default";
		if (this.plugin.settings.profiles.length > 0 && this.plugin.settings.multipleProfilesEnabled) {
			let x = new Setting(contentEl)
				.setName("Select Profile")
				.setDesc("Select a profile to send this note from.")
				.addDropdown((dropdown) => {
					dropdown.addOption("default", "Default");
					for (const { profileNickname } of this.plugin.settings.profiles) {
						dropdown.addOption(profileNickname, profileNickname);
					}
					dropdown.setValue("default");
					dropdown.onChange(async (value) => {
						selectedProfileKey = value;
						new Notice(`${selectedProfileKey} selected`);
						console.log(selectedProfileKey)
					});
				});
		}

		// TODO is this a featue I want to add? Why publish as a draft? Obsidian is the draft location.
		// let x = new Setting(contentEl)
		// 	.setName("Publish as a draft")
		// 	.setDesc("Nostr clients allow you to edit your drafts later.")
		// 	.addToggle((toggle) =>
		// 		toggle.setValue(false).onChange(async (value) => {
		// 			console.log("Toggled", value);
		// 		})
		// 	);

		contentEl.createEl("hr");

		let info = contentEl.createEl("p", {
			text: `Are you sure you want to publish this note to Nostr?`,
		});
		info.addClass("publish-modal-info");

		let publishButton = new ButtonComponent(contentEl)
			.setButtonText("Confirm and Publish")
			.setCta()
			.onClick(async () => {
				if (confirm("Are you sure you want to publish this note to Nostr?")) {
					// Disable the button and change the text to show a loading state
					publishButton.setButtonText("Publishing...").setDisabled(true);
					setTimeout(async () => {
						try {
							const fileContent = content;
							const title = titleText.getValue();
							const summary = summaryText.getValue();
							const imageUrl = imageUrlText.getValue();
							let res = await this.nostrService.publishNote(
								fileContent,
								this.file,
								summary,
								imageUrl,
								title,
								noteCategoryTags,
								selectedProfileKey
							);
							if (res.success) {
								setTimeout(() => {
									new Notice(`Successfully sent note to Nostr.`);
								}, 500);
								for (let relay of res.publishedRelays) {
									setTimeout(() => {
										new Notice(`✅ - Sent to ${relay}`);
									}, 500);
								}
							} else {
								new Notice(`❌ Failed to send note to Nostr.`);
							}
						} catch (error) {
							new Notice(`Failed to publish note to Nostr.`);
						}
						publishButton
							.setButtonText("Confirm and Publish")
							.setDisabled(false);
						this.close();
					}, 3000);
				}
			});

		contentEl.classList.add("publish-modal-content");
		publishButton.buttonEl.classList.add("publish-modal-button");
		summaryText.inputEl.classList.add("publish-modal-input");

		function createPillElement(tag: string) {
			const pillElement = document.createElement("div");
			pillElement.className = "pill";
			pillElement.textContent = tag;

			const deleteButton = document.createElement("div");
			deleteButton.className = "delete-button";
			deleteButton.textContent = "x";

			deleteButton.addEventListener("click", () => {
				noteCategoryTags = noteCategoryTags.filter((t) => t !== tag);
				pillElement.remove();
			});

			pillElement.appendChild(deleteButton);
			return pillElement;
		}

		function addTagAsPill(tag: string) {
			if (tag.trim() === "") return;
			noteCategoryTags.push(tag);
			const pillElement = createPillElement(tag);
			pillsContainer.appendChild(pillElement);
			tagsText.setValue("");
		}
	}
}

function isValidURL(url: string) {
	try {
		new URL(url);
		return true;
	} catch (_) {
		return false;
	}
}
