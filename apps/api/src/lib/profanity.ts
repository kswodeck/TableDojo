/**
 * Profanity screening for usernames, posts and comments.
 *
 * The original shipped a 200-entry array of literal strings — including padded
 * variants like `" ass "` and `"\rass "` — to the browser on every page load,
 * and only checked client-side, so it was trivially bypassed.
 *
 * Terms fall into two groups, because one matching rule cannot serve both:
 *
 *   - SUBSTRING terms are long enough to be unambiguous anywhere they appear,
 *     so "bullshit" and "shitting" are both caught by "shit".
 *   - WORD terms are short or are substrings of ordinary English, so they only
 *     match as whole words. This is the Scunthorpe problem, and it is not
 *     hypothetical here: "competitive" contains "tit", "analysis" contains
 *     "anal", "cocktail" contains "cock", and "assist" contains "ass".
 */
// Compounds are only listed when a shorter entry does not already cover them:
// "shit" catches bullshit, "fuck" catches motherfucker. The -ass compounds do
// need listing, because "ass" itself is word-only.
const SUBSTRING_TERMS = [
  'asshole', 'bastard', 'bitch', 'blowjob', 'cunnilingus', 'dickhead', 'dildo', 'dumbass',
  'ejaculat', 'faggot', 'fatass', 'fuck', 'handjob', 'jackass', 'jackoff', 'jerkoff', 'jizz',
  'masturbat', 'nigga', 'nigger', 'rimjob', 'schlong', 'shit', 'skank', 'slut', 'whore',
];

/** Matched only as complete words, after normalization. */
const WORD_TERMS = [
  'anal', 'arse', 'ass', 'boner', 'chode', 'cock', 'cum', 'cunt', 'dick', 'douche', 'dyke',
  'fag', 'felch', 'gooch', 'jism', 'kooch', 'penis', 'pussy', 'queef', 'retard', 'tit', 'twat',
  'vagina',
];

/** Ordinary inflections, so "tits" and "retarded" match but "title" does not. */
const SUFFIXES = ['', 's', 'es', 'ed', 'ing', 'er', 'ers', 'y', 'ies', 'in'];

const WORD_FORMS = new Map<string, string>();
for (const term of WORD_TERMS) {
  for (const suffix of SUFFIXES) WORD_FORMS.set(term + suffix, term);
}

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's', '!': 'i', '+': 't',
};

/** Folds leetspeak and drops punctuation so "sh1t" and "@ss" normalize through. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[013457@$!+]/g, (char) => LEET[char] ?? char)
    .replace(/[^a-z]+/g, ' ')
    .trim();
}

/** Collapses letter-by-letter spellings, so "f-u-c-k" becomes "fuck". */
function despace(text: string): string {
  return text.replace(/\b(?:[a-z] ){2,}[a-z]\b/g, (run) => run.replace(/ /g, ''));
}

/** Returns the offending base term, or null when the text is clean. */
export function findProfanity(text: string): string | null {
  const normalized = despace(normalize(text));

  for (const term of SUBSTRING_TERMS) {
    if (normalized.includes(term)) return term;
  }

  for (const token of normalized.split(' ')) {
    const term = WORD_FORMS.get(token);
    if (term) return term;
  }

  return null;
}

export function isProfane(text: string): boolean {
  return findProfanity(text) !== null;
}
