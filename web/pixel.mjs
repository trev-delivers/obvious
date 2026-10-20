/**
 * The pixel games pages: how Four Horsemen and Smuggle Brawlers are built,
 * and the case study on the Smuggle Brawlers lettering.
 *
 * File links are pinned to the commits these pages were checked against, so
 * the line numbers still point at the right thing after the games move on.
 */
import { esc, code, head, section, table } from "./html.mjs";

const HP = "https://github.com/trev-delivers/holy-pixels/blob/8d85b11f3bc18b911b5c5a1f8f486fa8818eac64";
const HP_SELECT = "https://github.com/trev-delivers/holy-pixels/blob/f7f88fe4c37247a9bc1d2c567070e364cbd026d0";
const FOUR = "https://github.com/trev-delivers/4hm-the-game/blob/1ae6afbc1776012070a44b92e0b6dd18017f3be2";
const TYPE_COMMIT = "https://github.com/trev-delivers/holy-pixels/commit/795d456cceb09498c733865f9cc023b64ba68257";

/** A link to a file in one of the games, with a line or range if given. */
const at = (base, path, lines) =>
  `<a class="ob-link" href="${base}/${path}${lines ? `#L${String(lines).replace("-", "-L")}` : ""}"><code>${esc(path)}${lines ? `:${lines}` : ""}</code></a>`;
const hp = (path, lines) => at(HP, path, lines);
const four = (path, lines) => at(FOUR, path, lines);

/** A picture drawn at 4 screen pixels to one of its own, shown at 2 CSS
 * pixels to one so it lands on whole device pixels on a 2x screen. */
const pic = (file, w, h, alt, caption) => `<figure class="pixel-fig">
  <div class="pixel-fig-scroll"><img src="/img/lettering/${file}" width="${w / 2}" height="${h / 2}" alt="${esc(alt)}"></div>
  ${caption ? `<figcaption class="note">${caption}</figcaption>` : ""}
</figure>`;

const GROUP = "Pixel games";

