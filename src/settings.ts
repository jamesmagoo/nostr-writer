import NostrWriterPlugin from "../main";
import {
	App,
	PluginSettingTab,
	Setting,
	Plugin,
	Notice,
	TextAreaComponent,
} from "obsidian";

export interface NostrWriterPluginSettings {
	privateKey: string;
}

export class NostrWriterSettingTab extends PluginSettingTab {
	plugin: NostrWriterPlugin;

	constructor(app: App, plugin: NostrWriterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		let { containerEl } = this;

		containerEl.empty();

		let privateKeyField: HTMLInputElement;
		let privateKeyInput: any;

		new Setting(containerEl)
			.setName("Nostr Private key")
			.setDesc("It's a secret")
			.addText((text) => {
				privateKeyInput = text;
				text.setPlaceholder("nsec...")
					.setValue(this.plugin.settings.privateKey)
					.onChange(async (value) => {
						if (isValidPrivateKey(value)) {
							this.plugin.settings.privateKey = value;
							await this.plugin.saveSettings();
							this.plugin.startupNostrService(); // Refresh or restart the service
							new Notice("Private key saved!");
						} else {
							// Invalid private key
							new Notice("Invalid private key", 5000);
						}
					});

				// Store the reference to the input field and change its type to 'password'
				privateKeyField = text.inputEl;
				privateKeyField.type = "password";
				privateKeyField.style.width = "400px"; // Change the width here
			})
			.addButton((button) =>
				button.setButtonText("Copy").onClick(() => {
					if (privateKeyField) {
						navigator.clipboard.writeText(privateKeyField.value);
					}
				})
			)
			.addButton((button) =>
				button
					.setButtonText("Delete")
					.setCta()
					.setTooltip("Delete the private key from memory")
					.onClick(async () => {
						this.plugin.settings.privateKey = "";
						await this.plugin.saveSettings();
						new Notice("Private key deleted!");
						privateKeyInput.setValue(""); // Clear the textarea
						this.plugin.startupNostrService();
					})
			);

		new Setting(containerEl)
			.setName("Show private key")
			.setDesc("Toggle to show/hide the private key")
			.addToggle((toggle) =>
				toggle.setValue(false).onChange((value) => {
					if (privateKeyField) {
						// Set the type of the input field based on the value of the checkbox
						privateKeyField.type = value ? "text" : "password";
					}
				})
			);

		new Setting(this.containerEl)
			.setName("Sponsor")
			.setDesc(
				"Has this plugin enhanced your workflow? Say thanks as a one-time payment and buy me a coffee"
			)
			.addButton((bt) => {
				bt.buttonEl.outerHTML = `<a href="https://www.buymeacoffee.com/jamesmagoo" target="_blank"><img style="height: 35px;" src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>`;
			});
	}
}

function isValidPrivateKey(key: string): boolean {
	return (
		typeof key === "string" && key.length === 63 && key.startsWith("nsec")
	);
}
