import "dotenv/config";
import { Editor, MarkdownView, Notice, Plugin, setIcon } from "obsidian";
import { NostrModal } from "./src/NostrModal";
import NostrService from "./src/nostr/NostrService";
import { NostrWriterSettingTab, loadSettings } from "./src/settings";

export default class NostrWriterPlugin extends Plugin {
	nostrService: NostrService;

	async onload() {
		this.nostrService = new NostrService("wss://relay.damus.io/");
		await loadSettings(this);
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new NostrWriterSettingTab(this.app, this));

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"pencil",
			"Publish To Nostr",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice("Hello Youuuuu!");
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text ");
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

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("clickxxx", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {}
}
