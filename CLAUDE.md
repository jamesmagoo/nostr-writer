# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is an Obsidian plugin called "Nostr Writer" that allows users to publish their markdown notes directly from Obsidian to the Nostr decentralized social network. The plugin handles long-form content publishing, short-form notes, image uploads, and bookmark management.

## Development Commands

### Build Commands
- `npm run dev` - Start development build with file watching using esbuild
- `npm run build` - Production build with TypeScript checking and esbuild bundling
- `npm run version` - Bump version and update manifest.json and versions.json files

### Key Files for Development
- `main.ts` - Plugin entry point and main class
- `esbuild.config.mjs` - Build configuration using esbuild
- `tsconfig.json` - TypeScript configuration
- `manifest.json` - Obsidian plugin manifest

## Architecture

### Core Components

**NostrWriterPlugin (main.ts)**
- Main plugin class that extends Obsidian's Plugin
- Manages plugin lifecycle, settings, UI components (ribbon icons, status bar)
- Handles publish commands and modal interactions
- Coordinates between NostrService and various UI views

**NostrService (src/service/NostrService.ts)**
- Core service handling all Nostr protocol interactions
- Manages relay connections using nostr-tools library
- Handles event creation, signing, and publishing
- Supports multiple user profiles and image upload integration
- Manages bookmark and highlight retrieval from Nostr relays

**ImageUploadService (src/service/ImageUploadService.ts)**
- Handles image upload to Nostr-compatible image hosting services
- Processes inline images in markdown content
- Manages banner image uploads for articles

### UI Components

**Modal Components**
- `ConfirmPublishModal.ts` - Confirmation dialog before publishing
- `ShortFormModal.ts` - Modal for writing short-form notes

**View Components**
- `PublishedView.ts` - Shows previously published notes
- `ReaderView.ts` - Displays user's Nostr bookmarks
- `HighlightsView.ts` - Shows user's Nostr highlights
- `settings.ts` - Plugin settings interface

### Key Features Architecture

**Publishing Flow**
1. User triggers publish via ribbon icon or command
2. ConfirmPublishModal collects metadata (title, summary, tags, profile)
3. NostrService processes markdown content, uploads images, creates Nostr event
4. Event is published to configured relays
5. Published event metadata is saved to `published.json`

**Multi-Profile Support**
- Users can configure multiple Nostr identities
- Each profile has its own private key (nsec format)
- Publishing can be done under any configured profile

**Image Handling**
- Inline images in markdown are automatically detected
- Images are uploaded to configurable hosting services (default: nostr.build)
- Original image references are replaced with hosted URLs
- Supports banner images for articles

**Relay Management**
- Configurable list of Nostr relays
- Automatic connection management with status tracking
- Connection status shown in status bar
- Graceful handling of relay disconnections

## Data Storage
- Plugin settings stored in `.obsidian/plugins/nostr-writer/data.json`
- Published events metadata in `.obsidian/plugins/nostr-writer/published.json`
- Private keys stored locally (security notice in README)

## Security Considerations
- Private keys are stored locally in plain text in settings
- Plugin warns users about device security importance
- No transmission of private keys except for event signing
- Image uploads may expose metadata to hosting services