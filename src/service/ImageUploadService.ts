import NostrWriterPlugin from "main";
import axios from 'axios';
import { App, Notice, FileSystemAdapter, RequestUrlParam, TFile, normalizePath, requestUrl } from "obsidian";
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

	async uploadArticleBannerImage(imageFilePath: string): Promise<string | null> {
		let result = null;
		try {
			let path = normalizePath(imageFilePath);
			let imageBuffer = await FileSystemAdapter.readLocalFile(path);
			if (imageBuffer) {
				const formData = new FormData();
				formData.append('file', new Blob([imageBuffer]));
				const response = await axios.post('https://nostr.build/api/v2/upload/files', formData, {
					headers: {
						'Content-Type': 'multipart/form-data',
					},
				});
				const { data } = response;
				if (Array.isArray(data.data) && data.data.length > 0) {
					result = data.data[0].url;
				}
			}
		} catch (error) {
			console.error(`Problem with image file reading : ${error}`)
		}
		return result;
	}

	async uploadImagesToStorageProvider(imageFilePaths: string[]): Promise<{ success: boolean, results: { filePath: string, stringToReplace: string, replacementStringURL: string, uploadMetadata: any }[] }> {
		console.log("Uploading images....", imageFilePaths);

		let uploadResults = [];
		let success = true;

		for (let imagePath of imageFilePaths) {
			try {
				let imageFile = this.app.vault.getAbstractFileByPath(imagePath)
				if (imageFile instanceof TFile) {
					console.log(`Uploading....${imageFile.name}`)
					let imageBinary = await this.app.vault.readBinary(imageFile);

					if(this.isFileSizeOverLimit(imageBinary)){
						continue;
					}
					console.log("herre");
					const formData = new FormData();
					formData.append('file', new Blob([imageBinary]), imageFile.name);

					//const requestUrlParams: RequestUrlParam = {
					//	url: 'https://nostr.build/api/v2/upload/files',
					//	method: 'POST',
					//	body: formDataString,
					//	headers: {
					//		//	'Content-Type': 'multipart/form-data',
					//	},
					//}

					// using axios has CORS problems....
					// nostr.build allows Obsidian but other stroage providers may not 
					// so need to use Obsidian's requestUrl method for future cases....
					// sending formData is tricky using this api - see below
					// https://github.com/ai-chen2050/obsidian-wechat-public-platform/blob/9fdecb96966eaafdd6cbac716ffa5da3fb8d4b2b/src/api.ts#L92
					// or...
					// https://github.com/gavvvr/obsidian-imgur-plugin/blob/main/src/uploader/imgur/ImgurAnonymousUploader.ts
					const response = await axios.post('https://nostr.build/api/v2/upload/files', formData, {
						headers: {
							'Content-Type': 'multipart/form-data',
						},
					});
					//let response = await requestUrl(requestUrlParams);
					console.log(response)
					//const { data } = response.json();
					const { data } = response;
					console.log(`full Response from nostr build`, data);
					if (Array.isArray(data.data) && data.data.length > 0) {
						console.log("in here")
						const result = {
							filePath: imagePath,
							stringToReplace: `![[${imageFile.name}]]`,
							replacementStringURL: data.data[0].url,
							uploadMetadata: data.data[0]
						};
						uploadResults.push(result);
						new Notice(`✅ Uploaded ${imageFile.name}`)
					} else {
						new Notice(`❌ Problem uploading ${imageFile.name}`)
					}

				}
			} catch (error) {
				new Notice(`❌ Problem uploading `)
				console.error(`Problem with image file reading : ${error}`)
				success = false;
			}

		}

		console.log(`Final Result : ${uploadResults} --- Success: ${success}`);
		return { success, results: uploadResults };
	}

	isFileSizeOverLimit(file: ArrayBuffer): boolean {
		const maxSizeInBytes = 10 * 1024 * 1024; // 10 MB
		// TODO only do this check for non-premium nostr build users..
		//if (premiumImageStorageUser){
		//	maxSizeInBytes = 100 * 1024 * 1024;
		//}
		// Option toggle in settings for user to indicate this ?
		if (file.byteLength > maxSizeInBytes) {
			new Notice('❌ Inline image size exceeds the limit. Will not upload.');
			return true;
		}
		return false;
	}
}

