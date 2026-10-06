# JUNJA ADVENTURE ONLINE

Build: `20261006-online-2`. This is the server and client used for the shared-world preview. The original Phaser client and its cloud-save project are separate.

## Run

Node 22+, `npm install --prefix server/online`, then set `DATABASE_URL` and run `node server/online/server.mjs`. Listens on `0.0.0.0:$PORT` (default 4174). Serves `image-prototype` itself. Development-only `TEST_MEMORY=1` explicitly selects transient memory; production refuses to start without PostgreSQL.

## Play

Create an account, select one of four independently saved character slots, and choose the same channel as your friends. A channel supports 24 people; this single-process build supports 64 connected people total. No additional database, paid plan, trading, PvP, or ranking was added. Free Render can sleep between sessions; the existing database currently expires October 30, 2026 and needs renewal/migration before that date.

Warrior / rogue / mage / healer have four distinct abilities each, unlocked at levels 2, 4, 8, and promotion. At level 10 and one boss defeat, speak near the elder to promote. At level 10 the elder also changes profession for 500 G without resetting growth/equipment.

Shared monsters are authoritative on the server: movement/collision, range, damage, cooldowns, deaths, quests, purchases, gear, drops. Boss participants need 25 damage or useful healing to a participant, recent within 45 seconds and nearby at death. Each qualifying person receives separate XP, gold, quest credit, and loot. Boss gear rates: rare 10%, ordinary 30%, none 60%; six rare items have equal conditional chance. Ordinary monsters have a 3% chance of ordinary gear. Full bags receive 100 G in place of a rolled item.

Gear slots: weapon, head, armor, cape, boots, ring, earrings. All affect stats; the first five also use modular field/paperdoll overlays. Ring/earring equipment does not change appearance. Every class has its own generated 4×3 animated atlas. Repeated items can be stored (80 total); equipment is selected from owned items.

## Storage and networking

Accounts use scrypt hashes, random hashed 30-day sessions, and independent roster JSON. PostgreSQL schema `junja_adventure_online` is isolated from the casino's tables. Growth saves every 30 seconds when dirty, with immediate saves after purchases/equipment/quest/promotion/job actions, on disconnect, and on graceful shutdown. Hard process termination can lose the most recent unsaved combat growth (up to 30 seconds). UI explicitly shows save errors; production never substitutes ephemeral storage.

One active character per account; a new join displaces the previous stream. Channel names in invite URLs; no credentials in URLs. Authenticated fetch streaming at 5 updates per second, server simulation 10 Hz, local movement prediction/interpolation, movement heartbeat ~8 Hz. No database polling per frame. Account token remains in this browser; sign in with the same credentials elsewhere for the same saved roster. Previous v2 browser records can be imported into the warrior at account creation once, with bounded legacy values and no imported rare gear. This compatibility import necessarily trusts old client progress; it is not a competitive anti-cheat migration.

## Verification

`node --test server/online/tests/*.test.mjs` covers HTTP streaming/auth/slot isolation/relogin, shared kills/channel isolation, movement/range/cooldowns, healer boss credit, gear, rare-roll boundaries, promotion and replay-safe quest claims. CI also runs four real Chromium/WebKit clients against PostgreSQL, checking shared movement, equipment, chat, UI purchasing, promotion/job change, mobile quest/auto-hunt, and account reload, with screenshot artifacts. Production deployment receives separate health, durable persistence and two-client smoke checks.
