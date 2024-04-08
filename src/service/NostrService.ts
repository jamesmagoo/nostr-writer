import NostrWriterPlugin from "main";
import * as path from 'path';
import { nip19 } from "nostr-tools";
import { SimplePool } from 'nostr-tools/pool';
import { Event } from "nostr-tools/core"
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";
import { App, TFile, normalizePath, arrayBufferToBase64 } from "obsidian";
import { NostrWriterPluginSettings } from "src/settings";
import { v4 as uuidv4 } from "uuid";
import ImageUploadService from "./ImageUploadService";

interface Profile {
	profileNickname: string;
	profilePrivateKey: string;
}

export default class NostrService {
	private privateKey: string;
	private profiles: Profile[];
	private multipleProfilesEnabled: boolean;
	private publicKey: string;
	private plugin: NostrWriterPlugin;
	private app: App;
	private isConnected: boolean;
	private relayURLs: string[];
	connectedRelays: Relay[];
	private pool: SimplePool;
	private poolUrls: string[];
	private imageUploadService: ImageUploadService;


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

		if (settings.multipleProfilesEnabled) {
			console.log("multiple profiles enabled")
			this.profiles = settings.profiles;
			this.multipleProfilesEnabled = true;
		}
		this.plugin = plugin;
		this.app = app;
		this.imageUploadService = new ImageUploadService(this.plugin, this.app, settings);
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

	reloadMultipleAccounts() {
		console.log("reloading multiple accounts...")
		this.profiles = this.plugin.settings.profiles;
		this.multipleProfilesEnabled = true;
	}


	async connectToRelays() {
		this.refreshRelayUrls();
		this.connectedRelays = [];

		let connectionPromises = this.relayURLs.map((url) => {
			return new Promise<Relay | null>(async (resolve) => {
				console.log(`Initializing NostrService with relay: ${url}`);
				try {
					const relayAttempt = await Relay.connect(url);

					relayAttempt.onclose = () => {
						handleFailure();
					}

					const handleFailure = () => {
						console.log(`Disconnected from ${url}, updating status bar.`);
						this.connectedRelays.remove(relayAttempt);
						this.updateStatusBar();
						resolve(null);
					};

					console.log(`Connected to ${relayAttempt.url}`);
					this.connectedRelays.push(relayAttempt);
					resolve(relayAttempt);
				} catch (error) {
					console.error(`Failed to connect to ${url}: ${error}`);
					resolve(null);
				}
			});
		});

		Promise.all(connectionPromises).then(() => {
			console.log(
				`Connected to ${this.connectedRelays.length} / ${this.relayURLs.length} relays`
			);
			this.updateStatusBar();
			if (this.connectedRelays.length > 0) {
				this.setConnectionPool();
				this.isConnected = true;
			}
		});
	}

	setConnectionPool = () => {
		this.pool = new SimplePool()
		this.poolUrls = [];
		for (const relay of this.connectedRelays) {
			this.poolUrls.push(relay.url);
		}
	}

	updateStatusBar = () => {
		if (this.connectedRelays.length === 0) {
			this.plugin.statusBar?.setText("Nostr 🌚");
			this.isConnected = false;
		} else {
			this.plugin.statusBar?.setText(
				`Nostr 🟣 ${this.connectedRelays.length} / ${this.relayURLs.length} relays.`
			);
		}
	};

