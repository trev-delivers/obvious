/**
 * The Smuggle Brawlers case study. Facts are checked against the game's repo
 * at 21a7569 and the live build. Anything marked .fill is waiting on Trev.
 */
import { esc, section, table } from "./html.mjs";

const PLAY = "https://holy-pixels.vercel.app";

/** A screenshot from the live game. Desktop shots are 1280 wide and shown at
 * half, phone shots are taken at 2x and shown at half, so both land on whole
 * device pixels on a 2x screen. */
const shot = (file, w, h, alt, caption) => `<figure class="pixel-fig">
  <div class="pixel-fig-scroll"><img src="/img/smuggle/${file}" width="${w / 2}" height="${h / 2}" alt="${esc(alt)}"></div>
  ${caption ? `<figcaption class="note">${caption}</figcaption>` : ""}
</figure>`;

/** Something only Trev can answer. Shown on the page until he does. */
const fill = (text) => `<mark class="fill">[${text}]</mark>`;

const outfits = [
  ["Skater", "Win a fight as Monday"],
  ["Captain", "Use Monday 5000 five times"],
  ["Enlightened", "Win a fight as Monday with nobody knocked out"],
  ["Pirate", "Win a fight as Sunday"],
  ["Champ", "Score 600 in a flight"],
];

export function smugglePage() {
  return {
    path: "/pixel/smuggle-brawlers",
    group: "Pixel games",
    nav: "Smuggle Brawlers",
    title: "Smuggle Brawlers",
    description: "A pixel-art beat 'em up made from my pixel art of Jesse Moynihan's Jesus 2. It plays in a browser and inside Jesse's Discord server.",
    body: `
<header class="page-head"><h1>Smuggle Brawlers</h1><p class="lead">A pixel-art beat 'em up made from my own pixel art of Jesse Moynihan's <i>Jesus 2</i>. It plays in a browser and as a Discord Activity inside Jesse's server.</p></header>
<p><a class="ob-link ob-link--strong" href="${PLAY}">Play Smuggle Brawlers</a></p>
${shot("menu-desktop.png", 1280, 720, "The Smuggle Brawlers title screen: the pink pixel logo, DESIGNED BY TREV, a card saying You fight as Monday, Fight, Fly, Sandbox and Settings buttons, and a green comet with a little figure riding it.", "The menu on a laptop")}
${section(
  "Where it started",
  `<p>Jesse Moynihan is an American artist and animator. He wrote and storyboarded on <i>Adventure Time</i>, and <i>Jesus 2</i> is his own: a short film, and a deck for a series, about 2 brothers called Monday and Sunday.</p>
<p>I'm a fan, so I drew his characters as pixel art for an NFT collection called Holy Pixels, minted on Cardano through NMKR. I did it to back an independent artist I like, to use my own art and design skills on something of his, and to try Web3 for myself. ${fill("FILL IN: when it started, how many pieces, and whether they sold")}</p>
<p>The art is in 2 Figma files: 31 characters, most with 3 or 4 poses and a gold version, every pixel drawn as a 40 by 40 square.</p>`,
)}
${section(
  "From Figma to a game",
  `<p>It's my second pixel-art game. The first was <a class="ob-link" href="https://4hm-the-game.vercel.app">4HM</a> (Four Horsemen), a side-scrolling brawler with the 4 of us as the horsemen. Smuggle Brawlers took its loop, its screen scaling and its pixel font, and went from there.</p>
<p>The characters are read straight out of my Figma drawings by a script, so what you play is my pixels and nothing is redrawn. Every pixel is the same size on screen. A tall character gets more pixels instead of bigger ones, and nothing is smoothed or blended. The rules are written up in <a class="ob-link" href="/pixel">Pixels</a>.</p>
<p>It was built between 13 and 20 October 2026: 201 commits and 46 merged pull requests. It's TypeScript and Vite on Vercel. Before anything goes live it has to pass 1,245 automated tests and a browser test that plays 80 journeys through every screen at 4 sizes, from a phone to the Discord window.</p>
<p>${fill("DECIDE: how to say who wrote the code. Suggested: I directed AI coding agents (Claude). I set the brief, did the art and design, sent work back when it wasn't right, and approved every release.")}</p>`,
)}
${section(
  "2 brothers, 2 ways to fight",
  `<p>The fighting styles come from Jesse's own series deck. Sunday "celebrates violence as his #1 problem solving tool", so he punches and kicks. Monday fights with his mind: he grips, slams and pushes from a distance, and has an astral kick. You can swap brothers mid-fight by tapping the other one at the top of the screen.</p>
${shot("fight-desktop.png", 1280, 720, "A fight on Slum Earth, wave 1 of 3. Monday and Sunday's health bars top left with a Swap button, a red hit spark knocking an enemy over, a combo of 3, and a keyboard guide along the bottom.", "A fight on Slum Earth on a laptop, with the keys along the bottom")}
<p>Fights are on Slum Earth: 3 waves, then Doc Green. The other mode is the flight, where you fly the brothers' ship, the Grand Madre, from behind like After Burner, with a hyperdrive that runs at about 2.5 times the speed for 4 seconds. Between the 2 there's a launch cutscene in simple shorthand pixel art, like old Mario games, built from my own poses.</p>
${shot("flight-desktop.png", 1280, 720, "The flight: the Grand Madre seen from behind in a pink and orange warp tunnel, an enemy bursting in front of it, a rock drifting past, score 216 and a Hyper meter.", "The flight")}
<p>The blurbs on the pick screen are Jesse's own words from the deck, swearing and typos included. Sandbox lets you stand any of the 31 characters on any of 6 stages. The explosions, sparks and smoke are redrawn from my own effect sheets, and some characters talk now: small speech bubbles that type out a letter at a time with a quiet blip.</p>
${shot("pick-desktop.png", 1280, 720, "The Pick one screen: a large preview of Monday on a floor line with his description from Jesse's deck, tiles for Monday and Sunday, and a Pick button.", "Picking a brother")}`,
)}
${section(
  "Outfits and gold",
  `<p>Each brother has outfits you win by playing.</p>
${table(["Outfit", "How you get it"], outfits)}
<p>Enlightened Monday sits cross-legged and floats, with his hair drifting over 6 frames, and pushes with the Force instead of his mind.</p>
${shot("outfit-desktop.png", 1280, 720, "The Outfit step for Monday: Plain picked, Skater, Captain and Enlightened locked, a Shades extra, and a Fight button.", "Choosing an outfit")}
<p>Gold is worked out in code. One colour ramp turns any character, pose or outfit gold, a diagonal sheen runs across it while it stands and it sparkles while it moves. It's still with Calm on. It's set up to be sold later as a paid style, and for now everyone has it.</p>
${shot("sandbox-jesus2-gold.png", 1280, 720, "Sandbox on Slum Earth: Jesus 2 in gold, with smaller gold characters standing either side.", "Jesus 2 in gold, in the sandbox")}`,
)}
${section(
  "Getting the details right",
  `<h3>The lettering</h3>
<p>The first logo was a round blob stamped on each cell of a grid, which gave it wobbly edges, a pinched R and a W that didn't match the M. I asked for research into arcade lettering and had it rebuilt from shared parts. It's written up in <a class="ob-link" href="/pixel/lettering">the lettering case study</a>, with before and after pictures.</p>
<h3>The cutscene</h3>
<p>The first launch cutscene was a separate redraw of shots from the film. It came out on 17 October, about 1,550 lines of it, and the new one is built from my own sprites. ${fill("CHECK: the reason, in your words")}</p>
<h3>The Grand Madre</h3>
<p>The ship was redrawn 5 times on 17 October ${fill("CHECK: until it matched your sketch?")}, then drawn from 13 views (5 for flying and banking, 8 for turning round) so it can bank and turn.</p>
<h3>A menu that doesn't jump</h3>
<p>Picking a fighter or outfit used to move things on the menu. Now the browser test picks every fighter, outfit and extra and fails if the title, the card or any button moves by more than half a pixel.</p>
<h3>Listening to Jesse</h3>
<p>${fill("CHECK: did Jesse ask for Monday's attack to be psychic? If so, one line on how that went")}</p>`,
)}
${section(
  "Thumbs, keys and screen readers",
  `<p>The d-pad is one touch zone you slide your thumb round, and nothing you tap is under 44px. Swap used to be a button on the touch controls. It's now a tap on the other brother at the top of the screen ${fill("CHECK: because you kept hitting it by accident?")}. On a laptop the keys are shown under the fight and light up as you press them, and the Controls window is worked out from the same key tables the game reads.</p>
${shot("fight-phone.png", 780, 1688, "The fight on a phone: the brothers' health and a Swap button at the top, a punch landing, and touch controls at the bottom with a d-pad and Special, Jump, Kick and Punch buttons.", "On a phone")}
<p>Windows keep focus inside them and Esc goes back. A screen reader hears the wave, the boss, special ready, low health and a brother going down. Settings is a window of labelled switches, each with a line saying what it does, in place of the 6 icon toggles it had. Calm means less motion and no flashing, and it's on if your device asks for reduced motion.</p>
${shot("settings-desktop.png", 1280, 720, "The Settings window: Music, Effects, Buzz and Screen shake, each a labelled switch set to on with a one-line description, and a Back button.", "Settings")}
<p>The patterns behind this are in <a class="ob-link" href="/pixel/access">Accessibility in the games</a>.</p>`,
)}
${section(
  "Into Discord",
  `<p>Jesse wanted it playable in his Discord server, so it runs as a Discord Activity. Signing in only asks Discord for your name, and the game keeps nothing about you. The menu leaves room under Discord's header on a phone.</p>
<p>When Discord shrinks the game to a small tile, the fight pauses and the tile shows the logo, the brothers and a line saying what's going on, like WAVE 2 OF 3. A test lays it out in 5 tile sizes and checks everything fits.</p>
${shot("mini-320x180.png", 640, 360, "The small view Discord shows: the Smuggle Brawlers logo, Monday and Sunday side by side, and the words On the menu.", "The small view, at Discord's smallest tile")}
<p>Discord only lets an unverified app start in servers under 25 members, so the game has terms and privacy pages ready for verification. ${fill("FILL IN: how Jesse's community has taken it, and any real quotes you have permission to use")}</p>`,
)}
${section(
  "Working with Jesse",
  `<p>I pitched it to Jesse on a call, from the Figma file. He sent me his series deck, with the characters, the episode outlines and the lore, and that's where the blurbs and the brothers' fighting styles come from. Everything in the world of <i>Jesus 2</i> is his. ${fill("FILL IN: anything else about working together, and whether Jesse is happy to be named and quoted")}</p>`,
)}
${section(
  "Numbers",
  `${table(
    ["What", "How many"],
    [
      ["Built", "13 to 20 October 2026"],
      ["Commits", "201"],
      ["Merged pull requests", "46"],
      ["Automated tests", "1,245"],
      ["Characters in Sandbox", "31"],
      ["Sandbox stages", "6"],
      ["Outfits to unlock", "5"],
      ["Views of the Grand Madre", "13"],
      ["Players, fights won, most-picked brother, hyperdrives reached", fill("FILL IN from Vercel Analytics")],
      ["Discord members and Activity launches", fill("FILL IN")],
    ],
  )}`,
)}
${section(
  "What's next",
  `<p>A leaderboard is planned out but not built. Gold is ready to go on sale. ${fill("FILL IN: what you're happy to say is next, such as paid outfits or Discord verification")}</p>
<p><a class="ob-link ob-link--strong" href="${PLAY}">Play Smuggle Brawlers</a></p>`,
)}`,
  };
}
