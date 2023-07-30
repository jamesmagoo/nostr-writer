import {
	validateEvent,
	verifySignature,
	getSignature,
	getEventHash,
	getPublicKey,
	relayInit,
	SimplePool,
} from "nostr-tools";
import 'dotenv/config'

export default class NostrTools {
    
    // access your private key
    static getEnvVar(key: string): string {
        const value = process.env[key];
        if (!value) {
            throw new Error(`Environment variable ${key} not found`);
        }
        return value;
    }
}
