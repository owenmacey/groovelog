/**
 * Lightweight content moderation using a hardcoded word list.
 * Normalises common leet-speak substitutions before matching so simple
 * character swaps don't bypass the filter.
 *
 * To upgrade to a proper moderation API (e.g. Perspective API):
 *   1. Keep this file as a fast sync pre-check / fallback.
 *   2. Add an async `checkContentRemote(text)` that calls the API.
 *   3. Call both in series — reject if either flags the content.
 */

// ─── Normalisation ────────────────────────────────────────────────────────────

const SUBSTITUTIONS: [RegExp, string][] = [
  [/@/g, "a"],
  [/4/g, "a"],
  [/3/g, "e"],
  [/1/g, "i"],
  [/!/g, "i"],
  [/0/g, "o"],
  [/\$/g, "s"],
  [/5/g, "s"],
  [/7/g, "t"],
  [/\+/g, "t"],
  [/\|/g, "l"],
  [/ph/g, "f"],
];

function normalise(text: string): string {
  let out = text.toLowerCase();
  for (const [pattern, replacement] of SUBSTITUTIONS) {
    out = out.replace(pattern, replacement);
  }
  // Collapse repeated characters (e.g. "fuuuck" → "fuk")
  out = out.replace(/(.)\1{2,}/g, "$1$1");
  // Strip non-alphanumeric separators so "f-u-c-k" is caught
  out = out.replace(/[\s\-_.,']+/g, "");
  return out;
}

// ─── Word list ────────────────────────────────────────────────────────────────
// Add new terms to the appropriate section.
// Words are matched against the normalised text as substrings, so partial
// matches (e.g. embedded in a longer word) are also caught.

const BANNED_WORDS: string[] = [
  // Common profanity
  // "fuck",
  // "fuk",
  // "fck",
  // "shit",
  // "sht",
  // "bitch",
  // "biatch",
  // "cunt",
  // "cock",
  // "dick",
  // "pussy",
  // "asshole",
  // "arsehole",
  // "bastard",
  // "motherfucker",
  // "motherfukker",
  // "whore",
  // "slut",
  // "prick",
  // "wanker",
  // "twat",
  // "bollocks",
  // "bugger",
  // "dildo",
  // "penis",
  // "vagina",
  // "anus",

  // Racial & ethnic slurs
  "nigger",
  "nigga",
  "chink",
  "spic",
  "kike",
  "wetback",
  "gook",
  "beaner",
  "zipperhead",
  "cracker",
  "honky",
  "coon",
  "jiggaboo",
  "raghead",
  "towelhead",
  "camel jockey",
  "cameljockey",
  "redskin",
  "injun",
  "paki",
  "wop",
  "dago",
  "greaseball",
  "kraut",
  "hymie",
  "jap",
  "nip",

  // Slurs based on gender / sexuality
  "faggot",
  "fag",
  "dyke",
  "tranny",
  "shemale",
  "trannies",

  // Hate / extremism
  "nazi",
  "retard",
  "heil",
  "kkk",
  "whitesupremacist",
  "whitepower",
];

// Pre-normalise the word list once at module load time
const BANNED_NORMALISED: string[] = BANNED_WORDS.map(normalise);

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns `true` if the content is clean, `false` if it contains a banned word.
 * Case-insensitive; handles common leet-speak substitutions.
 */
export function checkContent(text: string): boolean {
  const normalised = normalise(text);
  return !BANNED_NORMALISED.some((word) => normalised.includes(word));
}
