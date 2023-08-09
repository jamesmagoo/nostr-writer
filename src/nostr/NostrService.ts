import {
	Event,
	EventTemplate,
	Kind,
	Relay,
	UnsignedEvent,
	getEventHash,
	getPublicKey,
	getSignature,
	nip19,
	relayInit,
} from "nostr-tools";
import { TFile, App } from "obsidian";
import { NostrWriterPluginSettings } from "src/settings";
import { v4 as uuidv4 } from "uuid";
import NostrWriterPlugin from "main";

export default class NostrService {
	private privateKey: string;
	private publicKey: string;
	private plugin: NostrWriterPlugin;
	private app: App;
	private isConnected: boolean;
	private relayURLs: string[];
	private connectedRelays: Relay[];

	constructor(
		plugin: NostrWriterPlugin,
		app: App,
		settings: NostrWriterPluginSettings
	) {
		if (!settings.privateKey) {
			console.error(
				"YourPlugin requires a private key to be set in the settings."
			);
			return;
		}
		this.plugin = plugin;
		this.app = app;
		this.privateKey = this.convertKeyToHex(settings.privateKey);
		this.publicKey = getPublicKey(this.privateKey);
		this.relayURLs = [];
		if (!settings.relayURLs) {
			console.error(
				"YourPlugin requires a list of relay urls to be set in the settings, defaulting."
			);
			this.relayURLs = [
				"wss://nos.lol ",
				"wss://relay.damus.io",
				"wss://relay.nostr.band",
				"wss://relayable.org",
				"wss://nostr.rocks",
				"wss://nostr.fmt.wiz.biz",
			];
		} else {
			for (let url of settings.relayURLs) {
				if (this.isValidURL(url)) {
					this.relayURLs.push(url);
				}
			}
		}
		this.connectToRelays();
	}

	connectToRelays() {
		this.refreshRelayUrls();
		this.connectedRelays = [];
		let connectionPromises = this.relayURLs.map((url) => {
			return new Promise<Relay | null>((resolve) => {
				console.log(`Initializing NostrService. with relay: ${url}`);
				let relayAttempt = relayInit(url);

				relayAttempt.on("connect", () => {
					console.log(`connected to ${relayAttempt.url}`);
					this.connectedRelays.push(relayAttempt);
					resolve(relayAttempt);
				});

				const handleFailure = () => {
					console.log(`failed to connect to ${url}`);
					console.log("Removing ...");
					this.connectedRelays.remove(relayAttempt);
					if (this.connectedRelays.length === 0) {
						this.plugin.statusBar?.setText(
							"Nostr 🌚"
						);
						this.isConnected = false;
					} else {
						this.plugin.statusBar?.setText(
							`Nostr 🟣 ${this.connectedRelays.length} / ${this.relayURLs.length} relays.`
						);
					}
					resolve(null);
				};

				relayAttempt.on("disconnect", handleFailure);
				relayAttempt.on("error", handleFailure);

				try {
					relayAttempt.connect();
				} catch (error) {
					console.log(error);
					resolve(null);
				}
			});
		});

		Promise.all(connectionPromises).then(() => {
			console.log(
				`Connected to ${this.connectedRelays.length} / ${this.relayURLs.length}`
			);
			if (this.connectedRelays.length === 0) {
				this.plugin.statusBar?.setText("Nostr 🌚");
				this.isConnected = false;
			} else {
				this.plugin.statusBar?.setText(
					`Nostr 🟣 ${this.connectedRelays.length} / ${this.relayURLs.length} relays.`
				);
				this.isConnected = true;
			}
		});
	}

	refreshRelayUrls() {
		this.relayURLs = [];
		if (!this.plugin.settings.relayURLs) {
			console.error(
				"YourPlugin requires a list of relay urls to be set in the settings, defaulting to Damus."
			);
			// TODO make a relay for this plugins users & add it here
			this.relayURLs = [
				"wss://nos.lol ",
				"wss://relay.damus.io",
				"wss://relay.nostr.band",
				"wss://relayable.org",
				"wss://nostr.rocks",
				"wss://nostr.fmt.wiz.biz",
			];
		} else {
			for (let url of this.plugin.settings.relayURLs) {
				if (this.isValidURL(url)) {
					this.relayURLs.push(url);
				}
			}
		}
	}

	getRelayInfo(relayUrl: string): boolean {
		let connected: boolean = false;
		for (let r of this.connectedRelays) {
			if (r.url == relayUrl) {
				connected = true;
			}
		}
		return connected;
	}

	public getConnectionStatus(): boolean {
		return this.isConnected;
	}

	public getPublicKey(): string {
		return this.publicKey;
	}

