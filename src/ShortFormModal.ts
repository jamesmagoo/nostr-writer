import {
	App,
	ButtonComponent,
	Modal,
	Notice,
	TextAreaComponent,
} from "obsidian";
import NostrService from "./nostr/NostrService";

export default class ShortFormModal extends Modal {
	constructor(app: App, private nostrService: NostrService) {
		super(app);
	}

	async onOpen() {
		let { contentEl } = this;
		contentEl.createEl("h2", { text: `Write A Short Note` });
		let summaryText = new TextAreaComponent(contentEl)
			.setPlaceholder("Write a Nostr message here...")
			.setValue("");

		contentEl.createEl("p", {
			text: `Are you sure you want to send this message to Nostr?`,
		});
	
		summaryText.inputEl.setCssStyles({
			width: "100%",
			height: "300px",
			marginBottom: "10px",
			marginTop: "10px",
		});

		let publishButton = new ButtonComponent(contentEl)
			.setButtonText("Confirm and Send")
			.setCta()
			.onClick(async () => {
				// Disable the button and change the text to show a loading state
				if (summaryText.getValue().length > 1) {
					publishButton.setButtonText("Sending...").setDisabled(true);
					setTimeout(async () => {
						const summary = summaryText.getValue();
						try {
							let res =
								await this.nostrService.publishShortFormNote(summary);
							if (res.success) {
								setTimeout(()=>{new Notice(`Successfully sent note to Nostr.`)},500)
								for(let relay of res.publishedRelays){
									setTimeout(()=>{new Notice(`✅ - Sent to ${relay}`)},500)
								}
							} else {
								new Notice(`❌ Failed to send note to Nostr.`);
							}	
						} catch {
							new Notice(`❌ Failed to send note to Nostr.`);
						}
						summaryText.setValue("");
						publishButton
							.setButtonText("Confirm and Publish")
							.setDisabled(false);

						this.close();
					}, 3000);
				} else {
					new Notice(`Please enter text to publish to Nostr`);
				}
			});

		contentEl.classList.add("short-form-modal-content");
		publishButton.buttonEl.classList.add("short-form-modal-button");
		summaryText.inputEl.classList.add("short-form-modal-input");
	}
}
