import { Editor, Notice, Plugin, setIcon } from "obsidian";
import { NostrModal } from "./src/NostrModal";
import NostrService from "./src/nostr/NostrService";
import ConfirmPublishModal from "./src/ConfirmPublishModal";
import {
	NostrWriterSettingTab,
	NostrWriterPluginSettings,
} from "./src/settings";
import ShortFormModal from "src/ShortFormModal";

export default class NostrWriterPlugin extends Plugin {
	nostrService: NostrService;
	settings: NostrWriterPluginSettings;
	private ribbonIconElShortForm: HTMLElement | null;

	async onload() {
		await this.loadSettings();
		this.startupNostrService();
		this.addSettingTab(new NostrWriterSettingTab(this.app, this));
		this.updateRibbonIcon();

		const ribbonIconEl = this.addRibbonIcon(
			"file-up",
			"Publish This Note To Nostr",
			async (evt: MouseEvent) => {
				await this.checkAndPublish();
			}
		);

		this.addCommand({
			id: "publish-note-to-nostr",
			name: "Publish Note to Nostr",
			callback: async() => {
				await this.checkAndPublish();
			},
		});

		this.addCommand({
			id: "get-pub",
			name: "See Your Public Key",
			callback: async () => {
				let pubKey = this.nostrService.getPublicKey();
				new Notice(`Public Key: ${pubKey}`);
			},
		});

		this.addCommand({
			id: "get-pub-clipboard",
			name: "Copy Public Key to Clipboard",
			callback: async () => {
			  let pubKey = this.nostrService.getPublicKey();
			  navigator.clipboard.writeText(pubKey).then(() => {
				new Notice(`Public Key copied to clipboard: ${pubKey}`);
			  }).catch(err => {
				new Notice(`Failed to copy Public Key: ${err}`);
			  });
			},
		  });
		  
	}

	onunload() {}

	startupNostrService() {
		this.nostrService = new NostrService(
			this,
			this.app,
			"wss://relay.damus.io/",
			this.settings
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			{ privateKey: "", shortFormEnabled: false },
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	isEmptyContent(content: string): boolean {
		return content.trim() === "";
	}

	async checkAndPublish() {
		if (!this.settings.privateKey) {
		  new Notice(`Please set your private key in the Nostr Writer Plugin settings before publishing.`);
		  return;
		}
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
		  const fileContent: string = await this.app.vault.read(activeFile);
		  if (this.isEmptyContent(fileContent)) {
			new Notice("The note is empty and cannot be published.");
			return;
		  }
		  new ConfirmPublishModal(
			this.app,
			this.nostrService,
			activeFile
		  ).open();
		}
	  }

	updateRibbonIcon() {
		if (this.settings.shortFormEnabled) {
			if (!this.ribbonIconElShortForm) {
				// This creates an icon in the left ribbon.
				this.ribbonIconElShortForm = this.addRibbonIcon(
					"pencil",
					"Write To Nostr (Short Form)",
					(evt: MouseEvent) => {
						if (!this.settings.privateKey) {
							new Notice(
								`Please set your private key in the Nostr Writer Plugin settings before publishing.`
							);
							return;
						}
						const activeFile = this.app.workspace.getActiveFile();
						if (activeFile) {
							new ShortFormModal(
								this.app,
								this.nostrService
							).open();
						}
					}
				);
			}
		} else if (this.ribbonIconElShortForm) {
			this.ribbonIconElShortForm.remove();
			this.ribbonIconElShortForm = null;
		}
	}
}
