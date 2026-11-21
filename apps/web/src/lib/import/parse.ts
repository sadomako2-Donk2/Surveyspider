// Turns the text of a questionnaire (from Word, PDF, Excel or pasted text) into questions.
// Ported unchanged in behaviour from Phase 1 (public/index.html, parseQuestionnaire).
//
// Lines may start with a marker from the Word reader:
//   \u0001 numbered list item, \u0002 bullet or sub-item, \u0003 heading.
import { DEFAULT_SCALE, type QuestionInput, type QuestionTypeCode } from "@/lib/surveys";

export const LIKERT_WORDS =
  /(agree|disagree|satisf|neutral|never|rarely|sometimes|often|always|likely|important|poor|fair|good|excellent|neither|difficult|easy)/i;

const RX_NUM = /^\s*(?:Q(?:uestion)?\s*)?(\d{1,3})\s*[.):\-]\s*(.+)$/i;
const RX_QN = /^\s*Q(?:uestion)?\s*(\d{1,3})\s+(.+)$/i;
const RX_OPT =
  /^\s*(?:\(?[a-hA-H][).\]]|\((?:i|ii|iii|iv|v|vi|vii|viii)\)|(?:i|ii|iii|iv|v|vi|vii|viii)\)|[•●○◦▪■□☐❑◻▢⬜◯\-–—*·]|\[\s?\]|\(\s?\)|o(?=\s))\s*(.+)$/;