export function pixelPages() {
  const out = [];

  /* Pixels ---------------------------------------------------------- */
  out.push({
    path: "/pixel",
    group: GROUP,
    nav: "Pixels",
    title: "Pixels",
    description: "The pixel rules behind Four Horsemen and Smuggle Brawlers: one pixel size, whole-number scaling, art kept as data.",
    body: `
${head(
  "Pixels",
  `I've made 2 pixel-art games. Four Horsemen came first, and Smuggle Brawlers copied its loop, screen, font, input and feel code and kept going. These pages are what the 2 ended up doing, with links to the code, so the next one starts here. None of it is tokens or components: the games draw on a canvas.`,
)}
${section(
  "One pixel size",
  `<p>Every pixel is the same size on screen: on every character, on the stage and on the select screen. A taller character has more pixels. Monday is 19 pixels high and the biggest boss is 111, and they stand on the same floor at the same pixel size.</p>
<p>The heights live in ${hp("src/art/sizes.ts", "15-47")}. A test checks each character's first pose is exactly that tall, and another checks the table matches <code>docs/characters.md</code> (${hp("src/art/sizes.test.ts", "14-39")}). ${hp("src/art/art.test.ts", "22-36")} checks every grid is rectangular, uses only that character's own palette, and that all their poses share one box.</p>`,
)}
${section(
  "Bigger characters",
  `<p>When a character needs to be taller than I drew them, they're made bigger once, offline, by <code>scripts/make-big.ts</code>, and the result is saved as art in <code>src/art/big/</code>. Nothing is upscaled while the game runs.</p>
<p>The script (${hp("src/art/scale.ts", "1-13")}) runs Scale3x, or Scale2x when the factor is exactly 2, so diagonals stay diagonals. Then it shrinks to the height asked for, giving each new pixel the colour that covers most of it, and the darker one on a tie so outlines don't thin out. No new colours are made. It refuses anything under 1 or over 3 times (${hp("src/art/scale.ts", "180-191")}).</p>
<p>The 2 biggest bosses are past 3 times, so every pixel of theirs is a 3 by 3 block, and then the thin lines and long diagonal edges are tidied by hand. The files in <code>src/art/big/</code> are real art after that, and running the script again writes over them.</p>`,
)}
${section(
  "Nothing smoothed",
  `<p>Every canvas context has <code>imageSmoothingEnabled = false</code>, and every canvas on the page has <code>image-rendering: pixelated</code>. Nothing is drawn at a fraction of a pixel, rotated, blended or faded. When something goes away it loses pixels a few at a time.</p>
${code(`// src/fight/draw.ts
// one art pixel to one game pixel. Nothing is scaled by a fraction,
// smoothed or blended.`)}
<p>${hp("src/fight/pixels.test.ts")} holds the fight to that: a knocked-down figure has the same pixels moved, the hit flash is the same figure in white and nothing else, and a figure going out drops pixels in the same scattered order every time.</p>`,
)}
${section(
  "Art as data",
  `<p>In Four Horsemen the art is in the code as letter grids, one letter per pixel, so it can be edited, diffed and tested like anything else. The README puts it as "Art is all data: character grids and generated shapes, not image files."</p>
${code(`"..............BSSSD..............",
".............LSBBBSS.............",`)}
<p>${four("src/builder/raster.ts")} paints those grids into a plain RGBA buffer, so the preview and the saved PNG are the same pixels and tests can look at them without a browser. ${four("src/builder/svg.ts")} writes one viewBox unit per pixel. ${four("src/builder/oldPicture.test.ts")} hashes each picture's rows and fails if one changes, so a change to a hairstyle has to be on purpose.</p>
<p>Smuggle Brawlers was drawn in Figma first. Each Figma pixel is a 40 by 40 square, and the art was pulled into the same kind of grids so it could be tested the same way.</p>`,
)}`,
  });

  /* Loop and screen ------------------------------------------------- */
  out.push({
    path: "/pixel/loop",
    group: GROUP,
    nav: "Loop and screen",
    title: "Loop and screen",
    description: "A fixed 60 Hz tick, drawing between ticks, whole-number scaling to any screen and the pixel font.",
    body: `
${head("Loop and screen", "The game ticks 60 times a second whatever the screen does, and every game pixel covers a whole number of device pixels.")}
${section(
  "A fixed 60 Hz tick",
  `<p>A 120 Hz screen draws 2 frames per tick, and a slow frame runs 2 ticks to catch up. After a stall, like a hidden tab, it runs 5 ticks at most rather than every one it missed. Drawing is handed how far into the next tick it is.</p>
${code(`export const STEP_MS = 1000 / 60;
export const MAX_STEPS_PER_FRAME = 5;

advance(now: number): number {
  if (this.last === null) this.last = now;
  this.accumulator += Math.min(now - this.last, MAX_STEPS_PER_FRAME * STEP_MS);
  this.last = now;
  while (this.accumulator >= STEP_MS) {
    this.step();
    this.accumulator -= STEP_MS;
  }
  return this.accumulator / STEP_MS;
}`)}
<p>That's ${hp("src/loop.ts")}. Four Horsemen has the same numbers inline in ${four("src/main.ts", "146-147")}, and opens the pause window if the tab is hidden during a fight (${four("src/main.ts", "500-506")}).</p>`,
)}
${section(
  "Drawing between ticks",
  `<p>Before each tick the smoother records where everything is. To draw, it moves things part of the way to where they're going, draws, then puts the real positions back, so the game itself only ever reads real ones (${hp("src/interp.ts")}, ${hp("src/play.ts", "254-314")}). Rounding to whole pixels happens when drawing, so the art stays crisp.</p>
${code(`this.smoother.apply([this.mover()], alpha);
try {
  // draw the stage and everyone on it
} finally {
  this.smoother.restore();
}`)}
<p>Anything that moves more than 24 pixels in a tick has teleported and is drawn where it landed. In Four Horsemen the limits are 10 for a fighter, 16 for a shot and 80 for the camera, and a fighter going down isn't blended because it's a different body in the same place (${four("src/interp.ts", "27-30")}).</p>
<p>In Smuggle Brawlers only the sandbox draws between ticks. The fight and the flight draw tick positions (${hp("src/main.ts", "427-431")}).</p>`,
)}
${section(
  "Any screen",
  `<p>${hp("src/view.ts")} picks how many device pixels one game pixel covers, then takes the width and height from whatever room there is. The number is always whole, so every game pixel is the same size on the glass. It aims for 3 CSS pixels a game pixel and keeps the stage between 150 and 360 game pixels wide.</p>
${code(`let px = Math.round(TARGET_SCALE * dpr);
px = Math.max(px, Math.ceil(devW / MAX_W));
px = Math.min(px, Math.floor(devW / MIN_W), Math.floor(devH / MIN_H));
px = Math.max(1, px);
const scale = px / dpr;
const w = Math.ceil(devW / px);`)}
<p>There's no letterbox. The canvas runs a pixel or two past the edge rather than leave a gap, and the floor moves up so nobody stands behind a touch button. Four Horsemen's first version used 2.6 CSS pixels (7.8 device pixels) and the art went uneven, which is why this works in device pixels (${four("src/view.ts", "8-13")}).</p>`,
)}
${section(
  "The interface's own grid",
  `<p>On a phone with a 3x screen the stage is 168 by 362, so a game pixel is 7 device pixels. At that size a 44px button would be 19 game pixels across. So the interface draws on its own grid over the game: 3 CSS pixels a UI pixel on a phone and 4 on a screen with room, each a whole number of device pixels (${hp("src/ui/scale.ts")}). On a short screen on its side the fight's controls drop to 2 so the stage stays clear.</p>
<p>The grid reaches CSS as <code>--u</code>, so a window border, a stepped corner or a button is a whole number of UI pixels. There's no CSS radius and no blur in the interface.</p>`,
)}
${section(
  "The pixel font",
  `<p>${hp("src/font.ts")} is 3 by 5, capitals only, drawn with one <code>fillRect</code> per pixel because canvas text at that size comes out blurry and off the grid. M, W and N are 5 wide: at 3, N made "MINTY" read as "MISTY" on the HUD. A character the font doesn't have leaves a gap.</p>
<p>It's for buttons, titles, names and numbers, at 2 times or bigger, and 3 times on a phone. Anything longer is set in Patrick Hand at 12px or more, from a file in the repo with its licence. A label drawn on a canvas gets an <code>aria-label</code>, because a screen reader can't read a canvas (${four("src/ui/pixelText.ts", "34-36")}).</p>
<p>The big words, like the logo, PAUSED and YOU WIN, have a typeface of their own. That's <a class="ob-link" href="/pixel/lettering">the lettering case study</a>.</p>`,
)}`,
  });

  /* Effects --------------------------------------------------------- */
  const sets = [
    ["spark-s", "16 by 16", 7, 2],
    ["spark-l", "24 by 24", 7, 2],
    ["puff-s", "18 by 18", 7, 3],
    ["puff-l", "24 by 24", 7, 3],
    ["blast-s", "24 by 24", 7, 3],
    ["blast-l", "36 by 36", 7, 3],
    ["flame", "22 by 22", 7, 3],
    ["flame-l", "32 by 32", 7, 3],
    ["nuke", "33 by 40", 8, 4],
    ["ground", "37 by 27", 7, 4],
    ["bloom", "22 by 24", 6, 3],
    ["star", "36 by 36", 7, 3],
    ["star-l", "54 by 54", 7, 3],
    ["comet", "18 by 18", 3, 2],
    ["fireball", "18 by 41", 3, 2],
    ["streak", "47 by 17", 12, 2],
    ["streak-s", "36 by 13", 12, 2],
    ["dome", "29 by 17", 14, 2],
    ["dome-l", "43 by 31", 14, 2],
    ["bolt", "27 by 44", 11, 2],
  ];
  out.push({
    path: "/pixel/effects",
    group: GROUP,
    nav: "Effects",
    title: "Effects",
    description: "One library of hard-edged pixel effects any screen can spawn, with a calm version of each.",
    body: `
${head("Effects", "Sparks, puffs, explosions, flames and Monday's crackle all come from one library, so the fight, the flight and the cutscene use the same ones.")}
${section(
  "One library",
  `<p>${hp("src/fx/library.ts")} has every effect, and ${hp("src/fx/screen.ts")} is how a screen uses them. A screen makes one <code>ScreenFx</code>, calls <code>step()</code> once a tick and <code>draw()</code> once a frame, and spawns effects by name. This is the flight blowing up a ship:</p>
${code(`readonly fx = new ScreenFx("#3a0a2a");

this.fx.spawn(size < 26 ? "blast-s" : "blast-l", x, y, { theme });
this.fx.spawn("puff-s", x, y - 2, { theme: "smoke", delay: 4 });`)}
<p>The colour passed in draws a 1 pixel outline round each frame. A spawn can also have a delay, a flip, a speed and gravity, which is how comets arc. The fight wraps the same effects as one more kind of particle (${hp("src/fight/fx.ts", "90")}).</p>`,
)}
${section(
  "Redrawn from my sheets",
  `<p>The sparks, puffs, explosions, flames, comets and fireballs come from 2 explosion sheets I drew, and the crackle from a line animation. They were resampled onto the game's pixel grid into ${hp("src/fx/data.ts")}, which is generated and says not to edit it by hand.</p>
<p>Each frame is drawn once onto a small canvas and kept, keyed by set, colours, frame and calm, so drawing an effect is one <code>drawImage</code>.</p>
${table(
  ["Set", "Size", "Frames", "Ticks a frame"],
  sets.map(([n, s, f, t]) => [`<code>${n}</code>`, s, f, t]),
)}
<p>Most have 7 frames, as the sheets do. A test pins those counts, and allows 3 to 14 for anything new (${hp("src/fx/library.test.ts", "9-48")}). An effect lives for its frames times its ticks a frame.</p>`,
)}
${section(
  "Small palettes, hard edges",
  `<p>An effect's frames are stored as shades 0 to 5, bright to dark, plus 3 fixed colours: yellow, orange and red. A theme turns the shades into colours, and there are 5 themes of 6 colours each: hot, smoke, crystal, goo and debris. A test checks the frames use nothing else (${hp("src/fx/library.test.ts", "25-31")}).</p>
<p>The fight's own particles are the same idea: 3 or 4 colours each, whole pixels, nothing see-through (${hp("src/fight/fx.ts", "1-6")}). Glows are bands. The outfit glow is 7 solid bands stepping out from the figure, with no dither (${hp("src/outfitFx.ts", "1-20")}).</p>
<p>Where colours do blend, it's a fixed Bayer pattern: 4 by 4 in the sky and the lettering, 8 by 8 mixed with grain in the stage painter (${hp("src/ui/sky.ts", "8")}, ${hp("src/stages/paint.ts", "84-92")}).</p>
${code(`const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];`)}`,
)}
${section(
  "Going out",
  `<p>Nothing fades by opacity. A particle checks each pixel against how far through its life it is, using a hash of the pixel's position, so a puff goes out a pixel at a time and the same pixels always go first (${hp("src/fight/fx.ts", "160-165")}).</p>
${code(`export function pixelAlive(px: number, py: number, progress: number): boolean {
  const n = Math.imul(px + 7, 73856093) ^ Math.imul(py + 13, 19349663);
  const t = ((n >>> 0) % 1000) / 1000;
  return t >= progress;
}`)}
<p>A single picture, like the nuke, shows whole for 2 frames then dissolves the same way. A beaten enemy goes out in 12 steps (${hp("src/fight/pixels.ts", "47-52")}).</p>`,
)}
${section(
  "Calm",
  `<p>Calm is on when the device asks for reduced motion or the player turns it on. Every set says what a calm player gets instead (${hp("src/fx/library.ts", "145-162")}):</p>
${table(
  ["Effect", "With calm on"],
  [
    ["Big spark, star, small bloom", "Small spark or small puff"],
    ["Blast", "Puff"],
    ["Nuke, ground burst", "Big puff"],
    ["Flame, comet, fireball", "Nothing"],
    ["Brightest shade", "The next one down, so there's no white flash"],
    ["Crackle", "2 colours, at half the rate"],
  ],
)}
<p>The goo that covers the screen is shorter with calm on: 8 ticks to charge instead of 36, and 20 to hold instead of 110, with no shudder (${hp("src/goo.ts", "56-58")}).</p>`,
)}
${section(
  "Particles and randomness",
  `<p>The flight's renderer has its own random numbers, separate from the flight's game logic, so a spark drawn or skipped can't change what happens next (${hp("src/flight/draw.ts", "103")}). The library's dissolves use hashes, so they don't need random numbers at all.</p>
<p>The fight's sparks and dust still take the world's seeded generator, the same one the bots and cooldowns use (${hp("src/fight/world.ts", "157")}). Four Horsemen's <code>burst()</code> takes the generator as an argument for this reason, "for anything that mustn't disturb the dice the fight is using" (${four("src/particles.ts", "255-258")}). The flight is the one to copy.</p>`,
)}`,
  });

  /* Motion and hits ------------------------------------------------- */
  const hits = [
    ["Beaten", "7 (117ms), boss 12", "3, boss 5"],
    ["Knocked down", "5 (83ms)", "2"],
    ["Heavy stagger", "4 (67ms)", "2"],
    ["Stagger", "2 (33ms)", "1"],
    ["Armoured", "2", "1"],
  ];
  const buzz = [
    ["tap", "8"],
    ["punch", "16"],
    ["kick", "26"],
    ["hit", "14"],
    ["damage", "40"],
    ["ko", "60, 40, 90"],
    ["boss", "40, 50, 40, 50, 100"],
  ];
  out.push({
    path: "/pixel/motion",
    group: GROUP,
    nav: "Motion and hits",
    title: "Motion and hits",
    description: "Whole poses moved by whole pixels, walking by distance, and the hit stop, shake, buzz and sound behind each hit.",
    body: `
