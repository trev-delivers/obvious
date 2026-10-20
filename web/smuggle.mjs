/**
 * The Smuggle Brawlers case study, in Trev's words. Kept evergreen: no build
 * numbers, release dates or counts that go stale as the game changes.
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
    description: "A pixel-art beat 'em up made from my pixel art of Jesse Moynihan's Jesus 2.",
    body: `
<header class="page-head"><h1>Smuggle Brawlers</h1><p class="lead">A pixel-art beat 'em up made from my own pixel art of Jesse Moynihan's <i>Jesus 2</i>. It plays in a browser, and it's being tested as a Discord Activity in Jesse's server.</p></header>
<p><a class="ob-link ob-link--strong" href="${PLAY}">Play Smuggle Brawlers</a></p>
${shot("menu-desktop.png", 1280, 720, "The Smuggle Brawlers title screen: the pink pixel logo, DESIGNED BY TREV, a card saying You fight as Monday, Fight, Fly, Sandbox and Settings buttons, and a green comet with a little figure riding it.", "The menu")}
${section(
  "Where it started",
  `<p>Jesse Moynihan is an American artist and animator. He wrote and storyboarded on <i>Adventure Time</i>, and <i>Jesus 2</i> is his own: a short film about 2 brothers called Monday and Sunday.</p>
<p>Back in 2021, just after COVID, NFTs were taking off and Jesse put out <i>Jesus 2</i> collections of his own. What I liked was that it was him drawing. Nothing about it was generated.</p>
<p>So I started making little pixel versions of his characters. They began as emoji reactions in Discord, which is why they're so small and low fidelity. At that size I could play around with the details and not have much to lose. They grew into a full set of characters with poses and gold versions, all drawn in Figma.</p>`,
)}
${section(
  "From Figma to a game",
  `<p>This is my second pixel-art game. The first was a similar side-scrolling brawler I made with my friends, and this one took what I learned from it and ran a bit further.</p>
<p>The characters are read straight out of my Figma drawings, so what you play is my pixels and nothing is redrawn. Every pixel is the same size on screen. A tall character gets more pixels instead of bigger ones, and nothing is smoothed or blended. The rules are written up in <a class="ob-link" href="/pixel">Pixels</a>.</p>
<p>Claude wrote the code and I reviewed it. Over the last year I've trained my own coding agents, and they run the tests and the QA: every change goes through more than 1,000 automated tests and a browser test of every screen before it's live. I did all the art and design, the characters and the backgrounds.</p>`,
)}
${section(
  "2 brothers, 2 ways to fight",
  `<p>The fighting styles come from Jesse's own series deck. Sunday "celebrates violence as his #1 problem solving tool", so he punches and kicks. Monday fights with his mind: he grips, slams and pushes from a distance. You can swap between them mid-fight by tapping the other brother at the top of the screen.</p>
${shot("fight-desktop.png", 1280, 720, "A fight on Slum Earth, wave 1 of 3. Monday and Sunday's health bars top left with a Swap button, a red hit spark knocking an enemy over, a combo of 3, and a keyboard guide along the bottom.", "A fight on Slum Earth")}
<p>The blurbs on the pick screen are Jesse's own words from the deck, swearing and typos included.</p>
${shot("pick-desktop.png", 1280, 720, "The Pick one screen: a large preview of Monday on a floor line with his description from Jesse's deck, tiles for Monday and Sunday, and a Pick button.", "Picking a brother")}
<p>The other mode is the flight. You fly the brothers' ship, the Grand Madre, from behind like After Burner, with a hyperdrive for when things get busy. The explosions, sparks and smoke are redrawn from my own effect sheets.</p>
${shot("flight-desktop.png", 1280, 720, "The flight: the Grand Madre seen from behind in a pink and orange warp tunnel, an enemy bursting in front of it, a rock drifting past, a score and a Hyper meter.", "The flight")}
<p>Sandbox lets you stand any of the 31 characters on any of 6 stages, and some of them talk: small speech bubbles that type out a letter at a time with a quiet blip.</p>`,
)}
${section(
  "Outfits and gold",
  `<p>Each brother has outfits you win by playing.</p>
${table(["Outfit", "How you get it"], outfits)}
<p>Enlightened Monday sits cross-legged and floats, with his hair drifting, and pushes with the Force instead of his mind.</p>
${shot("outfit-desktop.png", 1280, 720, "The Outfit step for Monday: Plain picked, Skater, Captain and Enlightened locked, a Shades extra, and a Fight button.", "Choosing an outfit")}
<p>Gold is worked out in code. One colour ramp turns any character, pose or outfit gold. A sheen runs across it while it stands, and it sparkles while it moves.</p>
${shot("sandbox-jesus2-gold.png", 1280, 720, "Sandbox on Slum Earth: Jesus 2 in gold, with smaller gold characters standing either side.", "Jesus 2 in gold")}`,
)}
${section(
  "Choices along the way",
  `<h3>The lettering</h3>
<p>The first logo was a round blob stamped on each cell of a grid, which gave it wobbly edges, a pinched R and a W that didn't match the M. I asked for research into arcade lettering and had it rebuilt from shared parts: one stroke width, one corner and one diagonal. The before and after are in <a class="ob-link" href="/pixel/lettering">the lettering case study</a>.</p>
<h3>The launch</h3>
<p>I wanted one good shot of the Grand Madre taking off. It's an organic machine, and it takes off using one of the brothers. The first version redrew shots from Jesse's film, and I threw it out. The one in the game is simple shorthand pixel art, like old Mario games, built from my own sprites.</p>
<h3>The Grand Madre</h3>
<p>The ship took a few goes to get right. It's drawn from 13 views, so it can bank and turn as you fly.</p>`,
)}
${section(
  "Making it obvious",
  `<p>A game has a lot moving around, so the interface has to be easy to find. It works with a keyboard, a gamepad or your thumbs. The keys are shown under the fight and light up as you press them. A screen reader hears what matters, like a new wave or low health, and a Calm switch takes out the shake and the flashing.</p>
${shot("fight-phone.png", 780, 1688, "The fight on a phone: the brothers' health and a Swap button at the top, a punch landing, and touch controls at the bottom with a d-pad and Special, Jump, Kick and Punch buttons.", "On a phone")}
${shot("settings-desktop.png", 1280, 720, "The Settings window: Music, Effects, Buzz and Screen shake, each a labelled switch set to on with a one-line description, and a Back button.", "Settings, with a line on what each switch does")}
<p>The patterns behind it are in <a class="ob-link" href="/pixel/access">Accessibility in the games</a>.</p>`,
)}
${section(
  "Into Discord",
  `<p>It runs as a Discord Activity, so people can play it without leaving Jesse's server. It's being tested there and is waiting on verification from Discord. When Discord shrinks it to a small tile, the game pauses and shows what's going on.</p>
${shot("mini-320x180.png", 640, 360, "The small view Discord shows: the Smuggle Brawlers logo, Monday and Sunday side by side, and the words On the menu.", "The small view in Discord")}`,
)}
${section(
  "Jesse",
  `<p>It's been a pleasure to work with Jesse. The world and the characters are his, and he's held the creative licence for all of it. I'm a fan of his work making a fun little game, which I can do now thanks to AI.</p>`,
)}
${section(
  "Numbers",
  `${table(
    ["What", "How many"],
    [
      ["Playable brothers", "2"],
      ["Characters in Sandbox", "31"],
      ["Sandbox stages", "6"],
      ["Outfits to unlock", "5"],
    ],
  )}
<p>Awaiting analytics updates.</p>
<p><a class="ob-link ob-link--strong" href="${PLAY}">Play Smuggle Brawlers</a></p>`,
)}`,
  };
}
