import NostrWriterPlugin from "main";
import axios from 'axios';
import { App, Notice, FileSystemAdapter, RequestUrlParam, TFile, normalizePath, requestUrl } from "obsidian";
import { NostrWriterPluginSettings } from "src/settings";
import { finalizeEvent, nip98, nip19 } from "nostr-tools";

export default class ImageUploadService {
	private plugin: NostrWriterPlugin;
	private app: App;
	private targetProvider: string;
	private premiumNIP98User: boolean;
	private privateKey: string;
	private static readonly UPLOAD_ENDPOINT = "https://nostr.build/api/v2/upload/files";


	constructor(plugin: NostrWriterPlugin, app: App, settings: NostrWriterPluginSettings) {
		this.targetProvider = settings.selectedImageStorageProvider;
		this.premiumNIP98User = settings.premiumStorageEnabled;
		this.plugin = plugin;
		this.privateKey = this.convertKeyToHex(settings.privateKey);
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
				let headers: Record<string, string> = {
					'Content-Type': 'multipart/form-data',
				};

				if (this.premiumNIP98User) {
					let base64encodedEventString = await nip98.getToken(ImageUploadService.UPLOAD_ENDPOINT, 'post',
						(authEvent) => finalizeEvent(authEvent, Buffer.from(this.privateKey)), true);
					headers['Authorization'] = base64encodedEventString;
					new Notice("⏳ Uploading as premium user.")
				}

				const response = await axios.post('https://nostr.build/api/v2/upload/files', formData, {
					headers: headers,
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
		let uploadResults = [];
		let success = true;

		for (let imagePath of imageFilePaths) {
			try {
				let imageFile = this.app.vault.getAbstractFileByPath(imagePath)
				if (imageFile instanceof TFile) {
					let imageBinary = await this.app.vault.readBinary(imageFile);

					if (this.isFileSizeOverLimit(imageBinary)) {
						continue;
					}
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
					let headers: Record<string, string> = {
						'Content-Type': 'multipart/form-data',
					};

					if (this.premiumNIP98User) {
						let base64encodedEventString = await nip98.getToken(ImageUploadService.UPLOAD_ENDPOINT, 'post',
							(authEvent) => finalizeEvent(authEvent, Buffer.from(this.privateKey)), true);
						headers['Authorization'] = base64encodedEventString;
						new Notice("⏳ Uploading as premium user.")
					}
					const response = await axios.post('https://nostr.build/api/v2/upload/files', formData, {
						headers: headers,
					});
					//let response = await requestUrl(requestUrlParams);
					//const { data } = response.json();
					const { data } = response;
					if (Array.isArray(data.data) && data.data.length > 0) {
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
		return { success, results: uploadResults };
	}

	isFileSizeOverLimit(file: ArrayBuffer): boolean {
		let maxSizeInBytes = 10 * 1024 * 1024; // 10 MB
		if (this.premiumNIP98User) {
			maxSizeInBytes = 50 * 1024 * 1024; // 100MB
		}
		if (file.byteLength > maxSizeInBytes) {
			if (this.premiumNIP98User) {
				new Notice('❌ 50 MB inline image limit. Will not upload.');
				return true;
			}
			new Notice('❌ Inline image size exceeds the limit. Will not upload.');
			return true;
		}
		return false;
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
}