const BOXES = /[□☐❑◻▢⬜○◯]/;
const cleanQ = (t: string) =>
  t
    .replace(/\s*[_.]{3,}\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
const cleanOpt = (t: string) =>
  t
    .replace(/[□☐❑◻▢⬜○◯]/g, "")
    .replace(/^\s*(?:\(?[a-hA-H][).\]]|[•●◦▪■\-–—*·])\s+/, "")
    .replace(/\s*[_.]{3,}\s*$/, "")
    .replace(/[:\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

interface Draft {
  text: string;
  options: string[];
  optSrc?: "num";
  scale?: { min: number; max: number };
}

function inferType(q: Draft): QuestionTypeCode {
  const t = q.text.toLowerCase(),
    o = q.options;
  if (o.length >= 2) {
    if (o.length >= 3 && o.every((x) => /^\d{1,2}$/.test(x))) {
      const ns = o.map(Number);
      if (
        ns.every((v, j) => j === 0 || v === ns[j - 1]! + 1) &&
        (ns[0] === 0 || ns[0] === 1) &&
        ns[ns.length - 1]! <= 10
      ) {
        q.scale = { min: ns[0]!, max: ns[ns.length - 1]! };
        q.options = [];
        return "RATING";
      }
    }
    if (o.length >= 3 && o.every((x) => LIKERT_WORDS.test(x))) return "LIKERT";
    if (
      /(all that apply|select all|tick all|check all|choose all|mark all|more than one|select (up to|any)|multiple answers)/.test(
        t,
      )
    )
      return "MULTI";
    return "SINGLE";
  }
  q.options = [];
  const r = t.match(/\b([01])\s*(?:-|–|to)\s*(\d{1,2})\b/);
  if (r && /(scale|rate|rating|how likely|how satisfied|recommend|agree)/.test(t) && +r[2]! >= 2 && +r[2]! <= 10) {
    q.scale = { min: +r[1]!, max: +r[2]! };
    return "RATING";
  }
  if (/(on a scale|\brate\b|\brating\b)/.test(t)) return "RATING";
  if (/\b(how many|how much|how old|your age|what is your age|number of|in years|amount)\b/.test(t) || /^age\b/.test(t))
    return "NUMBER";
  return "TEXT";
}

export interface ParsedQuestionnaire {
  title: string;
  description: string;
  questions: QuestionInput[];
}

export function parseQuestionnaire(raw: string[], fallbackTitle: string): ParsedQuestionnaire {
  const cleaned = raw
    .map((l) =>
      String(l)
        .replace(/[ \t ]+/g, " ")
        .trim(),
    )
    .filter((l) => l.replace(/[\u0001-\u0003]/g, "").trim());
  const bare = (l: string) => /^\d{1,2}$/.test(l);
  // Drop page numbers ("Page 2", "2 of 5", or a lone number), but keep runs of bare numbers: those are scale options (1 2 3 4 5).
  const lines = cleaned.filter((l, i) => {
    if (/^[\u0001-\u0003]?page\s*\d+(\s*(of|\/)\s*\d+)?$/i.test(l) || /^\d+\s*(of|\/)\s*\d+$/i.test(l)) return false;
    if (bare(l)) return bare(cleaned[i - 1] ?? "") || bare(cleaned[i + 1] ?? "");
    return true;
  });
  const qs: Draft[] = [],
    pre: string[] = [];
  let cur: Draft | null = null,
    lastN = 0;
  const startQ = (text: string) => {
    cur = { text: cleanQ(text), options: [] };
    qs.push(cur);
  };
  const addOpt = (text: string) => {
    const o = cleanOpt(text);
    if (cur && o && cur.options.length < 30 && !cur.options.includes(o)) cur.options.push(o);
  };
  const optionLike = (text: string) =>
    !!cur &&
    text.length < 90 &&
    !/\?\s*$/.test(text) &&
    (cur.options.length > 0 ||
      /[?:]\s*$/.test(cur.text) ||
      /\((please )?(select|tick|choose|check|circle)/i.test(cur.text));

  for (let line of lines) {
    let kind = "";
    if (line[0] === "\u0001") {
      kind = "num";
      line = line.slice(1).trim();
    } else if (line[0] === "\u0002") {
      kind = "bullet";
      line = line.slice(1).trim();
    } else if (line[0] === "\u0003") {
      if (!qs.length) pre.push(line.slice(1).trim());
      continue;
    }
    // "Do you smoke? ☐ Yes ☐ No" → question + inline options
    if (BOXES.test(line)) {
      const parts = line.split(BOXES).map((s) => s.trim());
      const headTxt = parts.shift() ?? "",
        opts = parts.filter(Boolean);
      if (opts.length >= 2 || (opts.length && cur && !headTxt)) {
        if (headTxt) {
          const m = headTxt.match(RX_NUM) || headTxt.match(RX_QN);
          if (m) lastN = +m[1]!;
          startQ(m ? m[2]! : headTxt);
        }
        if (cur) opts.forEach(addOpt);
        continue;
      }
    }
    const c = cur as Draft | null;
    if (kind === "bullet") {
      if (c) addOpt(line);
      else pre.push(line);
      continue;
    }
    if (kind === "num") {
      const asOption =
        c && !/\?/.test(line) && line.length < 60 && optionLike(line) && (!c.options.length || c.optSrc === "num");
      if (asOption && c) {
        addOpt(line);
        c.optSrc = "num";
      } else startQ(line);
      continue;
    }
    if (bare(line)) {
      if (c) addOpt(line);
      continue;
    }
    const m = line.match(RX_NUM) || line.match(RX_QN);
    if (m && !/^\d+\s*[.)]\s*\d/.test(line)) {
      const n = +m[1]!;
      if (!c || n === lastN + 1 || /\?\s*$/.test(m[2]!) || !optionLike(m[2]!)) {
        startQ(m[2]!);
        lastN = n;
      } else addOpt(m[2]!);
      continue;
    }
    const o = line.match(RX_OPT);
    if (o && c) {
      addOpt(o[1]!);
      continue;
    }
    if (/\?\s*$/.test(line) && line.length > 8) {
      startQ(line);
      continue;
    }
    if (c) {
      const scaleWord = line.length < 45 && !/\?/.test(line) && LIKERT_WORDS.test(line);
      if ((optionLike(line) || scaleWord) && line.length < 70 && !/\.\s*$/.test(line)) addOpt(line);
      else if (!c.options.length && c.text.length < 400) c.text = cleanQ(`${c.text} ${line}`);
      continue;
    }
    pre.push(line);
  }
  const questions: QuestionInput[] = qs
    .filter((q) => q.text.length > 2)
    .slice(0, 150)
    .map((q) => {
      const type = inferType(q);
      return {
        type,
        text: q.text.slice(0, 500),
        options: q.options,
        required: true,
        scale: type === "RATING" ? { ...DEFAULT_SCALE, ...(q.scale ?? {}) } : null,
      };
    });
  const title = pre.find((l) => l.length <= 120) ?? fallbackTitle;
  const description = pre
    .filter((l) => l !== title)
    .join(" ")
    .slice(0, 600);
  return { title: title.slice(0, 120), description, questions };
}

/** Word HTML (from mammoth) → marked lines. Needs a DOM: runs in the browser. */
export function htmlToLines(html: string, parser: DOMParser = new DOMParser()): string[] {
  const doc = parser.parseFromString(html, "text/html"),
    out: string[] = [];
  const isList = (n: Node): n is HTMLElement =>
    n.nodeType === 1 && ((n as HTMLElement).tagName === "OL" || (n as HTMLElement).tagName === "UL");
  function walkList(list: HTMLElement, depth: number) {
    for (const li of Array.from(list.children)) {
      if (li.tagName !== "LI") continue;
      const own = Array.from(li.childNodes)
        .filter((c) => !isList(c))
        .map((c) => c.textContent)
        .join(" ")
        .trim();
      if (own) out.push((list.tagName === "OL" && depth === 0 ? "\u0001" : "\u0002") + own);
      for (const sub of Array.from(li.children)) if (isList(sub)) walkList(sub, depth + 1);
    }
  }
  function walk(el: Element) {
    for (const n of Array.from(el.children)) {
      if (isList(n)) walkList(n, 0);
      else if (n.tagName === "TABLE")
        n.querySelectorAll("tr").forEach((tr) =>
          Array.from(tr.children).forEach((td) => {
            const t = td.textContent?.trim();
            if (t) out.push(t);
          }),
        );
      else if (/^H[1-6]$/.test(n.tagName)) {
        const t = n.textContent?.trim();
        if (t) out.push("\u0003" + t);
      } else if (n.tagName === "P")
        (n.textContent ?? "").split(/\n/).forEach((t) => {
          const s = t.trim();
          if (s) out.push(s);
        });
      else walk(n);
    }
  }
  walk(doc.body);
  return out;
}