	refreshRelayUrls() {
		this.relayURLs = [];
		if (!this.plugin.settings.relayURLs || this.plugin.settings.relayURLs.length === 0) {
			console.error(
				"YourPlugin requires a list of relay urls to be set in the settings, defaulting to Damus."
			);
			this.relayURLs = [
				"wss://nos.lol ",
				"wss://relay.damus.io",
				"wss://relay.nostr.band",
				"wss://relayable.org",
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
			if (r.url == relayUrl + "/") {
				return r.connected;
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

	async publishShortFormNote(message: string, profileNickname: string): Promise<{ success: boolean; publishedRelays: string[] }> {
		console.log(`Sending a short form note to Nostr...`);
		let profilePrivateKey = this.privateKey;
		let profilePublicKey = this.publicKey;
		if (profileNickname !== "default" && this.multipleProfilesEnabled) {
			console.log("recieved non-default profile: " + profileNickname);
			for (const { profileNickname: nickname, profilePrivateKey: key } of this.profiles) {
				if (profileNickname === nickname) {
					profilePrivateKey = this.convertKeyToHex(key);
					profilePublicKey = getPublicKey(profilePrivateKey);
				}
			}
		}
		if (message) {
			let uuid: any = uuidv4().substr(0, 8);
			let tags: any = [["d", uuid]];

			let eventTemplate = {
				kind: 1,
				created_at: Math.floor(Date.now() / 1000),
				tags: tags,
				content: message,
			};

			// this assigns the pubkey, calculates the event id and signs the event in a single step
			const signedEvent = finalizeEvent(eventTemplate, Buffer.from(profilePrivateKey))
			return this.publishToRelays(signedEvent, "", "");
		} else {
			console.error("No message to publish");
			return { success: false, publishedRelays: [] };
		}
	}

	async publishNote(
		fileContent: string,
		activeFile: TFile,
		summary: string,
		imageUrl: string,
		title: string,
		userSelectedTags: string[],
		profileNickname: string
	): Promise<{ success: boolean; publishedRelays: string[] }> {
		console.log(`Publishing your note to Nostr...`);

		let profilePrivateKey = this.privateKey;
		let profilePublicKey = this.publicKey;
		if (profileNickname !== "default" && this.multipleProfilesEnabled) {
			console.log("recieved non-default profile: " + profileNickname);
			for (const { profileNickname: nickname, profilePrivateKey: key } of this.profiles) {
				if (profileNickname === nickname) {
					profilePrivateKey = this.convertKeyToHex(key);
					profilePublicKey = getPublicKey(Buffer.from(profilePrivateKey));
				}
			}
		}
		if (fileContent) {
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

			if (userSelectedTags.length > 0) {
				for (const tag of userSelectedTags) {
					tags.push(["t", tag]);
				}
			}

			if (title) {
				tags.push(["title", title]);
			} else {
				const noteTitle = activeFile.basename;
				tags.push(["title", noteTitle]);
			}


			// Extract image paths from the Markdown content
			const regexImagePaths: string[] = this.extractImagePaths(fileContent);
			const imagePaths: string[] = [];
			console.log(imagePaths)

			// Print the extracted image paths
			regexImagePaths.forEach(path => console.log(path));
			try {
				let vaultResolvedLinks = this.app.metadataCache.resolvedLinks;

				console.log(activeFile.basename)
				console.log(activeFile.name)

				console.log("Resolved links:", vaultResolvedLinks);

				if (vaultResolvedLinks[activeFile.name]) {
					const fileContents = vaultResolvedLinks[activeFile.name];
					for (const filePath of Object.keys(fileContents)) {
						if (this.isImagePath(filePath)) {
							console.log(`This is an image we need ${filePath}`)
							imagePaths.push(filePath);
						}
					}
				}
				console.log("Content Before: ", fileContent);
				if (imagePaths.length > 0) {
					let imageUploadResult = await this.imageUploadService.uploadImagesToStorageProvider(imagePaths)
					if (imageUploadResult.success) {
						console.log(`Got the images uploaded ${imageUploadResult}`)
						for (const imageTarget of imageUploadResult.results) {
							console.log(`For ${imageTarget.filePath} ---> replace ${imageTarget.stringToReplace} with ${imageTarget.replacementStringURL}`)
							fileContent.replace(imageTarget.stringToReplace, imageTarget.replacementStringURL);
							let imetaTag = this.getImetaTagForImage(imageTarget.uploadMetadata);
							tags.push(imetaTag);
						}
					} else {
						console.error("Problem with the image upload, some or all images may not have successfully uploaded...")
					}
				}
			} catch (e) {
				console.error("Bigger Problem with the image upload, some or all images may not have successfully uploaded...", e)
			}
			console.log("Content After F&R: ", fileContent);

			let eventTemplate = {
				kind: 30023,
				created_at: timestamp,
				tags: tags,
				content: fileContent,
			};

			const finalEvent = finalizeEvent(eventTemplate, Buffer.from(profilePrivateKey))

			return this.publishToRelays(
				finalEvent,
				activeFile.path,
				profileNickname
			);
		} else {
			console.error("No message to publish");
			return { success: false, publishedRelays: [] };
		}
	}

	getImetaTagForImage(uploadData: any): string[] {
		// TODO: follow nip92 for inline media attachments, add tags as neccessary
		//
		// url the url to download the file
		let url = uploadData.url;
		//m a string indicating the data type of the file. The MIME types format must be used, and they should be lowercase.
		let mimeType = uploadData.mime
		//x containing the SHA-256 hexencoded string of the file.
		//ox containing the SHA-256 hexencoded string of the original file, before any transformations done by the upload server
		let ox = uploadData.original_sha256;
		//size (optional) size of file in bytes
		let size = uploadData.size;
		//dim (optional) size of file in pixels in the form <width>x<height>
		let dim = uploadData.dimensionsString
		//
		//		  "tags": [
		//    [
		//      "imeta",
		//      "url https://nostr.build/i/my-image.jpg",
		//      "m image/jpeg",
		//      "blurhash eVF$^OI:${M{o#*0-nNFxakD-?xVM}WEWB%iNKxvR-oetmo#R-aen$",
		//      "dim 3024x4032",
		//      "alt A scenic photo overlooking the coast of Costa Rica",
		//      "x <sha256 hash as specified in NIP 94>",
		//      "fallback https://nostrcheck.me/alt1.jpg",
		//      "fallback https://void.cat/alt1.jpg"
		//    ]
		//  ]
		//

		//blurhash(optional) the blurhash to show while the file is being loaded by the client
		//thumb (optional) url of thumbnail with same aspect ratio
		//image (optional) url of preview image with same dimensions
		//summary (optional) text excerpt
		//alt (optional) description for accessibility
		//fallback (optional) zero or more fallback file sources in case url fails
		["imeta"]

	}

	extractImagePaths(mdContent: string): string[] {
		// Regular expression pattern to match image paths in Markdown format
		const pattern: RegExp = /!\[\[(.*?\.(?:png|jpg|jpeg|gif|bmp|svg))\]\]/gi;

		const matches: RegExpExecArray[] = [];
		let match: RegExpExecArray | null;
		while ((match = pattern.exec(mdContent)) !== null) {
			matches.push(match);
		}

		console.log("matches:", matches);

		const imagePaths: string[] = matches.map(match => match[1].trim());

		return imagePaths;
	}

	isImagePath(filePath: string): boolean {
		const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'];
		const ext = path.extname(filePath).toLowerCase();
		return imageExtensions.includes(ext);
	}


	async getUserBookmarkIDs(): Promise<{ success: boolean; bookmark_event_ids: string[], longform_event_ids: string[] }> {
		const bookmark_event_ids: string[] = [];
		const longform_event_ids: string[] = [];
		try {
			if (this.pool === undefined || this.poolUrls.length === 0) {
				console.error("No pool...")
				this.setConnectionPool();
			}
			let events = await this.pool.querySync(this.poolUrls, { kinds: [10003], authors: [this.publicKey] })
			if (events.length > 0) {
				for (let event of events) {
					for (const tag of event.tags) {
						if (tag[0] === 'e') {
							bookmark_event_ids.push(tag[1]);
						}
						// handle kind 30023 long-form events
						if (tag[0] === 'a') {
							longform_event_ids.push(tag[1]);
						}
					}
				}
				return { success: true, bookmark_event_ids, longform_event_ids }
			}
			return events;
		} catch (error) {
			console.error('Error occurred while fetching bookmarks ids:', error);
			return { success: false, bookmark_event_ids, longform_event_ids };
		}
	}


	async loadUserBookmarks(): Promise<Event[]> {
		let events: Event[] = [];
		try {
			let res = await this.getUserBookmarkIDs();
			if (res.success) {
				if (this.pool === undefined || this.poolUrls.length === 0) {
					this.setConnectionPool();
				}
				if (res.longform_event_ids.length > 0) {
					for (let atag of res.longform_event_ids) {
						let author = ""
						let eTag = ""
						let parts = atag.split(':');
						if (parts.length >= 2) {
							author = parts[1];
							eTag = parts[2];
						}
						let articles = await this.pool.querySync(this.poolUrls, { authors: [author], kinds: [30023] });
						for (let articleItem of articles) {
							if (articleItem.tags.some(tag => tag[0] === "d" && tag[1] === eTag)) {
								events.push(articleItem);
							}
						}

					}
				}
				let newEvents = await this.pool.querySync(this.poolUrls, { ids: res.bookmark_event_ids, kinds: [1, 30023] });
				events.push(...newEvents);
				return events;
			} else {
				console.error('No bookmark IDs returned');
				return [];
			}

		} catch (err) {
			console.error('Error occurred while fetching bookmarks:', err);
			return [];
		}
	}

	async getUserProfile(userHexPubKey: string): Promise<Event> {
		try {
			if (this.pool === undefined || this.poolUrls.length === 0) {
				this.setConnectionPool();
			}
			let profileEvent = await this.pool.querySync(this.poolUrls, { kinds: [0], authors: [userHexPubKey] })
			return profileEvent;
		} catch (err) {
			console.error('Error occurred while fetching bookmarks:', err);
			return null;
		}
	}

	async publishToRelays(
		finalEvent: Event,
		filePath: string,
		profileNickname: string
	): Promise<{ success: boolean; publishedRelays: string[] }> {
		try {
			let publishingPromises = this.connectedRelays.map(async (relay) => {
				try {
					if (relay.connected) {
						console.log(`Publishing to ${relay.url}`);
						await relay.publish(finalEvent);
						console.log(`Event published successfully to ${relay.url}`);
						return { success: true, url: relay.url };
					} else {
						console.log(`Skipping disconnected relay: ${relay.url}`);
						return { success: false };
					}
				} catch (error) {
					console.error(`Failed to publish event to ${relay.url}: ${error}`);
					return { success: false };
				}
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
				if (finalEvent.kind === 30023) {
					this.savePublishedEvent(
						finalEvent,
						filePath,
						publishedRelays,
						profileNickname
					);
				}
				return { success: true, publishedRelays };
			}
		} catch (error) {
			console.error("An error occurred while publishing to relays", error);
			return { success: false, publishedRelays: [] };
		}
	}


	shutdownRelays() {
		console.log("Shutting down Nostr service");
		if (this.connectedRelays.length > 0) {
			for (let r of this.connectedRelays) {
				r.close();
			}
			this.pool.close();
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

	async savePublishedEvent(
		finalEvent: Event,
		publishedFilePath: string,
		relays: string[],
		profileNickname: string
	) {
		const publishedDataPath = `${this.plugin.manifest.dir}/published.json`;
		let publishedEvents;
		try {
			const fileContent = await this.app.vault.adapter.read(
				publishedDataPath
			);
			publishedEvents = JSON.parse(fileContent);
		} catch (e) {
			publishedEvents = [];
		}

		const eventWithMetaData = {
			...finalEvent,
			filepath: publishedFilePath,
			publishedToRelays: relays,
			profileNickname: profileNickname,
		};
		publishedEvents.push(eventWithMetaData);
		await this.app.vault.adapter.write(
			publishedDataPath,
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
