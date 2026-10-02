# Asset provenance

The runtime references only local assets. No image API, remote font or external avatar service is contacted by the app.

- `public/assets/morning.webp`: built-in image-generation tool, optimised to a 960px-wide WebP. Prompt: a candid realistic landscape photograph of a white coffee mug, closed silver laptop and notebook on a wooden kitchen table, garden at dawn, slightly pretentious founder morning routine, natural early light, no people, text, logos or watermark. The source was generated at 1536×1024.
- `public/assets/portraits.webp`: built-in image-generation tool, optimised to a 576px-wide WebP. Prompt: a 2D editorial cartoon sprite sheet for a clearly labelled Breaking Bad fan parody; exact 3×2 grid without gutters; centred shoulder-up portraits on sage-grey backgrounds; Saul with swept chestnut hair, blue suit and orange tie; Walter bald with goatee, wire glasses, green shirt and pork-pie hat; Jesse in a red beanie and yellow hoodie; Gus with neat hair, glasses, yellow shirt and tie; Mike bald with grey stubble and dark jacket; Skyler with shoulder-length blonde hair and blue blouse. Clean linework and lightly textured illustration, not photographs or realistic actor portraits. The source was generated at 1536×1024.
- Avatars share one sprite request and CSS background positions. The first row is Saul, Walter, Jesse; the second is Gus, Mike, Skyler. Internal avatar keys were preserved as implementation identifiers after the cast change.
- `public/assets/icons/*.svg`: selected Phosphor Core icons, copied from the locked development dependency; MIT license included. No hand-drawn icon paths.
- The LarpedIn wordmark and favicon are simple original typographic marks for this parody.

Raster assets are checked in. `node scripts/assets.js` refreshes the icon subset. Optional second and third arguments point to replacement image sources for WebP optimisation; generation services are not required to run or rebuild the app.
