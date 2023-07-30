import { App, Editor, MarkdownView, Modal, Notice, Plugin, setIcon } from 'obsidian';
import { NostrModal} from './src/NostrModal';
import { NostrWriterSettingTab, loadSettings , settings} from "./src/settings";
import NostrTools from "./src/nostr/NostrTools";



// interface NostrWriterPluginSettings {
// 	mySetting: string;
// 	npub: string;
// 	anotherSetting: string;
// }

// export const DEFAULT_SETTINGS: NostrWriterPluginSettings = {
// 	mySetting: 'default',
// 	anotherSetting: 'blah blh',
// 	npub: 'npub'
// }

export default class NostrWriterPlugin extends Plugin {
	async onload() {
		//await this.loadSettings();
		await loadSettings(this);
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new NostrWriterSettingTab(this.app, this));

	
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('pencil', 'Publish To Nostr', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Hello Youuuuu!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text XXX');
		const item = this.addStatusBarItem();
		setIcon(item, "info");

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-nostr-modal',
			name: 'Nostr Modal',
			callback: () => {
				new NostrModal(this.app, (result) => {
					new Notice(`Hello, ${result}!`);
				  }).open();
			}
		});

		this.addCommand({
            id: 'get-file-content',
            name: 'Get File Content',
            callback: async () => {
                const file = this.app.workspace.getActiveFile();

                if (!file) {
                    new Notice('No active file.');
                    return;
                }

                try {
                    const content = await this.app.vault.read(file);
                    new Notice(content); // Display file content in a notice
                    // Send the content somewhere
                } catch (err) {
                    console.error(`Failed to read file: ${file.path}`, err);
                }
            },
        });
    

		
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});

		

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	// async loadSettings() {
	// 	this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	// }

	// async saveSettings() {
	// 	await this.saveData(this.settings);
	// }
}
