# Asset provenance

The runtime references only local assets. No image API, remote font or external avatar service is contacted by the app.

- `public/assets/morning.webp`: built-in image-generation tool, optimised to a 960px-wide WebP. Prompt: a candid realistic landscape photograph of a white coffee mug, closed silver laptop and notebook on a wooden kitchen table, garden at dawn, slightly pretentious founder morning routine, natural early light, no people, text, logos or watermark. The source was generated at 1536×1024.
- `public/assets/portraits.webp`: built-in image-generation tool, optimised to a 576px-wide WebP. Prompt: a 2D editorial cartoon sprite sheet for six fictional tech CEO parodies; exact 3×2 grid without gutters; centred shoulder-up portraits on sage-grey backgrounds; Scam Altman in a navy crewneck, Elong Husk in a black T-shirt, Mark Zuckerbot in a grey T-shirt and gold chain, Satire Nadella in a navy sweater, Jensen Hype in a black leather jacket, and Sundar Pitchai in a dark zip-up jacket. Clean linework and lightly textured illustration, no text, logos or watermark. The source was generated at 1536×1024.
- Avatars share one sprite request and CSS background positions. The first row is Scam, Elong, Mark; the second is Satire, Jensen, Sundar.
- `public/assets/icons/*.svg`: selected Phosphor Core icons, copied from the locked development dependency; MIT license included. No hand-drawn icon paths.
- The favicon and on-page wordmark use an original blue speech-bubble mark with a geometric white `L` and pale-blue sparkle. The colours fit the site palette without reusing LinkedIn's tile or `in` letterform.

Raster assets are checked in. `cd apps/web && bun scripts/assets.js` refreshes the icon subset. Optional second and third arguments point to replacement image sources for WebP optimisation; generation services are not required to run or rebuild the app.
