import { Notice, Plugin } from "obsidian";
import ShortFormModal from "src/ShortFormModal";
import ConfirmPublishModal from "./src/ConfirmPublishModal";
import NostrService from "./src/nostr/NostrService";
import {
	NostrWriterPluginSettings,
	NostrWriterSettingTab,
} from "./src/settings";
import { PublishedView, PUBLISHED_VIEW } from "./src/PublishedView";

export default class NostrWriterPlugin extends Plugin {
	nostrService: NostrService;
	settings: NostrWriterPluginSettings;
	private ribbonIconElShortForm: HTMLElement | null;
	statusBar: any;

	async onload() {
		await this.loadSettings();
		// Initialize or load your plugin here
		this.updateStatusBar();
		this.startupNostrService();
		this.addSettingTab(new NostrWriterSettingTab(this.app, this));
		this.updateRibbonIcon();
		this.registerView(
			PUBLISHED_VIEW,
			(leaf) => new PublishedView(leaf, this)
		);

		this.addRibbonIcon("scroll", "See notes published to Nostr", () => {
			this.togglePublishedView();
		});

		this.addRibbonIcon(
			"file-up",
			"Publish this note to Nostr",
			async (evt: MouseEvent) => {
				await this.checkAndPublish();
			}
		);

		this.addCommand({
			id: "publish-note-to-nostr",
			name: "Publish",
			callback: async () => {
				await this.checkAndPublish();
			},
		});

		this.addCommand({
			id: "get-pub",
			name: "See your public key",
			callback: async () => {
				let pubKey = this.nostrService.getPublicKey();
				new Notice(`Public Key: ${pubKey}`);
			},
		});

		this.addCommand({
			id: "re-connect",
			name: "Re-connect to relays",
			callback: async () => {
				let pubKey = this.nostrService.connectToRelays();
				new Notice(`Attempting re-connect, see status bar.`);
			},
		});

		this.addCommand({
			id: "get-pub-clipboard",
			name: "Copy public key to clipboard",
			callback: async () => {
				let pubKey = this.nostrService.getPublicKey();
				navigator.clipboard
					.writeText(pubKey)
					.then(() => {
						new Notice(`Public Key copied to clipboard: ${pubKey}`);
					})
					.catch((err) => {
						new Notice(`Failed to copy Public Key: ${err}`);
					});
			},
		});
	}

	togglePublishedView = async (): Promise<void> => {
		const existing = this.app.workspace.getLeavesOfType(PUBLISHED_VIEW);
		if (existing.length) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		await this.app.workspace.getRightLeaf(false).setViewState({
			type: PUBLISHED_VIEW,
			active: true,
		});

		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(PUBLISHED_VIEW)[0]
		);
	};

	onunload(): void {
		this.nostrService.shutdownRelays();
		this.app.workspace
			.getLeavesOfType(PUBLISHED_VIEW)
			.forEach((leaf) => leaf.detach());
	}

	startupNostrService() {
		this.nostrService = new NostrService(
			this,
			this.app,
			this.settings
		);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			{
				privateKey: "",
				shortFormEnabled: false,
				statusBarEnabled: true,
				relayConfigEnabled: false,
				relayURLs: [
					"wss://nos.lol ",
					"wss://relay.damus.io",
					"wss://relay.nostr.band",
					"wss://relayable.org",
					"wss://nostr.rocks",
					"wss://nostr.fmt.wiz.biz",
				],
			},
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
			new Notice(
				`Please set your private key in the Nostr Writer Plugin settings before publishing.`
			);
			return;
		}
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile) {
			const fileContent: string = await this.app.vault.read(activeFile);
			if (this.isEmptyContent(fileContent)) {
				new Notice("The note is empty and cannot be published.");
				return;
			}
			// TODO update this connection check for multiple relays
			if (this.nostrService.getConnectionStatus()) {
				new ConfirmPublishModal(
					this.app,
					this.nostrService,
					activeFile
				).open();
			} else {
				new Notice(`Please connect to Nostr before publishing.`);
			}
		} else {
			new Notice("No note is currently active. Click into a note.");
		}
	}

	updateRibbonIcon() {
		if (this.settings.shortFormEnabled) {
			if (!this.ribbonIconElShortForm) {
				this.ribbonIconElShortForm = this.addRibbonIcon(
					"pencil",
					"Write to Nostr (short form)",
					(evt: MouseEvent) => {
						if (!this.settings.privateKey) {
							new Notice(
								`Please set your private key in the Nostr Writer Plugin settings before publishing.`
							);
							return;
						}
						if (this.nostrService.getConnectionStatus()) {
							new ShortFormModal(
								this.app,
								this.nostrService
							).open();
							return; 
						} else {
							new Notice(
								`Please connect to Nostr before publishing.`
							);
						}
					}
				);
			}
		} else if (this.ribbonIconElShortForm) {
			this.ribbonIconElShortForm.remove();
			this.ribbonIconElShortForm = null;
		}
	}

	updateStatusBar() {
		if (this.settings.statusBarEnabled) {
			if (!this.statusBar) {
				this.statusBar = this.addStatusBarItem();
			}
		} else if (this.statusBar) {
			this.statusBar.remove();
			this.statusBar = null;
		}
	}
}