${head("Motion and hits", "Characters are my drawn poses, copied 1 art pixel to 1 game pixel. Everything that moves them moves them by whole pixels.")}
${section(
  "Standing still",
  `<p>Everyone stands still. The bob everyone had, a weight shift, a lean, a float and the hop when walking were all taken out, and anything new has to be small. What's left is added over the picture a pixel at a time: blinks of a tenth of a second every 4 to 7 seconds, drips, glints and a glowing eye (${hp("src/idle.ts")}). A test checks an idle frame only adds things and never moves a body (${hp("src/idle.test.ts", "32")}).</p>
<p>Moving parts like a tail or a flag rest as drawn and move for under a second every 3 to 6 seconds, each on its own phase so they don't move together. A test checks every step lasts at least 6 ticks, so nothing shows for 1 frame (${hp("src/parts.test.ts", "91-104")}).</p>`,
)}
${section(
  "Lean, lunge and flinch",
  `<p>An attack moves the whole figure by a few pixels. It steps back 1 pixel partway through a long wind-up (2 for a big lunge), jumps forward by the move's lunge while it's active, holds half the lunge for the first third of the recovery, then comes back. A hurt figure sits 1 pixel back.</p>
${code(`if (f.state === "hurt") return -1;
if (f.t <= wind) {
  if (wind < 8) return 0;
  if (m.lunge >= 6 && f.t > wind * 0.6) return -2;
  return f.t > wind * 0.4 ? -1 : 0;
}
if (into <= m.active) return m.lunge;
return into <= m.active + Math.ceil(m.recovery / 3) ? Math.round(m.lunge / 2) : 0;`)}
<p>That's <code>lungeOf</code> in ${hp("src/fight/draw.ts", "39-53")}. The halfway hold is the easing. The attack pose stays up for half the recovery after the hit frames, so it doesn't pop in and out (${hp("src/fight/draw.ts", "58-66")}). A move's lunge is 2 pixels by default and 4 or 5 for a heavy one.</p>`,
)}
${section(
  "Walking",
  `<p>A walk is 4 frames: stride, one leg up, stride, the other leg up. Only the legs move, each as a block swinging from the hip, so the top row barely moves and the foot moves most. Nothing above the legs is touched and nobody bounces (${hp("src/art/walkgen.ts", "142-164")}).</p>
<p>The frame comes from how far the character has walked, so the feet keep pace with the ground and don't slide. Stopping resets it, so a standing character always shows the standing pose, and pushing against the edge of the stage doesn't count as walking (${hp("src/player.ts", "31-60")}).</p>
${code(`frame = Math.floor(dist / stride) % 4;
stride = clamp(Math.round(height / 2), 6, 16);`)}`,
)}
${section(
  "Reach",
  `<p>Limbs don't stretch for a hit, because the poses are drawn and fixed. A swoosh sells the reach instead: a small arc drawn as a pixel string, with a dark edge so it shows against the white hit flash too. It appears on the first active tick, halfway along the move's reach, and lasts 5 ticks (${hp("src/fight/fx.ts", "50-57")}).</p>
${code(`small: ["##...", "..#..", "...#.", "...#o", "...#o", "...#.", "..#..", "##..."],
low:   ["..........##", ".......###o.", "....###.....", "..##........", "##.........."],`)}`,
)}
${section(
  "Going down",
  `<p>A knocked-down fighter flies in their standing pose, then on landing every pixel is turned a quarter round onto their back. Every pixel is moved and none is made up (${hp("src/fight/pixels.ts", "26-45")}). The landing kicks up 6 specks of dust. They lie there for 46 ticks, and a hero who gets up blinks every 4 ticks while they can't be hit.</p>
<p>A floating character moves 1 pixel at a time and holds each height for 4.5 seconds. A test checks it never jumps more than 1 pixel (${hp("src/hover.test.ts", "16-29")}).</p>`,
)}
${section(
  "Hit stop and shake",
  `<p>A hit freezes the whole fight for a few ticks, and the struck figure is drawn white for the freeze and a couple of ticks after. A bigger hit freezes longer and shakes harder. The biggest of the 2 wins, so hits landing together don't add up (${hp("src/fight/world.ts", "617-640")}).</p>
${table(["Hit", "Freeze, in ticks", "Shake, in pixels"], hits)}
${code(`export function shakeOffset(amount: number, ticks: number, shake: boolean, calm: boolean): [number, number] {
  if (!shake || calm || amount <= 0) return [0, 0];
  const a = Math.min(amount, 3);
  return [ticks % 2 === 0 ? a : -a, ticks % 3 === 0 ? Math.min(1, a) : 0];
}`)}
<p>Shake is 3 pixels at most across and 1 up and down, and it's off when Shake is switched off or calm is on (${hp("src/fight/draw.ts", "283-289")}). The white flash goes with calm too. Knockback is the move's knock as speed, slowed by friction of 0.84 on the ground and 0.97 in the air.</p>`,
)}
${section(
  "Buzz and sound",
  `<p>Haptics have a named pattern for each thing that happens, in milliseconds (${hp("src/ui/haptics.ts", "33-51")}). Android vibrates. An iPhone can't, so a hidden switch is clicked through its label for 1 to 3 system ticks. A test checks a tap is lighter than a punch, a punch lighter than a kick, and nothing runs over 400ms.</p>
${table(["Pattern", "Milliseconds"], buzz.map(([n, v]) => [`<code>${n}</code>`, v]))}
<p>Every sound is made in Web Audio, with no files to load (${hp("src/ui/audio.ts", "1-7")}). A punch is a burst of filtered noise for the crack and a falling sine for the thump, with its pitch nudged a little each time. Music and effects have separate switches.</p>`,
)}`,
  });

  /* Accessibility --------------------------------------------------- */
  out.push({
    path: "/pixel/access",
    group: GROUP,
    nav: "Accessibility",
    title: "Accessibility in the games",
    description: "Touch targets, the d-pad, calm, dialogs, screen reader lines and controls text worked out from the key tables.",
    body: `
