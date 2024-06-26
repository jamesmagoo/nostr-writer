import NostrWriterPlugin from "main";
import * as path from 'path';
import { nip19 } from "nostr-tools";
import { SimplePool } from 'nostr-tools/pool';
import { Event } from "nostr-tools/core"
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import { Relay } from "nostr-tools/relay";
import { App, Notice, TFile } from "obsidian";
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
		imageBannerFilePath: string | null,
		title: string,
		userSelectedTags: string[],
		profileNickname: string,
		publishAsDraft: boolean
	): Promise<{ success: boolean; publishedRelays: string[] }> {
		if (!publishAsDraft) {
			new Notice(`⏳ Publishing your note ${activeFile.name} to nostr...`)
		} else {
			new Notice(`⏳ Publishing your note ${activeFile.name} as a draft to nostr...`)
		}

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

			if (imageBannerFilePath !== null) {
				new Notice("🖼️ Uploading Banner Image")
				let imageUploadResult = await this.imageUploadService.uploadArticleBannerImage(imageBannerFilePath);
				if (imageUploadResult !== null) {
					tags.push(["image", imageUploadResult]);
					new Notice("✅ Uploaded Banner Image")
				} else {
					new Notice("❌ Problem Uploading Banner Image..")
				}
			} else {
				console.info("No banner image...")
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

			// Handle inline images, upload if possible, and replace their strings with urls in the .md content
			const imagePaths: string[] = [];

			try {
				let vaultResolvedLinks = this.app.metadataCache.resolvedLinks;
				if (vaultResolvedLinks[activeFile.path]) {
					const fileContents = vaultResolvedLinks[activeFile.path];
					for (const filePath of Object.keys(fileContents)) {
						if (this.isImagePath(filePath)) {
							imagePaths.push(filePath);
						}
					}
				}
				if (imagePaths.length > 0) {
					new Notice("✅ Found inline images - uploading with article.")
					let imageUploadResult = await this.imageUploadService.uploadImagesToStorageProvider(imagePaths)
					if (imageUploadResult.success && imageUploadResult.results && imageUploadResult.results.length > 0) {
						for (const imageTarget of imageUploadResult.results) {
							if (imageTarget.replacementStringURL !== null && imageTarget.uploadMetadata !== null) {
								fileContent = fileContent.replace(imageTarget.stringToReplace, imageTarget.replacementStringURL);
								let imetaTag = this.getImetaTagForImage(imageTarget.uploadMetadata);
								if (imetaTag !== null) {
									tags.push(imetaTag);
								}
							}
						}
					} else {
						console.error("Problem with the image upload, some or all images may not have successfully uploaded...")
					}
				} else {
					console.error("No images found in vault for this file..")
				}
			} catch (e) {
				console.error("Bigger Problem with the image upload, some or all images may not have successfully uploaded...", e)
				new Notice("❌ Problem uploading inline images.")
			}

			let eventTemplate = {
				kind: publishAsDraft ? 30024 : 30023,
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

	getImetaTagForImage(uploadData: any): string[] | null {
		let inlineTag: string[] = [];
		let url = uploadData.url ? uploadData.url : null;
		let mimeType = uploadData.mime ? uploadData.mime : null;
		let ox = uploadData.original_sha256 ? uploadData.original_sha256 : null;
		let size = uploadData.size ? uploadData.size : null;
		let dim = uploadData.dimensionsString ? uploadData.dimensionsString : null;
		let blurhash = uploadData.blurhash ? uploadData.blurhash : null;
		let thumbnail = uploadData.thumbnail ? uploadData.thumbnail : null;

		if (url !== null) {
			inlineTag.push("imeta")
			let urlString = `url ${url}`
			inlineTag.push(urlString)
		} else {
			console.error("No upload URL in metadata, so not adding imeta tag")
			return null;
		}

		if (mimeType !== null) {
			let mimeString = `m ${mimeType}`
			inlineTag.push(mimeString)
		}
		if (ox !== null) {
			let oxString = `ox ${ox}`
			inlineTag.push(oxString)
		}
		if (size !== null) {
			let sizeString = `size ${size}`
			inlineTag.push(sizeString)
		}
		if (dim !== null) {
			let dimString = `dim ${dim}`
			inlineTag.push(dimString)
		}
		if (blurhash !== null) {
			let blurhashString = `blurhash ${blurhash}`
			inlineTag.push(blurhashString)
		}

		if (thumbnail !== null) {
			let thumbnailString = `thumb ${thumbnail}`
			inlineTag.push(thumbnailString)
		}

		return inlineTag;
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

	async loadUserHighlights(): Promise<Event[]> {
		let events: Event[] = [];
		try {
			if (this.pool === undefined || this.poolUrls.length === 0) {
				this.setConnectionPool();
			}
			let highlights = await this.pool.querySync(this.poolUrls, { authors: [this.publicKey], kinds: [9802] });
			if (highlights.length > 0) {
				for (let event of highlights) {
					events.push(event);
				}
			}
			return events;

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

	//	The a tag, used to refer to a (maybe parameterized) replaceable event
	//for a parameterized replaceable event: ["a", <kind integer>:<32-bytes lowercase hex of a pubkey>:<d tag value>, <recommended relay URL, optional>]
	//for a non-parameterized replaceable event: ["a", <kind integer>:<32-bytes lowercase hex of a pubkey>:, <recommended relay URL, optional>]
	async getEventFromATag(tagValue: string): Promise<Event> {
		let events = [];
		try {
			if (this.pool === undefined || this.poolUrls.length === 0) {
				this.setConnectionPool();
			}
			let eventParts = tagValue.split(":");
			let articles = await this.pool.querySync(this.poolUrls, { kinds: [parseInt(eventParts[0], 10)], authors: [eventParts[1]] })
			for (let articleItem of articles) {
				if (articleItem.tags.some(tag => tag[0] === "d" && tag[1] === eventParts[2])) {
					events.push(articleItem);
				}
			}
			return events[0];
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
