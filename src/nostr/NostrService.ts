import * as dotenv from "dotenv";
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
import { TFile } from "obsidian";
import { NostrWriterPluginSettings } from "src/settings";
import { v4 as uuidv4 } from "uuid";

export default class NostrService {
	private relay?: Relay;
	private privateKey: string;
	private publicKey: string;

	constructor(relayUrl: string, settings: NostrWriterPluginSettings) {
		console.log(`Initializing NostrService. with relayUrl: ${relayUrl}`);
		const basePath = (app.vault.adapter as any).basePath;
		// Check if the public and private keys are set
		if (!settings.privateKey) {
			console.error(
				"YourPlugin requires a private key to be set in the settings."
			);
			return;
		}
		dotenv.config({
			path: `${basePath}/.obsidian/plugins//.env`,
			debug: false,
		});
		this.relay = relayInit(relayUrl);
		this.privateKey = this.convertKeyToHex(settings.privateKey);
		this.publicKey = getPublicKey(this.privateKey);
		this.relay = relayInit(relayUrl);

		this.relay.on("connect", () => {
			console.log(`connected to ${this.relay?.url}`);
		});

		this.relay.on("error", () => {
			console.error(`failed to connect to ${this.relay?.url}}`);
		});

		this.relay.connect();
	}

	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.relay) {
				reject(new Error("Relay not initialized"));
				return;
			}

			this.relay.on("connect", () => {
				console.log(`connected to ${this.relay?.url}`);
				resolve();
			});

			this.relay.on("error", () => {
				console.error(`failed to connect to ${this.relay?.url}`);
				reject(new Error("Failed to connect to relay."));
			});

			this.relay.connect();
		});
	}

	public getPublicKey(): string {
		return this.publicKey;
	}

	async publishShortFormNote(message: string) {
		console.log(`trying to publish short form note from NostrService...`);
		// TODO some validation here on the file content .. no html etc
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

				console.log(`Final Event: ${finalEvent.content} `);
				let pub = this.relay?.publish(finalEvent);

				pub?.on("ok", () => {
					console.log(`Event published successfully`);
					return true;
					// TODO save event data to short form logs or something
				});

				pub?.on("failed", (reason: any) => {
					console.log(`Failed to publish event: ${reason}`);
					return false;
				});

				return true;
			} catch (error) {
				console.error(error);
				return false;
			}
		}
	}

	async publishNote(fileContent: string, activeFile: TFile, summary: string) {
		console.log(`trying to publish note from NostrService...`);
		// TODO some validation here on the file content .. no html etc
		if (fileContent) {
			/**
			 * Generate id for d tag, allows editing later
			 */
			let uuid: any = uuidv4().substr(0, 8);
			let tags: any = [["d", uuid]];

			if (summary) {
				console.log(`summary: ${summary}`);
				tags.push(["summary", summary]);
			}

			let timestamp = Math.floor(Date.now() / 1000);
			tags.push(["published_at", timestamp.toString()]);

			const regex = /#\w+/g;
			const matches = fileContent.match(regex) || [];
			const hashtags = matches.map((match) => match.slice(1)); // Remove '#' from each hashtag

			for (const hashtag of hashtags) {
				tags.push(["t", hashtag]);
			}

			const noteTitle = activeFile.basename;
			console.log(noteTitle);
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
						console.log(`Event published successfully`);
						console.log(finalEvent);
						// resolve Promise with true
						resolve(true);
						// TODO save event data to logs or something
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

	getEnvVar(key: string): string {
		const value = process.env[key];
		if (value && value.startsWith("nsec")) {
			let decodedPrivateKey = nip19.decode(value);
			return decodedPrivateKey.data as string;
		}
		if (!value) {
			throw new Error(`Environment variable ${key} not found`);
		}
		return value;
	}
}