${head("Accessibility in the games", "Smuggle Brawlers started from the UI rules in an audit of Four Horsemen and added the rest as it went.")}
${section(
  "Touch targets",
  `<p>Nothing to tap is under 44 CSS pixels. Because the interface is drawn on its own pixel grid, a button's size is worked out in UI pixels from that: <code>Math.ceil(44 / cssPerUiPixel)</code> (${hp("src/ui/scale.ts", "12")}). Tests check every control button, every select tile and the pause button come out at 44 or more on every screen (${hp("src/ui/deck.test.ts", "22")}, ${hp("src/select.test.ts", "74")}).</p>`,
)}
${section(
  "One d-pad",
  `<p>The d-pad is one touch zone. Where the finger is from its middle says which way to walk, so a thumb can slide round and take in the diagonals without lifting. The middle 20% does nothing. Within 30 degrees of sideways is plain left or right, and diagonals get the narrower slice because walking is mostly sideways (${hp("src/ui/dpad.ts")}).</p>
${code(`if (Math.hypot(dx, dy) < half * PAD_DEAD) return [];
const away = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI;
if (away < 90 - PAD_SIDE_DEG) out.push(dx < 0 ? "left" : "right");
if (away > PAD_SIDE_DEG) out.push(dy < 0 ? "up" : "down");`)}
<p>The pad captures the pointer and the newest finger wins, so a lift the browser missed can't leave it stuck. It lets go on cancel, on losing capture and when the window loses focus. Touch, keys and a gamepad all feed the same controller.</p>`,
)}
${section(
  "Calm",
  `<p>The Calm switch is off by default, and a device set to reduce motion counts as calm without it (${hp("src/stages/kit.ts", "22-34")}). It sets <code>data-calm</code> on the page, which stops every CSS animation and transition, and the game reads it every frame. Calm takes out the shake, the white hit flash, moving parts and the hover, and swaps effects for gentler ones. Cutscenes don't flash or shake.</p>
<p>Each switch keeps one name and puts its state in <code>aria-pressed</code>, so a screen reader says "Music, pressed" rather than a new name each time (${hp("src/ui/switches.ts", "1-4")}).</p>`,
)}
${section(
  "Windows",
  `<p>Pause, leave, win, game over and Controls all open through one dialog (${hp("src/ui/dialog.ts")}). Everything behind it is made <code>inert</code>, Tab wraps inside it, and the close box and Esc both go back. On close, focus returns to whatever opened it if that's still there. With a window up, only Esc and P reach the game, so Space presses the focused button (${hp("src/ui/keyGuard.ts")}). Anything that ends a run asks first.</p>`,
)}
${section(
  "What a screen reader hears",
  `<p>Two hidden live regions sit outside the screens, so a window making the screen inert doesn't silence them. The fight says "Wave 2 of 3.", who's taken over, "Special ready.", when health is low (once, until it's back over half) and who's down. Hits aren't said, because there'd be no end to them (${hp("src/fight/announce.ts")}).</p>
<p>Lines are at least 1.2 seconds apart, the same line isn't repeated within 6 seconds, and anything waiting more than 5 seconds is dropped (${hp("src/ui/announce.ts", "32-35")}).</p>`,
)}
${section(
  "Controls text",
  `<p>The keyboard and gamepad lines on the Controls window are worked out from the same tables the game reads, so they can't drift from what the keys do (${hp("src/controlsText.ts", "1-4")}). Tests check every key in the tables is named and the text follows a key if it moves. The key guide under the fight lights up from the same codes while a key is held, and the picture of it is hidden from screen readers with a line of text in its place.</p>`,
)}
${section(
  "Nothing jumps",
  `<p>On the select screen every tile is the same square, with room for the longest name. The preview box is sized once, for the tallest and widest character, so it doesn't change size as you move between them, and a short character is drawn at twice the size only where they fit (${hp("src/selectLayout.ts", "87-118")}). The blurb box is a fixed number of lines and scrolls inside, and the outfit hint has a line of its own.</p>
<p>Research on the select flow found it still changed size when you picked an outfit of a different height. The rule from that is one preview box for every fighter and outfit for the whole flow, sized for the biggest outfit with hats, and measured fit points from the feet so a tall hat doesn't move anything (${at(HP_SELECT, "docs/select-flow.md", "90-152")}).</p>`,
)}
${section(
  "Cutscenes",
  `<p>Every cutscene says how to skip it. Space, Enter and Esc skip, and so does the Skip button. A tap anywhere skips on a touch screen, but a mouse click doesn't, so a stray click can't (${hp("src/cutscene/host.ts", "36-66")}).</p>`,
)}`,
  });

  /* Discord --------------------------------------------------------- */
  out.push({
    path: "/pixel/discord",
    group: GROUP,
    nav: "Discord",
    title: "Discord Activity",
    description: "How Smuggle Brawlers holds itself and shows a small card when Discord shrinks it.",
    body: `
