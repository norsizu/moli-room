# Moli's Room

[中文](README.md) | **English**

> A tiny 3D room for MOLI, the mascot of the MOLINK e-reader. She lives by the real local time and weather of your city.

**Live:** https://moli.iaura.io

## Promo video

https://github.com/user-attachments/assets/8b6bfa22-04d7-419c-aa59-ab8f42c1c0ca

About 100 s, Mandarin voice-over with English subtitles. Can't play it? [Download the mp4](docs/promo-en.mp4)

## Features

- **Synced with the real world**: sun position and day/night lighting follow the real time in your city, and live weather (clear / rain / snow / fog) shows up outside the window and in the room.
- **A day in Moli's life**: reading, gaming, listening to music, eating, sleeping… she follows her own schedule and turns on the floor lamp at night.
- **Cat & robot vacuum**: tap the cat to hear it meow; the robot vacuum patrols the room.
- **4-in-1 TV console**: Super Moli, Moli Force, Moli Blocks and Moli Circus, playable with keyboard or touch.
- **Ambient sound mixer**: wind, rain, snow, birds, insects, frogs, thunder and wind chimes. They follow the real weather, or you can toggle them by hand like a white-noise app. There's a radio, too.
- **Aura crossover easter egg**: Aura, 南闲's desktop AI companion, drops by as a hologram.
- **Chinese / English** UI, works on phone and desktop.
- **Pure front-end**: three.js r128 + vanilla JS, no build step. Any static server will do.

![room](docs/wide.jpg)

| | |
|---|---|
| ![night](docs/night.jpg) | ![aura](docs/aura.jpg) |
| ![snow](docs/snow.jpg) | ![mario](docs/mario.jpg) |
| ![cat](docs/cat.jpg) | ![circus](docs/circus.jpg) |

## Run locally

```bash
git clone https://github.com/norsizu/moli-room.git
cd moli-room
python3 -m http.server 8080   # then open http://localhost:8080
```

Optional URL parameters (for debugging): `lang=zh|en`, `lat=31.2&lon=121.5` (city coordinates), `at=21:30` (time of day), `wx=clear|cloudy|fog|rain|heavy|storm|snow|heavysnow` (weather).

## About MOLINK

MOLINK (墨灵) is an open-source, non-profit DIY dual-screen e-reader (ESP32-S3, 4.26" e-paper + 2.05" OLED sub-screen). Its hardware is open-sourced on the OSHWHub (立创开源硬件平台).
MOLI (茉莉) is MOLINK's mascot. This repo is a small fan-made web project about Moli and shares no code with the MOLINK firmware.

## Credits

- MOLI character / MOLINK UI design: **Tyo**
- Moli sticker set: **南闲**
- Moli's Room: **南闲 (norsizu)**
- Third-party: [three.js](https://threejs.org) (MIT); fonts Press Start 2P and ZCOOL QingKe HuangYou (SIL OFL); weather and location data from public APIs such as Open-Meteo and BigDataCloud.

## Community

Open-source promotion and community link: [LINUX DO](https://linux.do/).

Come chat about the room, report bugs or share your remixes. Scan the code to join the "闲话 AI | Aura" QQ group: `951895791`.

<p align="center"><img src="docs/community/qq-group.jpg" width="250" alt="闲话 AI | Aura QQ group 951895791"></p>

## License

This project (code and art assets) is licensed under **[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)**. You may share and adapt it with **attribution**, for **non-commercial** purposes only. Third-party libraries and fonts keep their own licenses.

The TV mini-games are non-commercial fan tributes to classic NES titles, made for learning and tech demos; all related names and trademarks belong to their respective owners.
