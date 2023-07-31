import NostrWriterPlugin from "../main";
import { App, PluginSettingTab, Setting, Plugin} from "obsidian";
import NostrTools from "./nostr/NostrService";

interface NostrWriterPluginSettings {
	mySetting: string;
	npub: string;
	anotherSetting: string;
}

export class NostrWriterSettingTab extends PluginSettingTab {
  plugin: NostrWriterPlugin;

  constructor(app: App, plugin: NostrWriterPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

      new Setting(containerEl)
        .setName('Setting #1')
        .setDesc('It\'s a secret')
        .addText(text => text
          .setPlaceholder('Enter your secret')
          .setValue(settings.mySetting)
          .onChange(async (value) => {
            settings.mySetting = value;
            await saveSettings(this.plugin);
          }));

      new Setting(containerEl)
      .setName('Nostr Public key')
      .setDesc('It\'s a secret')
      .addText(text => text
          .setPlaceholder('Enter your public key')
          .setValue(settings.mySetting)
          .onChange(async (value) => {
              settings.mySetting = value;
              await saveSettings(this.plugin);
          }));
  }
}

export const DEFAULT_SETTINGS: NostrWriterPluginSettings = {
  mySetting: 'default',
  anotherSetting: 'blah blh',
  npub: 'npub'
} as const

export let settings = Object.assign({}, DEFAULT_SETTINGS) as NostrWriterPluginSettings 

export async function loadSettings(plugin:any): Promise<void> {
settings = Object.assign({}, DEFAULT_SETTINGS, await plugin.loadData())
// showExcerpt.set(settings.showExcerpt)
}

export async function saveSettings(plugin: Plugin): Promise<void> {
  await plugin.saveData(settings)
}
