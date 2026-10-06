# Image asset provenance

All four PNG assets were generated with the built-in image generation tool, then copied into the project. Sprite sheets preserve their alpha channel. They are independent game assets, not screenshot crops.

- `assets/hero.png`: transparent 1536×1024, 4×3 sprite grid. Handsome eastern-fantasy male warrior in ivory/teal hanbok, 3-head SD proportions, short dark hair and sword. Rows face south, north and east. Columns idle, left-step, right-step and slash attack. Full body, consistent proportions, warm hand-painted style, no UI/text/backdrop.
- `assets/squirrel.png`: transparent 1536×1024, 4×2 sprite grid. Chestnut forest squirrel on the first row; larger royal squirrel with leafy crown and amber markings on the second. Columns idle, two running steps and attack windup. Left-facing, mobile-readable, warm painterly shading, no UI/text/backdrop.
- `assets/npcs.png`: transparent 1536×1024, two side-by-side full-body front-facing NPCs. Kind elderly village chief with silver hair/beard, blue hanbok and cane; young female herbalist with sage/cream hanbok, braid and herb basket. Matching SD game proportions and warm hand-painted art. No UI/text/backdrop.
- `assets/world.png`: opaque 1536×1024 landscape, near top-down Korean hanok village above a forest clearing, central sandstone plaza and broad north/south route, tiled roofs, lanterns and cherry blossoms, pond/waterfall at the outer right. The former screenshot was supplied as style reference only. No embedded characters, animals, HUD, text, icons or damage numbers.

The environment prompt specifically asked for unobstructed central playable ground and buildings/decor at outer edges. Runtime collision rectangles follow the plaza, gate and forest clearing. Sprite animation selects atlas cells at runtime; movement and attack state drive the selected frames.
