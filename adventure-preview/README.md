# JUNJA ADVENTURE playable preview

Replaces the flattened screenshot prototype with a clean environment image and independent character/monster/NPC sprite sheets. Serve this directory as a static site. No build step or database change is required.

## Controls

Tap empty ground to follow a walkable route. Drag anywhere on ground for directional movement. Select a monster and press Attack; rotation skill unlocks at level 2. PC: WASD/arrows, Space attack, Q skill, E NPC interaction.

## Playable flow

Village chief → accept ten-squirrel quest → forest → combat and loot → report to chief → accept boss quest → defeat Kingtail → report → glowing sword equipped. Includes telegraphed monster attacks, potions, shop, death recovery, return, bag, auto hunt and responsive camera.

## Persistence

Local browser storage under `junja-adventure-play-v2`. Migrates valid level/XP/gold/kills from the two former image preview keys. Saves every 5 seconds when changed and immediately at rewards, return, purchases and page exit. Storage errors are displayed. This preview does not claim server account persistence; the existing React/Neon client and database are untouched.

## Verification

`node --test tests/*.test.mjs` — 7 passing checks including a runtime playthrough through level 5, 11 kills, boss quest completion, sword reward and persistence; collision routes, duplicate rewards, touch cancellation, death recovery and storage failure.

`node tests/browser.mjs` — executed successfully in GitHub Actions for Chromium desktop/Android viewport and WebKit iPhone/landscape viewport. Desktop completed both quests, the boss and glowing-sword reward at level 5, with 13 kills, then checked persistence after reload. All four contexts reported no page errors. Village/forest/quest-completion screenshots are uploaded as CI artifacts. Local browser transport was unavailable, so actual browser verification was performed in CI. Mobile quest overlay is collapsed by default to keep the hero visible.

## Release

Use the existing preview service only after confirming its Render workspace, repository branch and publish directory. Publish directory must be `image-prototype`; do not mix old HTML with a newer script. Entry page uses a dated JS/CSS version. Do not overwrite the existing cloud client or reset the database.

Generated art was produced with the built-in image generation tool and copied into `assets/`: hero.png (4×3 directional movement/attack frames), squirrel.png (4×2 ordinary/boss frames), npcs.png (chief/herbalist), world.png (clean 1536×1024 village/forest map). All sprite PNGs retain actual alpha transparency.
