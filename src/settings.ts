import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import NostrWriterPlugin from "../main";

export interface NostrWriterPluginSettings {
	privateKey: string;
	shortFormEnabled: boolean;
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
			.setName("Nostr private key")
			.setDesc("It's a secret!")
			.addText((text) => {
				privateKeyInput = text;
				text.setPlaceholder("nsec...")
					.setValue(this.plugin.settings.privateKey)
					.onChange(async (value) => {
						if (isValidPrivateKey(value)) {
							this.plugin.settings.privateKey = value;
							await this.plugin.saveSettings();
							this.plugin.startupNostrService(); 
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
				button
				.setTooltip("Copy private key")
				.setIcon("copy")
				.onClick(() => {
					if (privateKeyField) {
						navigator.clipboard.writeText(privateKeyField.value);
					}
				})
			)
			.addButton((button) =>
				button
					.setButtonText("Delete")
					.setWarning()
					.setTooltip("Delete the private key from memory")
					.onClick(async () => {
						if (
							confirm(
								"Are you sure you want to delete your private key? This cannot be undone."
							)
						) {
							this.plugin.settings.privateKey = "";
							await this.plugin.saveSettings();
							new Notice("Private key deleted!");
							privateKeyInput.setValue(""); // Clear the textarea
							this.plugin.startupNostrService();
						}
					})
			);

		new Setting(containerEl)
			.setName("Show private key")
			.setDesc("Toggle to show/hide the private key.")
			.addToggle((toggle) =>
				toggle.setValue(false).onChange((value) => {
					if (privateKeyField) {
						// Set the type of the input field based on the value of the checkbox
						privateKeyField.type = value ? "text" : "password";
					}
				})
			);

		new Setting(containerEl)
			.setName("Clear local published history")
			.setDesc("This does not delete your notes from the Nostr network.")
			.addButton((button) =>
				button
					.setButtonText("Clear")
					.setIcon("trash")
					.setTooltip("Delete the local published history")
					.onClick(async () => {
						if (
							confirm(
								"Are you sure you want to delete your local history? This cannot be undone."
							)
						) {
							clearLocalPublishedFile();
							new Notice("Published History deleted!");
						}
					})
			);

		new Setting(containerEl)
			.setName("Short form mode")
			.setDesc("Add short form writing button to your menu.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.shortFormEnabled)
					.onChange(async (value) => {
						this.plugin.settings.shortFormEnabled = value;
						await this.plugin.saveSettings();
						this.plugin.updateRibbonIcon();
						new Notice(
							`Short form mode ${value ? "enabled" : "disabled"}`
						);
					})
			);

		new Setting(this.containerEl)
			.setName("Sponsor")
			.setDesc(
				"Has this plugin enhanced your workflow? Say thanks as a one-time payment and buy me a coffee."
			)
			.addButton((button) => {
				button
					.setTooltip("Sponsor on GitHub")
					.setIcon("github")
					.onClick(() =>
						window.open(
							"https://github.com/sponsors/jamesmagoo",
							"_blank"
						)
					);
				button.buttonEl.style.height = "35px";
			})
			.addButton((bt) => {
				const anchor = document.createElement("a");
				anchor.href = "https://www.buymeacoffee.com/jamesmagoo";
				anchor.target = "_blank";

				const img = document.createElement("img");
				img.style.height = "35px";
				img.src =
					"https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png";
				img.alt = "Buy Me A Coffee";
				anchor.appendChild(img);
				bt.buttonEl.replaceWith(anchor);
			});
	}
}

function isValidPrivateKey(key: string): boolean {
	return (
		typeof key === "string" && key.length === 63 && key.startsWith("nsec")
	);
}

async function clearLocalPublishedFile(){
	// Clear the local published file
	const pathToPlugin = this.app.vault.configDir + "/plugins/nostr-writer";
	const publishedFilePath = `${pathToPlugin}/published.json`;
	try {
		await this.app.vault.adapter.remove(publishedFilePath);
	} catch (error) {
		console.log(error);
	}
}