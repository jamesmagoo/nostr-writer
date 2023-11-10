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
import NostrService from "./nostr/NostrService";

export default class ConfirmPublishModal extends Modal {
	constructor(
		app: App,
		private nostrService: NostrService,
		private file: TFile
	) {
		super(app);
	}

	async onOpen() {
		let { contentEl } = this;
		let noteTitle = this.file.basename;
		let noteWordCount = (await this.app.vault.read(this.file)).split(
			" "
		).length;

		let noteCategoryTags: string[] = [];
		let content = await this.app.vault.read(this.file);

		const regex = /#\w+/g;
		const matches = content.match(regex) || [];
		const hashtags = matches.map((match: string) => match.slice(1));

		for (const tag of hashtags) {
			noteCategoryTags.push(tag);
		}

		contentEl.createEl("h2", { text: `Publish` });
		const titleContainer = contentEl.createEl("div");
		titleContainer.addClass("publish-title-container");

		titleContainer.createEl("p", { text: `${noteWordCount} words` });

		contentEl.createEl("h6", { text: `Title` });
		let titleText = new TextComponent(contentEl)
			.setPlaceholder(`${noteTitle}`)
			.setValue(`${noteTitle}`);

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

		contentEl.createEl("h6", { text: `Summary & Image Link (optional)` });
		let summaryText = new TextAreaComponent(contentEl)
			.setPlaceholder("Enter a brief summary here...(optional)")
			.setValue("");

		let imageUrlText = new TextAreaComponent(contentEl)
			.setPlaceholder(
				"Enter an image URL here to accompany your article...(optional)"
			)
			.setValue("");

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

		imageUrlText.inputEl.setCssStyles({
			width: "100%",
			marginBottom: "10px",
			marginTop: "10px",
		});

		let imagePreview = contentEl.createEl("img");
		imagePreview.setCssStyles({
			maxWidth: "100%",
			display: "none",
		});
		imagePreview.src = "";

		// Update Image Preview on URL change
		imageUrlText.inputEl.addEventListener("input", () => {
			let url = imageUrlText.getValue();
			if (url) {
				if (!isValidURL(url)) {
					new Notice(`Invalid image URL. Please enter a valid URL.`);
					publishButton.setDisabled(true);
					publishButton.setButtonText("Invalid image url");
					return;
				} else {
					imagePreview.src = url;
					imagePreview.style.display = "block";
				}
			} else {
				imagePreview.style.display = "none";
			}
			publishButton.setButtonText("Confirm and Publish");
			publishButton.setDisabled(false);
		});

		let x = new Setting(contentEl)
			.setName("Publish as a draft")
			.setDesc("Nostr clients allow you to edit your drafts later.")
			.addToggle((toggle) =>
				toggle.setValue(false).onChange(async (value) => {
					console.log("Toggled", value);
				})
			);


		let info = contentEl.createEl("p", {
			text: `Are you sure you want to publish this note to Nostr?`,
		});
		info.addClass("publish-modal-info");

		let publishButton = new ButtonComponent(contentEl)
			.setButtonText("Confirm and Publish")
			.setCta()
			.onClick(async () => {
				// Disable the button and change the text to show a loading state
				publishButton.setButtonText("Publishing...").setDisabled(true);

				setTimeout(async () => {
					try {
						const fileContent = await this.app.vault.read(
							this.file
						);
						const title = titleText.getValue();
						const summary = summaryText.getValue();
						const imageUrl = imageUrlText.getValue();
						let res = await this.nostrService.publishNote(
							fileContent,
							this.file,
							summary,
							imageUrl,
							title,
							noteCategoryTags
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
