import {
	ButtonComponent,
	Modal,
	Notice,
	TFile,
	App,
	TextAreaComponent,
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
		contentEl.createEl("h2", { text: `Publish: ${noteTitle}` });
		let noteInfo = contentEl.createEl("p");
		noteInfo.setText(`Title: ${noteTitle}, Words: ${noteWordCount}`);

		let summaryText = new TextAreaComponent(contentEl)
			.setPlaceholder("Enter a brief summary here...(optional)")
			.setValue("");

		let imageUrlText = new TextAreaComponent(contentEl)
			.setPlaceholder(
				"Enter an image URL here to accompany your article...(optional)"
			)
			.setValue("");

		imageUrlText.inputEl.style.width = "100%";
		imageUrlText.inputEl.style.marginBottom = "10px";
		imageUrlText.inputEl.style.marginTop = "10px";

		// Image Preview Section
		let imagePreview = contentEl.createEl("img");
		imagePreview.src = ""; // Set initial src
		imagePreview.style.maxWidth = "100%";
		imagePreview.style.display = "none"; // Hide initially

		// Update Image Preview on URL change
		imageUrlText.inputEl.addEventListener("input", () => {
			let url = imageUrlText.getValue();
			const imageUrl = imageUrlText.getValue();

			if (!isValidURL(imageUrl)) {
				new Notice(`Invalid image URL. Please enter a valid URL.`);
				return;
			}
			if (url) {
				imagePreview.src = url;
				imagePreview.style.display = "block"; // Show preview
			} else {
				imagePreview.style.display = "none"; // Hide preview
			}
		});

		contentEl.createEl("p", {
			text: `Are you sure you want to publish this note to Nostr?`,
		});

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
						const summary = summaryText.getValue();
						const imageUrl = imageUrlText.getValue();
						await this.nostrService.publishNote(
							fileContent,
							this.file,
							summary,
							imageUrl
						);
						// await will pause execution until the Promise resolves or rejects
						new Notice(`Successfully published note to Nostr.`);
					} catch (error) {
						new Notice(`Failed to publish note to Nostr.`);
					}
					publishButton
						.setButtonText("Confirm and Publish")
						.setDisabled(false);

					this.close();
				}, 3000);
			});

		contentEl.style.fontFamily = "Arial, sans-serif";
		contentEl.style.padding = "15px";
		publishButton.buttonEl.style.display = "block";
		publishButton.buttonEl.style.margin = "auto";
		summaryText.inputEl.style.width = "100%";
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
