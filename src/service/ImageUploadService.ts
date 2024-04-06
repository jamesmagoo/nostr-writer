import NostrWriterPlugin from "main";
import axios from 'axios';
import { App, TFile, arrayBufferToBase64 } from "obsidian";
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
	// it may need to be an array of this obj : {<filePath>, <stringToReplace>, <replacementStringURL>} e.g. {"imagesFolder/image.png", "![[image.png]]", "https://cdn...."}
	async uploadImagesToStorageProvider(imageFilePaths: string[]): Promise<{ success: boolean, results: { filePath: string, stringToReplace: string, replacementStringURL: string}[] }> {
		console.log("Uploading images....", imageFilePaths);

		const uploadResults = [];
		let success = true;

		for (let imagePath of imageFilePaths) {
			try {
				let imageFile = this.app.vault.getAbstractFileByPath(imagePath)
				if (imageFile instanceof TFile) {
					console.log(`Uploading....${imageFile.name}`)
					let imageBinary = await this.app.vault.readBinary(imageFile);

					const formData = new FormData();
					formData.append('file', new Blob([imageBinary]), imageFile.name);

					const response = await axios.post('https://nostr.build/api/v2/upload/files', formData, {
						headers: {
							'Content-Type': 'multipart/form-data',
						},
					});

					console.log(response)
					const { data } = response;
					console.log(`full Response from nostr build`, data);

					console.log('Upload successful:', data.data);
					if (Array.isArray(data.data) && data.data.length > 0) {
						console.log("in here")
						const result = {
							filePath: imagePath,
							stringToReplace: `![[${imageFile.name}]]`,
							replacementStringURL: data.data[0].url
						};
						uploadResults.push(result);
					}

				}
			} catch (error) {
				console.error(`Problem with image file reading : ${error}`)
				success = false;
			}


			// TODO : next I need to take this bin/base64 data and uplaod to the URL 
			// wait for repsonse (a URL of the succesfully loaded image)
			// then add both the imageParh and the new upload URL to an object and push to result array
			// CASES:
			// all upload : {success: true, results : [{"image1.png" : "https://cdn.nostr.build/abcxyz..."},{"folderA/image5.png" : "https://cdn.nostr.build/abcxy..."}]}
			// one uplaod fails and others do not 
			// all fail : {success: false, result: []}
			// image too big .. could we check this first and warn? may need a progress screen after publish button is click (showing progress/success of each upload)
		}

		console.log(`Final Result : ${uploadResults} --- Success: ${success}`);
		return { success, results: uploadResults };
	}
}

