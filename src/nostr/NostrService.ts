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
	private relay?: Relay;
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
		relayUrl: string,
		settings: NostrWriterPluginSettings
	) {
		console.log(`Initializing NostrService. with relayUrl: ${relayUrl}`);
		if (!settings.privateKey) {
			console.error(
				"YourPlugin requires a private key to be set in the settings."
			);
			return;
		}
		this.plugin = plugin;
		this.app = app;
		this.relay = relayInit(relayUrl);
		this.privateKey = this.convertKeyToHex(settings.privateKey);
		this.publicKey = getPublicKey(this.privateKey);

		this.relay.on("connect", () => {
			console.log(`connected to ${this.relay?.url}`);
			this.isConnected = true;
		});

		this.relay.on("disconnect", () => {
			console.log(`disconnected from ${this.relay?.url}`);
			this.isConnected = false;
		});

		this.relay.on("error", () => {
			console.error(`failed to connect to ${this.relay?.url}}`);
			this.isConnected = false;
		});

		this.relay.connect();

		// TODO get from settings
		// TODO make sure they are validated as URLs prior..
		this.relayURLs = [
			"ws://127.0.0.1:8080",
			"ws://127.0.0.1:8080",
			"ws://127.0.0.1:8080",
			"ws://127.0.0.1:8080",
			"ws://127.0.0.1:8089",
			"ws://127.0.0.1:8080",
			"ws://127.0.0.1:8088",
		];

		this.connectedRelays = [];

		let connectionPromises = this.relayURLs.map((url) => {
			return new Promise<Relay | null>((resolve) => {
				console.log(`Trying.. ${url}`);
				let relayAttempt = relayInit(url);

				relayAttempt.on("connect", () => {
					console.log(`connected/m to ${relayAttempt.url}`);
					this.connectedRelays.push(relayAttempt);
					resolve(relayAttempt);
				});

				const handleFailure = () => {
					console.log(`failed to connect to ${url}`);
					resolve(null);
				};

				relayAttempt.on("disconnect", handleFailure);
				relayAttempt.on("error", handleFailure);

				try {
					relayAttempt.connect();
				} catch (error) {
					console.log(error);
					console.log("in this error block");
					resolve(null);
				}
			});
		});

		Promise.all(connectionPromises).then(() => {
			console.log(
				`Connected to ${this.connectedRelays.length} / ${this.relayURLs.length}`
			);
			if (this.connectedRelays.length === 0) {
				this.plugin.statusBar?.setText("Not connected to Nostr 🌚");
			} else {
				this.plugin.statusBar?.setText(
					`Connected to Nostr 🟣 ${this.connectedRelays.length} / ${this.relayURLs.length} relays.`
				);
			}
		});
	}

	public getConnectionStatus(): boolean {
		return this.isConnected;
	}

	public getPublicKey(): string {
		return this.publicKey;
	}

	async publishShortFormNote(message: string) {
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
			try {
				let finalEvent: Event<Kind.Text> = {
					...event,
					id: eventHash,
					sig: getSignature(event, this.privateKey),
				};

				return new Promise<boolean>((resolve, reject) => {
					let pub = this.relay?.publish(finalEvent);

					pub?.on("ok", () => {
						console.log(`Event published successfully`);
						console.log(finalEvent);
						resolve(true);
					});

					pub?.on("failed", (reason: any) => {
						console.log(`Failed to publish event: ${reason}`);
						console.log(finalEvent);
						reject(false);
					});
				});
			} catch (error) {
				console.error(error);
				return false;
			}
		}
	}

	async publishNote(
		fileContent: string,
		activeFile: TFile,
		summary: string,
		imageUrl: string
	) {
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
			console.log(eventTemplate);

			let event: UnsignedEvent<Kind.Article> = {
				...eventTemplate,
				pubkey: this.publicKey,
			};

			let eventHash = getEventHash(event);
			try {
				let finalEvent: Event<Kind.Article> = {
					...event,
					id: eventHash,
					sig: getSignature(event, this.privateKey),
				};

				return new Promise<boolean>((resolve, reject) => {
					let pub = this.relay?.publish(finalEvent);

					pub?.on("ok", () => {
						// Save the event to published.json
						this.savePublishedEvent(finalEvent);
						console.log(`Event published successfully`);
						console.log(finalEvent);
						resolve(true);
					});

					pub?.on("failed", (reason: any) => {
						console.log(`Failed to publish event: ${reason}`);
						reject(false);
					});
				});
			} catch (error) {
				console.error(error);
				return false;
			}
		}
	}

	shutdownRelays(){
		console.log('Shutting down Nostr service')
		this.relay?.close();
		for(let r of this.connectedRelays){
			r.close();
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

	async savePublishedEvent(finalEvent: Event<Kind.Article>) {
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
}
