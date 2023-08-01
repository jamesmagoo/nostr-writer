# Obsidian Nostr Writer
> Directly publish from Obsidian to Nostr 

## A Match Made..
**Obsidian** is an amazing markdown editor, word processor, note organiser, and idea synthesiser: the perfect tool for writers. 

**Nostr** represents the future of how we communicate and distribute the written word: decentralised, free, independent, incorruptable. 

They seem to me to be a match made in heaven...
[![Did We Just Become Best Friends?](./docs/stepbros.png)](https://www.youtube.com/watch?v=3-ZUDtaGf3I)

## For Writers
> This tool is low-friction..
1. Add your Nostr private key (once on set-up).
2. Write in Obsidian
3. Hit publish to Nostr, and that's it. 

## A Quiet Place
> Avoid the web browser and all it's distractions!

This tool is completely abstracted from Nostr, allowing you to stay focused - the plugin does not read Nostr messages or give you any view into the public space. It just publishes what you've written. Stay focused on your work and disconnected from the noise. 

<div align="center">
<a href="https://www.buymeacoffee.com/jamesmagoo" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
</div>

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
On Nostr you can write messages specifically tagged as "long-form". This tool publishes messages of this kind. Long-form content aggregators and clients such as www.habla.news specifically channel these messages to readers. There'll be much more in the future.. 😉
### Short-Form Content
This tool focuses on publishing full Obsidian .md files in the long-form, however if you've got a short note to send out there - an idea or a quip - just toggle on short-form writer in settings. 
***
### Security Notice
This plugin stores your private key within your local Obsidian settings file, specifically in:
```
<Vault Directory>/.obsidian/plugins/obsidian-nostr-writer/data.json
```

It is not transmitted elsewhere, but its security is fundamentally tied to the security of your device and Obsidian files.

Please be aware that if an unauthorized person gains access to your device or your Obsidian files, they might be able to access your private key. The plugin obscures the key in its settings interface but this doesn't equate to strong encryption or secured storage.

Therefore, it's important to ensure the overall security of your device and your Obsidian files to keep your private key safe. 

> Remember, the security of your private key is your responsibility.