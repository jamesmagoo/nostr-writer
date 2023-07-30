import NostrWriterPlugin from "../main";
import { App, PluginSettingTab, Setting } from "obsidian";

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
          .setValue(this.plugin.settings.mySetting)
          .onChange(async (value) => {
            this.plugin.settings.mySetting = value;
            await this.plugin.saveSettings();
          }));

      new Setting(containerEl)
      .setName('Nostr Public key')
      .setDesc('It\'s a secret')
      .addText(text => text
          .setPlaceholder('Enter your public key')
          .setValue(this.plugin.settings.mySetting)
          .onChange(async (value) => {
              this.plugin.settings.mySetting = value;
              await this.plugin.saveSettings();
          }));
  }
}