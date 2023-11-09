import {
	App,
	Notice,
	PluginSettingTab,
	Setting,
	TextComponent,
} from "obsidian";
import NostrWriterPlugin from "../main";

export interface NostrWriterPluginSettings {
	privateKey: string;
	shortFormEnabled: boolean;
	statusBarEnabled: boolean;
	relayConfigEnabled: boolean;
	relayURLs: string[];
	multipleProfilesEnabled: boolean;
	profiles: Object[];
}

export class NostrWriterSettingTab extends PluginSettingTab {
	plugin: NostrWriterPlugin;
	private refreshDisplay: () => void;
	private relayUrlInput: TextComponent;
	private newAccountNsecInput : TextComponent;
	private newAccountNicknameInput : TextComponent;

	constructor(app: App, plugin: NostrWriterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.refreshDisplay = () => this.display();
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
				privateKeyField.style.width = "400px";
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
							new Notice("Private Key Copied - Be Careful 🔐");
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
							privateKeyInput.setValue("");
							this.plugin.startupNostrService();
							new Notice("Private key deleted!🗑");
						}
					})
			);

		new Setting(containerEl)
			.setName("Add multiple Nostr profiles")
			.setDesc("Add multiple nsecs and publish under a different Nostr profile.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.multipleProfilesEnabled)
					.onChange(async (value) => {
						this.plugin.settings.multipleProfilesEnabled = value;
						await this.plugin.saveSettings();
						this.refreshDisplay();
					})
			)


		if (this.plugin.settings.multipleProfilesEnabled) {


			let newProfilePrivateKeyField: string;
			let newProfileNicknameField: string;

			containerEl.createEl("h5", { text: "Nostr Profiles" });
			new Setting(this.containerEl)
				.setDesc("Add a new Nostr profile to publish from.")
				.setName("Add Profile")
				.addText((newAccountNicknameInput) => {
					newAccountNicknameInput.setPlaceholder("Profile Nickname");
					newAccountNicknameInput.onChange((value) => {
						newProfileNicknameField = value;
					});
				})
				.addText((newAccountNsecInput) => {
					newAccountNsecInput.setPlaceholder("nsec");
					newAccountNsecInput.onChange(async (value) => {
						if (isValidPrivateKey(value)) {
							console.log("legist pk")
							newProfilePrivateKeyField = value;
							new Notice("Private key OK!");
						} else {
							// Invalid private key
							new Notice("Invalid private key", 5000);
						}
					});
					// Store the reference to the input field and change its type to 'password'
					// newProfilePrivateKeyField.type = "password";
					// newProfilePrivateKeyField.style.width = "200px";
				})
				.addButton((btn) => {
					btn.setIcon("plus");
					btn.setCta();
					btn.setTooltip("Add this profile");
					btn.onClick(async () => {
						if(newProfilePrivateKeyField && newProfileNicknameField ) {
							new Notice("Yuppp");
							this.plugin.settings.profiles.push({
								profileNickname: newProfilePrivateKeyField,
								profilePrivateKey: newProfileNicknameField,
							});
							await this.plugin.saveSettings();


						} else {
							new Notice("Add a profile nickname & a valid nsec");
						}
						console.log("nickname" + newProfileNicknameField)
						console.log("sec" + newProfilePrivateKeyField)

						try {
							//let addedProfileNickname= this.newAccountNicknameInput.getValue();
							// if (this.isValidProfile(addedRelayUrl)) {
							// 	this.plugin.settings.relayURLs.push(
							// 		addedRelayUrl
							// 	);
							// 	await this.plugin.saveSettings();
							// 	new Notice(
							// 		`Added ${addedProfileNickname} to profiles.`
							// 	);
							// 	new Notice(
							// 		`Use the dropdown before publsihing to select.`
							// 	);
							// 	this.refreshDisplay();
							// 	this.newAccountNicknameInput.setValue("")
							// 	this.newAccountNsecInput.setValue("")
							// } else {
							// 	new Notice("Invalid URL added");
							// }
						} catch {
							new Notice("No URL added");
						}
					});
				});
			for (const [i, url] of this.plugin.settings.relayURLs.entries()) {
				new Setting(this.containerEl)
					.setDesc(
						`${url} is ${
							this.plugin.nostrService.getRelayInfo(url)
								? "connected"
								: "disconnected"
						}`
					)
					.setName(
						`Relay ${i + 1} - ${
							this.plugin.nostrService.getRelayInfo(url)
								? "🟢"
								: "💀"
						}`
					)
					.addButton((btn) => {
						btn.setIcon("trash");
						btn.setTooltip("Remove this profile");
						btn.onClick(async () => {
							if (
								confirm(
									"Are you sure you want to delete this profile? This cannot be undone."
								)
							) {
								// TODO delete profile here.. remove from map..
								this.plugin.settings.relayURLs.splice(i, 1);
								await this.plugin.saveSettings();
								this.refreshDisplay();
								new Notice("Profile successfully deleted.");
								
							}
						});
					});
			}
			containerEl.createEl("br");
			containerEl.createEl("br");
			containerEl.createEl("br");
			containerEl.createEl("br");
		}

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

		// new Setting(containerEl)
		// 	.setName("Show status bar")
		// 	.setDesc("Show/hide Nostr connection status.")
		// 	.addToggle((toggle) =>
		// 		toggle
		// 			.setValue(this.plugin.settings.statusBarEnabled)
		// 			.onChange(async (value) => {
		// 				this.plugin.settings.statusBarEnabled = value;
		// 				await this.plugin.saveSettings();
		// 				this.plugin.updateStatusBar();
		// 				new Notice(
		// 					`Nostr status bar ${value ? "enabled" : "disabled"}`
		// 				);
		// 				new Notice(
		// 					`Reopen the vault for updates to take effect.`
		// 				);
		// 			})
		// 	);

		new Setting(containerEl)
			.setName("Configure relays")
			.setDesc("Edit the default configuration & see details.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.relayConfigEnabled)
					.onChange(async (value) => {
						this.plugin.settings.relayConfigEnabled = value;
						await this.plugin.saveSettings();
						this.refreshDisplay();
					})
			);

		new Setting(containerEl)
			.setName("Reconnect to relays ")
			.setDesc(
				"Refresh connection to relays - check status bar for details."
			)
			.addButton((btn) => {
				btn.setIcon("reset");
				btn.setCta();
				btn.setTooltip("Re-connect");
				btn.onClick(async () => {
					new Notice(`Re-connecting to Nostr...`);
					this.refreshDisplay();
					await this.plugin.nostrService.connectToRelays();
				});
			});

		if (this.plugin.settings.relayConfigEnabled) {
			containerEl.createEl("h5", { text: "Relay Configuration" });
			new Setting(this.containerEl)
				.setDesc("Add a relay URL to settings")
				.setName("Add Relay")
				.addText((relayUrlInput) => {
					relayUrlInput.setPlaceholder("wss://fav.relay.com");
					relayUrlInput.onChange(() => {
						this.relayUrlInput = relayUrlInput;
					});
				})
				.addButton((btn) => {
					btn.setIcon("plus");
					btn.setCta();
					btn.setTooltip("Add this relay");
					btn.onClick(async () => {
						try {
							let addedRelayUrl = this.relayUrlInput.getValue();
							if (this.isValidUrl(addedRelayUrl)) {
								this.plugin.settings.relayURLs.push(
									addedRelayUrl
								);
								await this.plugin.saveSettings();
								new Notice(
									`Added ${addedRelayUrl} to relay configuration.`
								);
								new Notice(`Re-connecting to Nostr...`);
								this.refreshDisplay();
								await this.plugin.nostrService.connectToRelays();
								this.relayUrlInput.setValue("");
							} else {
								new Notice("Invalid URL added");
							}
						} catch {
							new Notice("No URL added");
						}
					});
				});
			for (const [i, url] of this.plugin.settings.relayURLs.entries()) {
				new Setting(this.containerEl)
					.setDesc(
						`${url} is ${
							this.plugin.nostrService.getRelayInfo(url)
								? "connected"
								: "disconnected"
						}`
					)
					.setName(
						`Relay ${i + 1} - ${
							this.plugin.nostrService.getRelayInfo(url)
								? "🟢"
								: "💀"
						}`
					)
					.addButton((btn) => {
						btn.setIcon("trash");
						btn.setTooltip("Remove this relay");
						btn.onClick(async () => {
							if (
								confirm(
									"Are you sure you want to delete this relay? This cannot be undone."
								)
							) {
								this.plugin.settings.relayURLs.splice(i, 1);
								await this.plugin.saveSettings();
								this.refreshDisplay();
								new Notice("Relay successfully deleted.");
								new Notice(`Re-connecting to Nostr...`);
								this.plugin.nostrService.connectToRelays();
							}
						});
					});
			}
		}

		containerEl.createEl("h5", { text: "Sponsor" });
		new Setting(this.containerEl)
			.setDesc(
				"Has this plugin enhanced your workflow? Say thanks as a one-time payment and buy me a coffee."
			)
			.addButton((bt) => {
				bt.setTooltip("Copy lightning address")
					.setIcon("zap")
					.setCta()
					.onClick(() => {
						if (privateKeyField) {
							navigator.clipboard.writeText(
								"lnbc200u1pjvu03dpp5x20p0q5tdwylg5hsqw3av6qxufah0y64efldazmgad2rsffgda8qdpdfehhxarjypthy6t5v4ezqnmzwd5kg6tpdcs9qmr4va5kucqzzsxqyz5vqsp5w55p4tzawyfz5fasflmsvdfnnappd6hqnw9p7y2p0nl974f0mtkq9qyyssqq6gvpnvvuftqsdqyxzn9wrre3qfkpefzz6kqwssa3pz8l9mzczyq4u7qdc09jpatw9ekln9gh47vxrvx6zg6vlsqw7pq4a7kvj4ku4qpdrflwj"
							);
							new Notice("Lightning Invoice Address Copied!⚡️");
							setTimeout(() => {
								new Notice("Thank You 🤝");
							}, 500);
							setTimeout(() => {
								new Notice("Stay Humble ⚖️");
							}, 1000);
							setTimeout(() => {
								new Notice("Stack Sats ⚡️");
							}, 1500);
						}
					});
			})
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

	isValidUrl(url: string) {
		try {
			new URL(url);
			return true;
		} catch (error) {
			console.log(error);
			return false;
		}
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
