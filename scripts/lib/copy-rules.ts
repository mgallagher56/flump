import { type CopyString, extractCopyStrings, extractJsonStrings } from "./copy-strings";

/**
 * The mechanical rules of docs/copy/COPY-GUIDE.md. Each rule cites the guide section it enforces.
 * Advice wording (R1 to R8) and claims (E7) keep their own guards
 * (apps/web/app/copy-guard.test.ts, the claims tests); this file does not repeat them.
 *
 * A false positive is fixed with an entry in ALLOWED_PHRASES and a reason, never by loosening a
 * pattern.
 */

export interface CopyRule {
  id: string;
  /** Section of docs/copy/COPY-GUIDE.md. */
  guide: string;
  /** What to write instead, shown in the failure message. */
  use: string;
  test: (text: string) => boolean;
}

export interface CopyHit {
  rule: string;
  guide: string;
  use: string;
  line: number;
  text: string;
}

const word = (source: string, flags = "i") => new RegExp(`\\b(?:${source})\\b`, flags);
const banned = (id: string, guide: string, source: string, use: string, flags = "i"): CopyRule => {
  const re = word(source, flags);
  return { id, guide, use, test: (t) => re.test(t) };
};

/** Phrases that contain a flagged word but are correct. Each needs a reason. */
export const ALLOWED_PHRASES: Array<{ phrase: RegExp; reason: string }> = [
  { phrase: /\bNational Insurance\b/g, reason: "statutory name" },
  { phrase: /\bPersonal Allowance\b/g, reason: "statutory name" },
  { phrase: /\bSelf Assessment\b/g, reason: "statutory name" },
  { phrase: /\bPayment on Account\b/gi, reason: "HMRC term" },
  { phrase: /\bCapital Gains Tax\b/g, reason: "statutory name" },
  { phrase: /\bIncome Tax\b/g, reason: "statutory name" },
  { phrase: /\bStamp Duty( Land Tax)?\b/g, reason: "statutory name" },
  { phrase: /\bCouncil Tax\b/g, reason: "statutory name" },
  { phrase: /\bUniversal Credit\b/g, reason: "statutory name" },
  { phrase: /\bChild Benefit\b/g, reason: "statutory name" },
  { phrase: /\bState Pension\b/g, reason: "statutory name" },
  { phrase: /\bMarriage Allowance\b/g, reason: "statutory name" },
  { phrase: /\bStudent Loans?\b/g, reason: "product name in the copy guide" },
  { phrase: /\bPostgraduate Loan\b/g, reason: "plan name" },
  {
    phrase: /\b(Stocks and Shares|Cash|Lifetime|Junior|Innovative Finance) ISA\b/g,
    reason: "wrapper name",
  },
  { phrase: /\bPlan [1245]\b/g, reason: "plan name" },
  { phrase: /\bSection 24\b/g, reason: "statute" },
  { phrase: /\bOpen Banking\b/g, reason: "scheme name" },
  { phrase: /\bModel Context Protocol\b/g, reason: "protocol name" },
  { phrase: /\bPersonal Access Token\b/g, reason: "provider's own term" },
  {
    phrase:
      /\b(Northern Ireland|United Kingdom|Bank of England|Money ?Helper|Citizens Advice|National Debtline|Step ?Change)\b/g,
    reason: "proper noun",
  },
  {
    phrase:
      /\b(Claude|ChatGPT|Cursor|Trading 212|Flump|Google|Apple|GitHub|WorkOS|Anthropic|OpenAI)( [A-Z][a-z]+)?\b/g,
    reason: "product name",
  },
  {
    phrase:
      /\b(January|February|March|April|May|June|July|August|September|October|November|December|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/g,
    reason: "month or day",
  },
  {
    phrase: /\b(England|Scotland|Wales|Scottish|Welsh|English|British|Britain)\b/g,
    reason: "proper noun",
  },
  { phrase: /\bHis Majesty's Revenue and Customs\b/g, reason: "proper noun" },
];

function withoutAllowed(text: string): string {
  let t = text;
  for (const { phrase } of ALLOWED_PHRASES) t = t.replace(phrase, "x");
  return t;
}

const SMALL_WORDS = new Set(
  "a an and are as at be but by for from in into is it its not of on or per so than that the then this to up via vs was with you your".split(
    " ",
  ),
);

/** Title Case: three or more words where most words after the first start with a capital. */
export function isTitleCase(text: string): boolean {
  // Judge each sentence or clause on its own, so a capital after a full stop or colon is fine.
  return withoutAllowed(text)
    .split(/[.:?!–—|•·]\s+|\s[-/]\s|\(|\)/)
    .some((clause) => {
      const words = clause
        .trim()
        .split(/\s+/)
        .filter((w) => /^[A-Za-z][A-Za-z'’-]*[,;]?$/.test(w));
      if (words.length < 3) return false;
      const rest = words.slice(1).filter((w) => !SMALL_WORDS.has(w.toLowerCase()) && w.length > 2);
      if (rest.length < 2) return false;
      // "ISA", "HMRC" are acronyms, not title case.
      const capitalised = rest.filter((w) => /^[A-Z][a-z]/.test(w));
      return capitalised.length >= 2 && capitalised.length / rest.length >= 0.6;
    });
}

/** Two or more shouted words in a row that are not acronyms ("HOW IT WORKS"). */
export function isAllCaps(text: string): boolean {
  return /\b[A-Z]{4,}\s+(?:[A-Z]{1,3}\s+)?[A-Z]{4,}\b/.test(text);
}

export const COPY_RULES: CopyRule[] = [
  {
    id: "exclamation",
    guide: "5.4",
    use: "end with a full stop or nothing",
    test: (t) => /[A-Za-z0-9)]!(?!=)/.test(t),
  },
  { id: "title-case", guide: "5.1", use: "sentence case", test: isTitleCase },
  { id: "all-caps", guide: "5.1", use: "sentence case; no uppercase eyebrows", test: isAllCaps },
  {
    id: "em-dash",
    guide: "5.4",
    use: "a full stop, a comma or 'to' for a range",
    test: (t) => t.includes("—"),
  },
  {
    id: "ampersand",
    guide: "5.4",
    use: "and",
    test: (t) => /[A-Za-z] & [A-Za-z]/.test(t),
  },

  // 6. Glossary: words we never use (PLAN P7.1 and the feature-name table).
  banned("module-widget", "6.2", "modules?|widgets?", "section, or name the thing"),
  banned("baseline", "6.2", "baselines?", "your figures; 'Finish setting up'"),
  banned("snapshot", "6.2", "snapshots?", "picture; 'monthly check-in' for the saved record"),
  banned("liability", "6.2", "liabilit(?:y|ies)", "debt, debts, what you owe"),
  banned("assets", "6.2", "assets?", "what you own; or name it (savings, home, pension)"),
  banned("creditor", "6.2", "creditors?", "lender"),
  banned(
    "qualifying-gross",
    "6.2",
    "qualifying (?:gross|earnings)",
    "pay that counts for your pension",
  ),
  banned("weighted", "6.2", "weighted (?:by|average)", "average rate"),
  banned("discretionary", "6.2", "discretionary", "flexible spending"),
  banned("liquid", "6.2", "liquid(?:ity)?", "cash you can get at quickly"),
  banned("runway", "6.2", "runway", "months of cover"),
  banned("waterfall", "6.2", "waterfall", "where your pay goes"),
  banned(
    "engine",
    "6.2",
    "engines?|mathematical(?:ly)?|psychological momentum",
    "remove; state the figure",
  ),
  banned("high-apr", "6.2", "high[- ](?:APR|interest)", "state the rate: '24.9% APR'"),
  banned(
    "sync-jargon",
    "6.2",
    "sync(?:s|ed|ing)?|bank feeds?|balance feeds?|credentials",
    "connected, updated; 'connected banks'",
  ),
  banned(
    "amortisation",
    "6.2",
    "amorti[sz](?:e|ed|ation|ing)",
    "repayment schedule; 'how the balance falls'",
  ),
  banned("net-of", "6.2", "net of|gross of|per annum|p\\.a\\.", "after, before, a year"),
  banned(
    "tax-trap",
    "6.3",
    "tax trap|escape|save tax|tax[- ]sav(?:ing|er)s?|loophole|tax[- ]efficient",
    "state the threshold: 'below £100,000' (R8)",
  ),

  // 3. Plain words (GOV.UK words to avoid; Plain English Campaign A to Z).
  banned(
    "plain-words",
    "3.2",
    "utili[sz]e[sd]?|leverag(?:e|es|ed|ing)|facilitat(?:e|es|ed|ing)|in order to|prior to|commence[sd]?|terminate[sd]?|regarding|in respect of|with regards? to|going forward|please note|kindly|deep dive|drill down|holistic|robust|seamless(?:ly)?|empower(?:s|ed|ing)?|streamlin(?:e|ed|ing)|cutting[- ]edge|world[- ]class|game[- ]chang(?:er|ing)",
    "the everyday word (use, help, to, before, start, end, about)",
  ),
  banned(
    "hype",
    "2.2",
    "supercharge[sd]?|unlock(?:s|ed|ing)?|crush(?:es|ed|ing)?|smash(?:es|ed|ing)?|effortless(?:ly)?|magic(?:al|ally)?|delve|tapestry|beacon|zero-latency|air-gapped|bank-grade|military-grade|enterprise-grade|engineered for|radar|instant insights?|financial freedom|wealth[- ]building|level up",
    "say what it does, with the figure",
  ),
  banned(
    "minimiser",
    "2.3",
    "simply|easily|easy(?![- ]access)|obviously|of course|quick and easy|it'?s simple|just (?:enter|add|click|select|connect|tap|type|pick|choose|fill|set|sign)",
    "drop the word; what is easy for us may not be for the reader",
  ),
  banned(
    "judgement",
    "2.3",
    "(?:only|just|a mere) £|struggl(?:e|es|ed|ing)|bad with money|good with money|still renting|(?:get|getting|step) on(?:to)? the (?:property |housing )?ladder|thin savings|irresponsible|overspen(?:d|t|ding)|splurg(?:e|ed|ing)|guilt[- ]free|bad debt|good debt",
    "state the figure or the date without grading it (owner tone rule)",
  ),
  banned(
    "apology-filler",
    "5.6",
    "oops|whoops|uh[- ]oh|yikes|hooray|woo-?hoo|awesome|congrat(?:s|ulations)",
    "say what happened and what to do next",
  ),
  banned(
    "vague-error",
    "5.6",
    "something went wrong|an error (?:has )?occurred|invalid",
    "say what happened, in the reader's words, and how to fix it",
  ),
  banned(
    "unsupported-claim",
    "7.4",
    "stealth|dangerous|automatically (?:monitors?|tracks?|syncs?|models?|files?)|monitors? (?:your|fixed)|save (?:up to )?£|hidden (?:fees?|costs?|charges?)",
    "describe only what the tool on the page does today; state a cost as an estimate (E7)",
  ),
  banned(
    "click-here",
    "5.3",
    "click here|click (?:on )?the|learn more|read more|find out more",
    "a link that names its destination; 'select', not 'click'",
  ),
  {
    id: "latin",
    guide: "3.2",
    use: "for example, that is, and so on",
    test: (t) => /\b(?:e\.g\.|i\.e\.|etc\b)/i.test(t),
  },
  banned(
    "us-spelling",
    "3.4",
    "optimiz\\w+|categoriz\\w+|analyz\\w+|visualiz\\w+|personaliz\\w+|summariz\\w+|prioritiz\\w+|maximiz\\w+|minimiz\\w+|amortiz\\w+|modeling|modeled|enroll(?:ment|ed)?|favorites?|behaviors?|canceled|canceling|labeled|totaled|checking account|401\\(?k\\)?|APY|zip code",
    "en-GB spelling and UK terms",
  ),
];

function hitsFor(strings: CopyString[]): CopyHit[] {
  const hits: CopyHit[] = [];
  for (const s of strings) {
    const text = withoutAllowed(s.text);
    for (const rule of COPY_RULES) {
      // Title case is judged on the original text; it removes allowed phrases itself.
      if (rule.test(rule.id === "title-case" ? s.text : text)) {
        hits.push({ rule: rule.id, guide: rule.guide, use: rule.use, line: s.line, text: s.text });
      }
    }
  }
  return hits;
}

/** Every copy-rule hit in a source file (TS, TSX or a locale JSON file). */
export function findCopyHits(source: string, fileName: string): CopyHit[] {
  return hitsFor(
    fileName.endsWith(".json") ? extractJsonStrings(source) : extractCopyStrings(source, fileName),
  );
}