${head("Discord Activity", "Smuggle Brawlers runs inside Discord as an Activity. Discord can shrink it to picture in picture or a tile in a grid, and the game has to cope.")}
${section(
  "Knowing it's in Discord",
  `<p>The game knows it's in Discord from <code>frame_id</code> in the address, and only then loads Discord's SDK (${hp("src/discord.ts", "9-11")}). It listens for layout changes: full, picture in picture or grid. Signing in only asks for a name, and if any of it fails the game carries on without one.</p>`,
)}
${section(
  "The small view",
  `<p>When Discord says picture in picture or grid, or the frame is under 480 by 300, the game goes small (${hp("src/mini.ts", "9-52")}). The fight, the flight and the take-off hold, and the screen is replaced by a card: the sky, the logo, the fighter you're playing (or Monday and Sunday on the menu) and one line saying what's going on, like WAVE 2 OF 3, PAUSED or PICKING A FIGHTER. Back at full size it shows the pause window, unless a window was already up or the run is over.</p>
<p>The card has its own whole-number pixel grid, twinkles that stop with calm on, and only redraws when what it shows changes (${hp("src/ui/miniCard.ts", "67-100")}).</p>`,
)}
${section(
  "Fixed boxes",
  `<p>Discord's picture in picture is about 320 by 180 to 400 by 225, and a grid tile is a bit bigger. <code>planMini</code> lays the card out for a box that size: the logo at the biggest whole scale that fits the width and half the height, on 1 line if that's as big as 2, sprites in up to about 42% of the height, and the status at 1, 2 or 3 times. A test lays it out in 320 by 180, 400 by 225, 480 by 270, 480 by 300 and 640 by 360, and checks every scale is whole, everything fits and nothing overlaps (${hp("src/mini.test.ts", "150-180")}).</p>`,
)}`,
  });

  /* Lettering case study -------------------------------------------- */
  out.push({
    path: "/pixel/lettering",
    group: GROUP,
    nav: "Lettering case study",
    title: "The Smuggle Brawlers lettering",
    description: "How the Smuggle Brawlers logo went from blobs on a 5 by 7 grid to a pixel typeface built from shared parts.",
    body: `
