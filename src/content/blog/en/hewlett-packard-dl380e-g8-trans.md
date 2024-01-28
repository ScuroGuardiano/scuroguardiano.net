---
title: Transforming HP Proliant DL380e G8 to work with ATX MOBO
slug: hewlett-packard-dl380e-g8-trans
lang: en
date: 2024-01-26
description: An idea came to my mind to transform HP Proliant DL380e G8 to work with normal mATX motherboard. This wasn't good idea.
---
## Some server spec that matters for me:
* 14 LFF SAS/SATA Drive Bays, 12 at the front and 2 at the rear
* P420 Smart Array Raid Controller
* 2x750W PSU DPS-750-AB-3 A

## P420 Smart Array Raid Controller
I need to use this controller in order to connect drives from server bays. I tested it and it works in consumer motherboard but the cache battery must be plug in. And you need to load kernel module sg.
> Note: This controller gets hot as hell, ***It needs better cooling***, I will just add a fan to heat sink.

### Update after more tests
- This controller won't work on motherboards that allow to boot from PCI devices. It will enter a bootloop, from what I've read online if you disable CSM Boot you should be fine. Also some motherboards have option to turn off booting from PCI.
- You can use `ssacli` on Linux to control the controller. In fact I think that is the only way to control it using non HPE motherboard.
- The controller is most likely activated via software driver if it's not in HPE motherboard, so you can't boot from it. It will also appear with small delay [something like 10-20s after booting OS]. You have to take it into account if you have for example VMs automatically started on boot. In Proxmox you can add `Startup delay` under `Start/Shutdown order` VM option.
- If you don't want hardware RAID you can enable HBAMODE, which will expose all drives directly to OS. To do that, delete all your logical drives with `ssacli controller slot=2 logicaldrive all delete forced` and then enable hbamode `ssacli controller slot=2 modify hbamode=on forced`. ***I hope I don't have to tell you that this will delete all your existing data, right?***. You must wait a moment for drives to appear in your OS, so wait a minute or so before you start googling why it's not working ^^.
- With hardware raid controller acts weirdly if you simulate failure by removing a drive. I need to do more testing but I don't know if I trust this piece of technology. I must consider if I want to use hardware raid on it or maybe I will just enable HBA mode and do software raid with ZFS. Although this raid card is pretty fast but you know, it's absolutely proprietary so good luck with data recovery if something fails, which leads us to the last point
- ***RAID IS NOT A BACKUP***

## Using server PSU to power the thing
It's not that easy. You need a breakout board that won't burn you house. I think I'll use, hold on, [***ZSX Breakout Board 16 Ports + PICO 24pin ATX + Fan Hubs 100% GPU Mining All in One – A Game Changer***](https://www.parallelminer.com/product/zsx-breakout-board-16-ports-pico-24pin-atx-fan-hubs-100-gpu-mining-a-game-changer/), that's the model name I guess. It's from Parallel Miner but I found it on ebay, because shipping from US to my country is too expensive. That would give me all I need, power to my motherboard, fans and...

## Drive Backplanes
Connecting signal is easy, you connect Micro <del>SUS</del> SAS cables to Smart Array Raid Controller and you're good to go. But power is not as trivial.

Front panel has 2x8pin connectors and rear panel has 1x6pin connector, they all are going from big connector located on server motherboard. I made some searches online and I found pinout for them but I must ***measure myself*** to be 100% sure. ***And you should too***.  
Anyways from what I've read in those 2x8pin connectors it goes like:
- Black - GND
- Yellow - 12V
- Red - 3.3V
And from top to bottom pins are:
```
GND 12V GND GND
12V 3V3 12V
```
6 pin connector pins from top to bottom:
```
3V3     3V3
12V GND  5V
```
Those 3.3V pins are useless, allegedly.

Sources for pinouts:
* [https://forums.servethehome.com/index.php?threads/converting-an-hp-dl380e-gen8-14xlff-server-to-a-disk-shelf.29584/](https://forums.servethehome.com/index.php?threads/converting-an-hp-dl380e-gen8-14xlff-server-to-a-disk-shelf.29584/)
* [https://www.reddit.com/r/homelab/comments/hnka1w/hp_dl380e_g8_12xlff_expander_backplane_power/](https://www.reddit.com/r/homelab/comments/hnka1w/hp_dl380e_g8_12xlff_expander_backplane_power/)

## I will update this document when I'll continue with a build.
