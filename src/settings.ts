import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import NostrWriterPlugin from "../main";

export interface NostrWriterPluginSettings {
	privateKey: string;
	shortFormEnabled: boolean;
	statusBarEnabled: boolean;
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
							navigator.clipboard.writeText(
								privateKeyField.value
							);
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

		new Setting(containerEl)
			.setName("Show status bar")
			.setDesc("Show/hide Nostr connection status.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.statusBarEnabled)
					.onChange(async (value) => {
						this.plugin.settings.statusBarEnabled = value;
						await this.plugin.saveSettings();
						this.plugin.updateStatusBar();
						new Notice(
							`Nostr status bar ${value ? "enabled" : "disabled"}`
						);
						new Notice(
							`Reopen the vault for updates to take effect.`
						);
					})
			);

		containerEl.createEl("h5", { text: "Sponsor" });
		new Setting(this.containerEl)
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

		new Setting(this.containerEl)
			.setDesc("⚡️⚡️⚡️ IYKYK ⚡️⚡️⚡️")
			.addButton((bt) => {
				bt.setTooltip("Copy lightning address")
					.setIcon("zap")
					.onClick(() => {
						if (privateKeyField) {
							navigator.clipboard.writeText(
								"lnbc200u1pjvu03dpp5x20p0q5tdwylg5hsqw3av6qxufah0y64efldazmgad2rsffgda8qdpdfehhxarjypthy6t5v4ezqnmzwd5kg6tpdcs9qmr4va5kucqzzsxqyz5vqsp5w55p4tzawyfz5fasflmsvdfnnappd6hqnw9p7y2p0nl974f0mtkq9qyyssqq6gvpnvvuftqsdqyxzn9wrre3qfkpefzz6kqwssa3pz8l9mzczyq4u7qdc09jpatw9ekln9gh47vxrvx6zg6vlsqw7pq4a7kvj4ku4qpdrflwj"
							);
							new Notice("Invoice Address Copied!");
							setTimeout(()=>{new Notice("Thank You 🤝");},500);
							setTimeout(()=>{new Notice("Stay Humble ⚖️");},1000);
							setTimeout(()=>{new Notice("Stack Sats ⚡️");},1500);
						}
					});
			});
	}
}

function isValidPrivateKey(key: string): boolean {
	return (
		typeof key === "string" && key.length === 63 && key.startsWith("nsec")
	);
}

async function clearLocalPublishedFile() {
	const pathToPlugin = this.app.vault.configDir + "/plugins/nostr-writer";
	const publishedFilePath = `${pathToPlugin}/published.json`;
	try {
		await this.app.vault.adapter.remove(publishedFilePath);
	} catch (error) {
		console.log(error);
	}
}
