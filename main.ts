import { Editor, MarkdownView, Notice, Plugin, setIcon } from "obsidian";
import { NostrModal } from "./src/NostrModal";
import NostrService from "./src/nostr/NostrService";
import { NostrWriterSettingTab, NostrWriterPluginSettings } from "./src/settings";

export default class NostrWriterPlugin extends Plugin {
	nostrService: NostrService;
	settings: NostrWriterPluginSettings;


	async onload() {
		await this.loadSettings();
		this.nostrService = new NostrService("wss://relay.damus.io/", this.settings);
		this.addSettingTab(new NostrWriterSettingTab(this.app, this));

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"pencil",
			"Publish To Nostr",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				// TODO modal here?
				new Notice("Hello Youuuu!");
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text TODO ");
		const item = this.addStatusBarItem();
		setIcon(item, "info");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-nostr-modal",
			name: "Nostr Modal",
			callback: () => {
				new NostrModal(this.app, (result) => {
					new Notice(`Hello, ${result}!`);
				}).open();
			},
		});

		this.addCommand({
			id: "publish-note-to-nostr",
			name: "Publish note to Nostr",
			callback: async () => {
				// Assuming you want to publish the current active file
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const fileContent = await this.app.vault.read(activeFile);
					const success = await this.nostrService.publishNote(
						fileContent,
						activeFile
					);
					if (success) {
						new Notice(`Successfully published note to Nostr.`);
					} else {
						new Notice(`Failed to publish note to Nostr.`);
					}
				}
			},
		});

		this.addCommand({
			id: "get-pub",
			name: "Public Key",
			callback: async () => {
				let pubKey = this.nostrService.getPublicKey();
				new Notice(`Public Key: ${pubKey}`);
			},
		});
	}


	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, 
		  { privateKey: "" },
		  await this.loadData()
		);
	  }
	
	  async saveSettings() {
		await this.saveData(this.settings);
	  }
}
