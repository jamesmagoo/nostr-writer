import {
	ButtonComponent,
	Modal,
	Notice,
	TFile,
	App,
	TextComponent,
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
			.setValue("")

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
					// After 3 seconds, execute the publishing action
					const fileContent = await this.app.vault.read(this.file);
					const summary = summaryText.getValue();
					const success = await this.nostrService.publishNote(
						fileContent,
						this.file,
						summary // assume your publishNote method takes a third parameter as summary
					);
					if (success) {
						new Notice(`Successfully published note to Nostr.`);
					} else {
						new Notice(`Failed to publish note to Nostr.`);
					}

					// Change the button text back and enable it
					publishButton
						.setButtonText("Confirm and Publish")
						.setDisabled(false);

					this.close();
				}, 3000);
			});

		// Add some style
		contentEl.style.fontFamily = "Arial, sans-serif";
		contentEl.style.padding = "15px";
		// publishButton.buttonEl.style.background = "#268bd2";
		// publishButton.buttonEl.style.color = "white";
		publishButton.buttonEl.style.padding = "10px";
		publishButton.buttonEl.style.display = "block";
		publishButton.buttonEl.style.margin = "auto";
		summaryText.inputEl.style.width = "100%";
	}
}