${head(
  "The Smuggle Brawlers lettering",
  "The big words in Smuggle Brawlers (the logo, PAUSED, CONTROLS, WAVE 2, YOU WIN and the combo number) are set in one pixel typeface. The first version was blobs on a grid, and up close the edges were ragged and letters that should match didn't. So I asked for research into arcade lettering and had it rebuilt from shared parts.",
)}
${pic("new-logo.png", 876, 156, "SMUGGLE BRAWLERS in pink pixel capitals with a dark outline and a soft pink glow. The strokes are even and every letter sits on the same baseline.", "The logo now, at 4 times")}
${section(
  "The first version",
  `<p>Each letter was a 5 by 7 grid. Every filled cell became a round blob 3 pixels across, laid 2 pixels apart so neighbours overlapped and joined. Each letter was then nudged up or down a pixel in a fixed pattern so the line bounced.</p>
${pic("old-logo.png", 876, 156, "The old SMUGGLE BRAWLERS logo. Edges are scalloped, the counters of B and R are thin slits and the letters sit at different heights.", "The logo before, at 4 times")}
<p>Up close, that gave these faults:</p>
<ul class="pixel-list">
  <li>Every edge was scalloped. The bump of each blob stuck out and the gap between 2 blobs dipped in, so diagonals and bottoms looked ragged.</li>
  <li>The holes in B, A, D, O and 8 were 1 pixel wide, so they filled in with outline and read as scratches.</li>
  <li>R's leg was one blob stepping off the middle of the bowl, so it joined at a point and pinched. The bowl was a different shape from B's and P's.</li>
  <li>W wasn't M upside down. Its middle peak was 1 blob wide, stopped at the 4th row, then ran down into a notch.</li>
  <li>N, K, V, X, Y and Z each stepped their diagonals differently, some 1 across for 1 down and some 2, sometimes both in one letter.</li>
  <li>S started its top bar 1 cell in, G had a hole in its bar, and Q's tail was a loose blob.</li>
  <li>The bounce meant the baseline wandered across a word.</li>
</ul>
${pic("old-shapes.png", 592, 588, "The old alphabet and numbers with the shading taken off, in cream on dark purple. The blobs give every stroke a bumpy edge and the letters sit at different heights.", "The old letters with the shading taken off")}`,
)}
${section(
  "Research",
  `<p>Before anything was redrawn I asked for research into how arcade games letter their titles. Most of what turned up was from pixel art and type design guides. A diagonal only reads as smooth when its steps are even, and the clean slopes are 1:1, 1:2 and 2:1. Font hinting snaps stems to a few standard widths so the ones that should match always match. A pixel face needs a plan for diagonals, because 1 pixel stems leave gaps in them. Bitmap faces get their spacing from whole-pixel sidebearings, and most pixel font makers skip kerning except for punctuation. Arcade logos like Street Fighter's are a clean letter shape first, with the colour, rims and shadow laid over it.</p>
<p>I couldn't find anything written on the Bubble Bobble, Final Fight, Metal Slug, Kirby or Mega Man title lettering, so none of it leans on those. The full list of sources is in <code>docs/lettering.md</code> in the game.</p>`,
)}
${section(
  "The rules",
  `<p>The new letters are built from a few parts, in ${hp("src/ui/typeface.ts")}:</p>
<ol class="pixel-list">
  <li>One stroke width. Every stem, bar and diagonal is 3 pixels thick.</li>
  <li>Fixed rows. The cap height is 15. Top bars are rows 0 to 2, middle bars 6 to 8 and bottom bars 12 to 14, so B, 8 and 3 have 2 holes of exactly 5 by 3, and E, F, H and A line up with them.</li>
  <li>One corner. Where 2 strokes meet, the corner loses 2 pixels off the first row and 1 off the second. Free ends stay square, because cutting a 3 pixel end down leaves a 1 pixel spike.</li>
  <li>One diagonal. Every diagonal steps 1 pixel across for 2 down, in A, K, M, N, Q, R, V, W, X, Y, Z, 1, 7 and the slash.</li>
  <li>Shared parts. B, P and R share one bowl, and D is that bowl full height. W is M upside down. 9 is 6 turned round. K, Q, R and X share one leg.</li>
  <li>No stray pixels and no 1 pixel runs. Every pixel touches another, and every run in a row is at least 2 long.</li>
  <li>Open where the letter opens. C, G, S, 2, 3 and 5 keep their gap. Closing it turned S into 8.</li>
  <li>Even spacing. Letters sit 2 pixels apart and a space is 6. There's no kerning.</li>
</ol>
<p>The shared parts are shared in the code too, so fixing one fixes the others:</p>
${code(`/** B, D, P, R and 3 all grow from these. */
function bowlTop(g: Draw, x0: number, x1: number, left: boolean): void {
  g.ring(x0, 0, x1, 8, { tl: left, tr: true, bl: left, br: true });
}

W: () => build.M!().flipV(),
"9": () => build["6"]!().flipV().flipH(),`)}
${pic("new-shapes.png", 584, 588, "The new alphabet and numbers with the shading taken off, in cream on dark purple. Strokes are a flat 3 pixels, corners are cut the same way and every letter sits on one baseline.", "The new letters with the shading taken off")}`,
)}
${section(
  "What goes on top",
  `<p>The shading didn't change. The shapes are a flat on and off mask, and ${hp("src/ui/bubble.ts")} works everything else out from it: 4 bands of the style's colour dithered into each other with a 4 by 4 Bayer pattern, a white rim on pixels with nothing above them and a deeper one on pixels with nothing below, a few white specks on the top half, a 1 pixel dark outline and a 3 pixel glow. The bob and the sparkle move whole letters and leave the shapes alone. A new letter only needs its shape.</p>
${pic("old-alphabet.png", 592, 588, "The old alphabet and numbers fully shaded in pink with outline and glow. The bumpy edges and wandering baseline show through the shading.", "Before")}
${pic("new-alphabet.png", 584, 588, "The new alphabet and numbers fully shaded in pink with outline and glow. Edges are clean and every letter sits on one line.", "After")}`,
)}
${section(
  "Same size",
  `<p>Most letters are 11 wide. E, F, I, J, L and 0 are 9, and M and W are 15. SMUGGLE BRAWLERS comes out at 207 pixels wide, the same as before, and the same 15 pixels tall, so the logo fits where it did at the same sizes and nothing around it moved. A test checks it still sets on 1 line at 2 times in the space it had.</p>
<p>Other tests check every glyph is on the 15 row grid, sits on the baseline, keeps to a few standard widths, has no stray pixels or 1 pixel runs, and that B, P and R share a bowl, M and W share a shape, and 6 and 9 share a shape (${hp("src/ui/typeface.test.ts")}).</p>
<p>It went into the game on 20 October 2026, in <a class="ob-link" href="${TYPE_COMMIT}">795d456</a>. The pictures here were drawn from the game's own code at that commit and the one before it.</p>`,
)}`,
  });

  return out;
}