	async publishShortFormNote(
		message: string
	): Promise<{ success: boolean; publishedRelays: string[] }> {
		console.log(`Sending a short form note to Nostr...`);
		if (message) {
			let uuid: any = uuidv4().substr(0, 8);
			let tags: any = [["d", uuid]];
			let eventTemplate: EventTemplate<Kind.Text> = {
				kind: 1,
				created_at: Math.floor(Date.now() / 1000),
				tags: tags,
				content: message,
			};
			console.log(eventTemplate);
			let event: UnsignedEvent<Kind.Text> = {
				...eventTemplate,
				pubkey: this.publicKey,
			};

			let eventHash = getEventHash(event);

			let finalEvent: Event<Kind.Text> = {
				...event,
				id: eventHash,
				sig: getSignature(event, this.privateKey),
			};
			return this.publishToRelays<Kind.Text>(finalEvent);
		} else {
			console.error("No message to publish");
			return { success: false, publishedRelays: [] };
		}
	}

	async publishNote(
		fileContent: string,
		activeFile: TFile,
		summary: string,
		imageUrl: string
	): Promise<{ success: boolean; publishedRelays: string[] }> {
		console.log(`Publishing your note to Nostr...`);
		if (fileContent) {
			/**
			 * Generate id for d tag, allows editing later
			 */
			let uuid: any = uuidv4().substr(0, 8);
			let tags: any = [["d", uuid]];

			if (summary) {
				tags.push(["summary", summary]);
			}

			if (imageUrl) {
				tags.push(["image", imageUrl]);
			}

			let timestamp = Math.floor(Date.now() / 1000);
			tags.push(["published_at", timestamp.toString()]);

			const regex = /#\w+/g;
			const matches = fileContent.match(regex) || [];
			const hashtags = matches.map((match) => match.slice(1));

			for (const hashtag of hashtags) {
				tags.push(["t", hashtag]);
			}

			const noteTitle = activeFile.basename;
			tags.push(["title", noteTitle]);
			let eventTemplate: EventTemplate<Kind.Article> = {
				kind: 30023,
				created_at: timestamp,
				tags: tags,
				content: fileContent,
			};

			let event: UnsignedEvent<Kind.Article> = {
				...eventTemplate,
				pubkey: this.publicKey,
			};

			let eventHash = getEventHash(event);

			let finalEvent: Event<Kind.Article> = {
				...event,
				id: eventHash,
				sig: getSignature(event, this.privateKey),
			};

			return this.publishToRelays<Kind.Article>(finalEvent);
		} else {
			console.error("No message to publish");
			return { success: false, publishedRelays: [] };
		}
	}

	async publishToRelays<T extends Kind>(
		finalEvent: Event<T>
	): Promise<{ success: boolean; publishedRelays: string[] }> {
		try {
			let publishingPromises = this.connectedRelays.map((relay) => {
				return new Promise<{ success: boolean; url?: string }>(
					(resolve) => {
						console.log(`Publishing to.. ${relay.url}`);

						let pub = relay.publish(finalEvent);

						pub?.on("ok", () => {
							console.log(
								`Event published successfully to ${relay.url}`
							);
							if (finalEvent.kind === Kind.Article) {
								console.log(
									"30032 kind, save to published json"
								);
								this.savePublishedEvent(finalEvent);
							}
							resolve({ success: true, url: relay.url });
						});

						pub?.on("failed", (reason: any) => {
							console.log(
								`Failed to publish event to ${relay.url}: ${reason}`
							);
							resolve({ success: false });
						});
					}
				);
			});

			let results = await Promise.all(publishingPromises);
			let publishedRelays = results
				.filter((result) => result.success)
				.map((result) => result.url!);

			console.log(
				`Published to ${publishedRelays.length} / ${this.connectedRelays.length} relays.`
			);

			if (publishedRelays.length === 0) {
				console.log("Didn't send to any relays");
				return { success: false, publishedRelays: [] };
			} else {
				return { success: true, publishedRelays };
			}
		} catch (error) {
			console.error(
				"An error occurred while publishing to relays",
				error
			);
			return { success: false, publishedRelays: [] };
		}
	}

	shutdownRelays() {
		console.log("Shutting down Nostr service");
		if (this.connectedRelays.length > 0) {
			for (let r of this.connectedRelays) {
				r.close();
			}
		}
	}

	convertKeyToHex(value: string): string {
		if (value && value.startsWith("nsec")) {
			let decodedPrivateKey = nip19.decode(value);
			return decodedPrivateKey.data as string;
		}
		if (value && value.startsWith("npub")) {
			let decodedPublicKey = nip19.decode(value);
			return decodedPublicKey.data as string;
		}
		return value;
	}

	// TODO add relays information to event post...
	async savePublishedEvent<T extends Kind>(finalEvent: Event<T>) {
		const filePath = `${this.plugin.manifest.dir}/published.json`;
		let publishedEvents;
		try {
			const fileContent = await this.app.vault.adapter.read(filePath);
			publishedEvents = JSON.parse(fileContent);
		} catch (e) {
			publishedEvents = [];
		}
		publishedEvents.push(finalEvent);
		await this.app.vault.adapter.write(
			filePath,
			JSON.stringify(publishedEvents)
		);
	}

	isValidURL(url: string) {
		try {
			new URL(url);
			return true;
		} catch (error) {
			console.log(error);
			return false;
		}
	}
}
