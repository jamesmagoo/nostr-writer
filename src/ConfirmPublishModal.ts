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
		// TODO REVAMP THIS
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
						let res = await this.nostrService.publishNote(
							fileContent,
							this.file,
							summary,
							imageUrl
						);
						if (res.success) {
							setTimeout(()=>{new Notice(`Successfully sent note to Nostr.`)},500)
							for(let relay of res.publishedRelays){
								setTimeout(()=>{new Notice(`✅ - Sent to ${relay}`)},500)
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
