import "dotenv/config";
import { Relay } from "nostr-tools";
import { Editor, MarkdownView, Notice, Plugin, setIcon } from "obsidian";
import { NostrModal } from "./src/NostrModal";
import NostrService from "./src/nostr/NostrService";
import { NostrWriterSettingTab, loadSettings } from "./src/settings";

export default class NostrWriterPlugin extends Plugin {
	nostrService: NostrService;
	relay: Relay;

	async onload() {
		this.nostrService = new NostrService("wss://relay.damus.io/");
		// Initialize NostrService with the relay URL
		// this.relay = relayInit("wss://relay.damus.io/");

		// this.relay.on("connect", () => {
		// 	console.log(`connected to ${this.relay.url}`);
		// 	new Notice(`Connected to : ${this.relay.url}`);
		// });

		// this.relay.on("error", () => {
		// 	console.error(`failed to connect to ${this.relay.url}`);
		// 	new Notice(
		// 		`Failed to connect to ${this.relay.url}. Check the console for more details.`
		// 	);
		// });

		// this.relay.connect();

		//await this.loadSettings();
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

		// this.addCommand({
		// 	id: "get-file-content",
		// 	name: "Get File Content",
		// 	callback: async () => {
		// 		const file = this.app.workspace.getActiveFile();

		// 		if (!file) {
		// 			new Notice("No active file.");
		// 			return;
		// 		}

		// 		try {
		// 			const content = await this.app.vault.read(file);
		// 			const success = await this.nostrService.publishNote(
		// 				content
		// 			);
		// 			if (success) {
		// 				new Notice("Content successfully published to Nostr.");
		// 			} else {
		// 				new Notice("Failed to publish content to Nostr.");
		// 			}
		// 		} catch (err) {
		// 			console.error(
		// 				`Failed to publish file content: ${file.path}`,
		// 				err
		// 			);
		// 			new Notice(
		// 				"An error occurred while trying to publish content."
		// 			);
		// 		}
		// 	},
		// });

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

	// async loadSettings() {
	// 	this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	// }

	// async saveSettings() {
	// 	await this.saveData(this.settings);
	// }

	// async publishNote() {
	// 	console.log(`trying to publish note...`);

	// 	// Assuming you want to publish the current active file
	// 	const activeFile = this.app.workspace.getActiveFile();

	// 	if (activeFile) {
	// 		// Read the contents of the active file
	// 		const fileContent = await this.app.vault.read(activeFile);
	// 		console.log(fileContent);

	// 		let tags: any = [["d", "lert25235"]];
	// 		//   if(image) tags.push(["image", image]);
	// 		//   if(summary) tags.push(["summary", summary]);
	// 		//   if(publishedAt) tags.push(["published_at", publishedAt]);

	// 		// Extract hashtags from content
	// 		// const regex = /#\w+/g;
	// 		// const matches = fileContent.match(regex) || [];
	// 		// const hashtags = matches.map((match) => match.slice(1)); // Remove '#' from each hashtag

	// 		// if (hashtags.length > 0) {
	// 		// 	tags.push(["t", hashtags]);
	// 		// 	console.log(hashtags);
	// 		// }

	// 		const regex = /#\w+/g;
	// 		const matches = fileContent.match(regex) || [];
	// 		const hashtags = matches.map((match) => match.slice(1)); // Remove '#' from each hashtag

	// 		for (const hashtag of hashtags) {
	// 			tags.push(["t", hashtag]);
	// 			console.log(hashtag);
	// 		}

	// 		const noteTitle = activeFile.basename;
	// 		console.log(noteTitle);
	// 		tags.push(["title", noteTitle]);
	// 		// TODO: need to check for NIP-19 keys liek these and convert if needed
	// 		let privateKeyEnv = this.getEnvVar("NOSTR_PRIVATE_KEY");
	// 		console.log(`privateKeyEnv: ${privateKeyEnv}`)
	// 		let privateKey =
	// 		"xxxx";
	// 		let decodedPrivateKey = nip19.decode(privateKey)
	// 		console.log(decodedPrivateKey.data)
	// 		let publicKey =
	// 			"xxxxxxx";
	// 		let decodedPublicKey = nip19.decode(publicKey)

	// 		console.log(decodedPublicKey.data)

	// 		let eventTemplate: EventTemplate<Kind.Text> = {
	// 			//kind: 30023,
	// 			kind: 1,
	// 			created_at: Math.floor(Date.now() / 1000),
	// 			tags: tags,
	// 			content: fileContent,
	// 		};
	// 		console.log(eventTemplate);

	// 		let event: UnsignedEvent<Kind.Text> = {
	// 			...eventTemplate,
	// 			pubkey: decodedPublicKey.data as string,
	// 		};

	// 		console.log(`Event: ${event.content} & ${event.pubkey} & ${event.created_at} & ${event.kind} & ${event.tags} `);
	// 		let eventHash = getEventHash(event);
	// 		try {
	// 			let finalEvent: Event<Kind.Text> = {
	// 				...event,
	// 				id: eventHash,
	// 				sig: getSignature(event, decodedPrivateKey.data as string),
	// 			};
	// 			// Publish the file content
	// 			//await this.nostrService.publishNote(fileContent);
	// 			//let privateKey = this.getEnvVar("NOSTR_PRIVATE_KEY");
	// 			// event.id = getEventHash(event);
	// 			// event.sig = getSignature(event, privateKey);
	// 			// serializeEvent(event);
	// 			console.log(`Final Event: ${finalEvent.content} `);
	// 			let pub = this.relay.publish(finalEvent);

	// 			pub.on("ok", () => {
	// 				console.log(`Event published successfully`);
	// 				new Notice("Event published successfully ");
	// 				new Notice(`Event published successfully ${event.content}`);
	// 				// TODO save event data to logs or something
	// 			});

	// 			pub.on("failed", (reason: any) => {
	// 				console.log(`Failed to publish event: ${reason}`);
	// 				new Notice(`Failed to publish event: ${reason}`);
	// 			});

	// 			// Show a success notification
	// 			new Notice("Successfully published note to Nostr.");
	// 		} catch (error) {
	// 			// Show an error notification
	// 			new Notice(
	// 				`Failed to publish note to Nostr..: ${error.message}`
	// 			);
	// 		}
	// 	}
	// }
}
