import NostrWriterPlugin from "main";
import { App, TFile, normalizePath, arrayBufferToBase64 } from "obsidian";
import { NostrWriterPluginSettings } from "src/settings";

export default class ImageUploadService {
	private plugin: NostrWriterPlugin;
	private app: App;


	constructor(plugin: NostrWriterPlugin, app: App, settings: NostrWriterPluginSettings) {
		// TODO need to get the media storage provider from settings eventually, for now - nostr.build
		//	if (!settings.privateKey) {
		//		console.error(
		//			"YourPlugin requires a private key to be set in the settings."
		//		);
		//		return;
		//	}

		this.plugin = plugin;
		this.app = app;
	}

	// a function that takws an array of file strings - gets the file data - uploads to nostr.build - and returns corresponding URL
	// return data structure may be a map ? e.g. "![images/bah.png]" : "https://cdn.nostr.build/i/c50b26c94e4ee712e56653ae125a7af068eebdc07777346381187d7db3b2050c.jpg"
	// i.e. <md string to replace> : <replacement string>
	public async uploadImagesToStorageProvider(imageFilePaths: string[]) {
		console.log("Uploading images....", imageFilePaths);

		for (let imagePath of imageFilePaths) {

			//let imageData = await this.app.vault.adapter.read(
			//	imagePath
			//);

			let imageFile = this.app.vault.getAbstractFileByPath(imagePath)
			// TODO use this below to read image file binary data? 
			if (imageFile instanceof TFile) {
				console.log(`Its a file ${imageFile.name}`)
				let imageBinary = await this.app.vault.readBinary(imageFile);

				let base64Image = arrayBufferToBase64(imageBinary);

				console.log(`base64Image of ${imagePath}`);
				console.log(base64Image);
			}
		}

	}
}
