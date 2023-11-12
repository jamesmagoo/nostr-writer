# Obsidian Nostr Writer
> Directly publish from Obsidian to Nostr 

## A Match Made..
[**Obsidian**](https://obsidian.md/) is an amazing markdown editor, word processor, note organiser, and idea synthesiser: the perfect tool for writers. 

[**Nostr**](https://nostr.com/) represents the future of how we communicate and distribute the written word: decentralised, free, independent, incorruptible. 

They seem to me to be a match made in heaven...
***
[![Did We Just Become Best Friends?](./docs/stepbros.png)](https://www.youtube.com/watch?v=3-ZUDtaGf3I)


## Demo Video
<div align="center">
    <a href="https://www.loom.com/share/d1456e7335c049e19194df5bcba669a0">
      <p>Obsidian Nostr Writer Demo - Watch Video</p>
    </a>
    <a href="https://www.loom.com/share/d1456e7335c049e19194df5bcba669a0">
      <img style="max-width:300px;" src="https://cdn.loom.com/sessions/thumbnails/d1456e7335c049e19194df5bcba669a0-with-play.gif">
    </a>
  </div>

## User Guide
Big thank you to Tony for making this user guide! 
[User Guide](https://habla.news/tony/87412fcb)

## For Writers
> This tool is low-friction..
1. Add your Nostr private key (once on set-up).
2. Write in Obsidian
3. Hit publish to Nostr, and that's it. 

## A Quiet Place
> Avoid the web browser and all its distractions!

This tool is completely abstracted from Nostr, allowing you to stay focused - the plugin does not read Nostr messages or give you any view into the public space. It just publishes what you've written. Stay focused on your work and disconnected from the noise. 

## Features
- Publishing to Nostr: Directly publish your notes from Obsidian to Nostr with a single click.
- Private Key Integration: Securely set and store your private key within the plugin settings for authenticated publishing.
- Summary and Image URL Support: Add an optional summary and image URL to accompany your note, with live preview functionality.
- Public Key Retrieval: Easily retrieve and copy your public key to the clipboard.
- Local Record Keeping: Keep a local record of published events in a JSON file for your reference and tracking.
- Published View : See all posts sent from Obsidian
- Short Format Message Writer: Quickly compose and publish short form messages directly to Nostr from within Obsidian.
- Relays Configuration: Configure to send to whatever relays you like.

### Coming Soon...
- Published view will have a link to the published note/event on njump.me
- Multiple user profiles (nsecs) - so you can publish as different nostr accounts
- Improved UI

### Ideas..
- Plugin User Relay: A relay specific to this plugin - see what everyone else is writing.
- Image CDN : Images in your file will be uploaded to a CDN & plugged into your nostr message
- Frontmatter : after publishing it would be cool if this also creates a "front matter" in the published .md file
- Publish as a draft (kind 30024) option

## Writing On Nostr
It's time to start building your blog, speaking to your audience, and publishing your work freely outside of any walled garden. 

With Nostr, you are not wed to any platform like Substack, Medium, or Twitter - who can all shut you down and delete your work with the push of a button.

#### Why Nostr?
1. **Ownership**: When you post on Nostr, you own your content. There's no platform claiming any rights to your work, so you can do what you want with it - republish it, sell it, etc.

2. **Get Paid (No Middlemen)**: Nostr allows for direct monetization options, you can earn directly from your readers without sharing a percentage of your earnings with a platform like Substack or Twitter.

3. **Readership Building**: Nostr allows writers to build and manage their own communities. This can foster a more personal and engaged readership compared to larger, more impersonal platforms.

4. **Open-source and Community-driven**: As an open-source project, Nostr is driven by the community and its development is guided by the needs and wants of its users. You are not at the mercy of corporate decisions or profit-driven changes.

5. **Cost-Effective**: Nostr does not charge you fees for using their platform, unlike platforms like Substack. This makes it an economical choice for writers, particularly those who are just starting out or those who want to maximize their earnings.

### Long-Form Content
On Nostr you can write messages specifically tagged as "long-form". This tool publishes messages of this kind. Long-form content aggregators and clients such as https://habla.news & https://blogstack.io/ specifically channel these messages to readers. There'll be much more in the future.. 😉
### Short-Form Content
This tool focuses on publishing full .md files in the long-form from Obsidian. However, if you've got a short message to send out there - an idea or a quip - just toggle on short-form writer in settings; this will give you a place to write a message and send.
***
### Security Notice
This plugin stores your private key within your local Obsidian settings file, specifically in:
```
<Vault Directory>/.obsidian/plugins/nostr-writer/data.json
```

It is not transmitted elsewhere, but its security is fundamentally tied to the security of your device and Obsidian files.

Please be aware that if an unauthorized person gains access to your device or your Obsidian files, they might be able to access your private key. The plugin obscures the key in its settings interface but this doesn't equate to strong encryption or secured storage.

Therefore, it's important to ensure the overall security of your device and your Obsidian files to keep your private key safe. 

> Remember, the security of your private key is your responsibility.

## Install
Install from the Community Plugin list by searching "Nostr Writer"

### Manually Installing the Plugin
-   Head over to [releases](https://github.com/jamesmagoo/nostr-writer/releases) and download a release - latest is recommended - (or the pre-release for upcoming features.)
-   Navigate to your plugin folder in your prefered vault: `VaultFolder/.obsidian/plugins/`
-   Create a new folder called `nostr-writer`
-   Copy and paste over `main.js`, `styles.css`, `manifest.json` into the newly created `/nostr-writer` folder.
-   Make sure you enable the plugin by going into Settings > Community plugins > Installed plugins > toggle 'nostr-writer'.

## ⚡️SATS
lightning address: 
```
magoo@getalby.com
```

lightning invoice: 
```
lnbc200u1pjvu03dpp5x20p0q5tdwylg5hsqw3av6qxufah0y64efldazmgad2rsffgda8qdpdfehhxarjypthy6t5v4ezqnmzwd5kg6tpdcs9qmr4va5kucqzzsxqyz5vqsp5w55p4tzawyfz5fasflmsvdfnnappd6hqnw9p7y2p0nl974f0mtkq9qyyssqq6gvpnvvuftqsdqyxzn9wrre3qfkpefzz6kqwssa3pz8l9mzczyq4u7qdc09jpatw9ekln9gh47vxrvx6zg6vlsqw7pq4a7kvj4ku4qpdrflwj
```
Message me on Nostr with ideas & feedback (or for something more formal, add an issue [here](https://github.com/jamesmagoo/nostr-writer/issues))
```
npub10a8kw2hsevhfycl4yhtg7vzrcpwpu7s6med27juf4lzqpsvy270qrh8zkw
```
</br>
<div align="center">
<a href="https://www.buymeacoffee.com/jamesmagoo" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>


<!-- <a id="usdButton" class="button suggested-action green" href="https://getalby.com/p/winterpaper90109" target="_blank"><i class="fas fa-dollar-sign" aria-hidden="true"></i>Buy Me a <span id="thing">Pizza</span></a> -->

</div>

