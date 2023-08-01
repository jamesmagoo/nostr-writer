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

export default class ShortFormModal extends Modal {
	constructor(
		app: App,
		private nostrService: NostrService	) {
		super(app);
	}

	async onOpen() {
		let { contentEl } = this;
        contentEl.createEl("h2", { text: `Write A Short Note` });
        // let noteInfo = contentEl.createEl("p");
        // noteInfo.setText(`Write a short note to Nostr...`);
		let summaryText = new TextAreaComponent(contentEl)
			.setPlaceholder("Write a Nostr message here...")
			.setValue("")

		contentEl.createEl("p", {
			text: `Are you sure you want to send this message to Nostr?`,
		});

		let publishButton = new ButtonComponent(contentEl)
			.setButtonText("Confirm and Send")
			.setCta()
			.onClick(async () => {
				// Disable the button and change the text to show a loading state
                if(summaryText.getValue().length > 1) {
				publishButton.setButtonText("Sending...").setDisabled(true);
				setTimeout(async () => {
					// After 3 seconds, execute the publishing action
					const summary = summaryText.getValue();
					const success = await this.nostrService.publishShortFormNote(summary);
					if (success) {
						new Notice(`Successfully sent note to Nostr.`);
					} else {
						new Notice(`Failed to send note to Nostr.`);
					}

					// Change the button text back and enable it
					publishButton
						.setButtonText("Confirm and Publish")
						.setDisabled(false);

					this.close();
				}, 3000);
            } else {
                new Notice(`Please enter text to publish to Nostr`);
            }

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
