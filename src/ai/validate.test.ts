import { describe, expect, test } from "vitest";
import { csQwertz } from "../core/layouts/cs-qwertz";
import { enUs } from "../core/layouts/en-us";
import { strokesFor } from "../core/layouts/strokes";
import { type ValidateOptions, validate } from "./validate";

const topic = (min = 1, max = 1000): ValidateOptions => ({
  kind: "topic",
  layout: enUs,
  min,
  max,
});
const lesson = (allowed: string, min = 1, max = 1000): ValidateOptions => ({
  kind: "lesson",
  allowed,
  min,
  max,
});
const code = (max = 1000): ValidateOptions => ({
  kind: "code",
  layout: enUs,
  min: 1,
  max,
});

describe("shared cleanup", () => {
  test("applies NFC and collapses whitespace", () => {
    expect(validate("  á  b \n\n c ", topic())).toBe(
      "á b c".normalize("NFC") === "á b c" ? "a b c" : "a b c",
    );
  });

  test("replaces typographic characters", () => {
    expect(validate("He said “hi” – wait… now here", topic())).toBe(
      'He said "hi" - wait... now here',
    );
  });

  test("strips markdown artifacts and list markers", () => {
    expect(validate("**Bold** and `code`", topic())).toBe("Bold and code");
    expect(validate("1. one\n2) two\n- three\n* four\n# five", topic())).toBe(
      "one two three four five",
    );
    expect(validate('"quoted answer"', topic())).toBe("quoted answer");
  });

  test("drops code fence lines and a preamble line", () => {
    expect(validate("Here is the text:\n```\nhello there\n```", topic())).toBe(
      "hello there",
    );
  });

  test("keeps a single line that ends in a colon", () => {
    expect(validate("Note:", topic())).toBe("Note:");
  });

  test("returns undefined for empty input", () => {
    expect(validate("  \n ", topic())).toBeUndefined();
  });
});

describe("lesson", () => {
  test("drops words with characters outside the allowed set", () => {
    expect(validate("the cat sat on the mat", lesson("thesaon "))).toBe(
      "the sat on the",
    );
  });

  test("discards when fewer than 60 % of words survive", () => {
    expect(validate("aa bb cc dd ee", lesson("ab"))).toBeUndefined();
    expect(validate("aa ab cc dd ee", lesson("abde"))).toBe("aa ab dd ee");
  });

  test("keeps exactly 60 %", () => {
    expect(validate("aa aa aa cc cc", lesson("a"))).toBe("aa aa aa");
  });

  test("strict about punctuation unless allowed", () => {
    expect(validate("aa, ab ab", lesson("ab"))).toBe("ab ab");
    expect(validate("aa, ab ab", lesson("ab,"))).toBe("aa, ab ab");
  });
});

describe("topic and feedback", () => {
  test("transliterates what the layout cannot type", () => {
    expect(validate("Straße café naïve", topic())).toBe("Strasse cafe naive");
  });

  test("drops words with no typable form", () => {
    expect(validate("hello 世界 world", topic())).toBe("hello world");
  });

  test("keeps what the layout can type", () => {
    expect(
      validate("žluťoučký kůň", {
        kind: "topic",
        layout: csQwertz,
        min: 1,
        max: 100,
      }),
    ).toBe("žluťoučký kůň");
  });

  test("feedback uses the same rules", () => {
    expect(
      validate("- Slow down.\n- Keep it up—good!", {
        kind: "feedback",
        layout: enUs,
        min: 1,
        max: 100,
      }),
    ).toBe("Slow down. Keep it up-good!");
  });
});

describe("code", () => {
  test("takes the first fenced block and ignores prose around it", () => {
    expect(
      validate("Sure!\n```ts\nconst a = 1;\n```\nExplanation *here*", code()),
    ).toBe("const a = 1;");
  });

  test("keeps newlines and asterisks, expands tabs, trims trailing space", () => {
    expect(validate("f(a * b) {  \n\treturn 1;\n}\n\n", code())).toBe(
      "f(a * b) {\n    return 1;\n}",
    );
  });

  test("discards a snippet with an untypable character", () => {
    expect(validate("print('世')", code())).toBeUndefined();
  });

  test("handles an unclosed fence", () => {
    expect(validate("```py\nx = 1", code())).toBe("x = 1");
  });
});

describe("length clamp", () => {
  test("cuts at the last word boundary within max", () => {
    expect(validate("one two three four", topic(1, 10))).toBe("one two");
  });

  test("keeps text exactly at max", () => {
    expect(validate("one two", topic(1, 7))).toBe("one two");
  });

  test("discards text shorter than min", () => {
    expect(validate("one two", topic(8))).toBeUndefined();
  });

  test("discards when no boundary fits", () => {
    expect(validate("abcdefghij", topic(1, 5))).toBeUndefined();
  });

  test("cuts code at a line boundary", () => {
    expect(validate("a = 1\nb = 2\nc = 3", code(12))).toBe("a = 1\nb = 2");
  });
});

interface Fixture {
  model: string;
  system: string;
  prompt: string;
  output: string;
}

const isFixture = (v: unknown): v is Fixture =>
  typeof v === "object" &&
  v !== null &&
  "model" in v &&
  "system" in v &&
  "prompt" in v &&
  "output" in v &&
  typeof v.output === "string";

const files = import.meta.glob("/tests/fixtures/ai/*.json", {
  import: "default",
  eager: true,
});

const fixtures = Object.entries(files).map(([path, data]) => {
  if (!isFixture(data)) throw new Error(`bad fixture ${path}`);
  return { name: path.split("/").pop() ?? path, ...data };
});

const ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const MARKDOWN = /[*`#]|^\s*(?:[-•]|\d+[.)])\s/m;

describe("real model output", () => {
  test("fixtures exist", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(20);
  });

  for (const f of fixtures) {
    test(f.name, () => {
      const mode = f.name.split("-")[0];
      const layout = f.name.includes("-cs-") ? csQwertz : enUs;
      const kind =
        mode === "lesson" ? "lesson" : mode === "code" ? "code" : "topic";
      const options: ValidateOptions =
        kind === "lesson"
          ? { kind, allowed: "etaoinshrdl .,'-", min: 1, max: 300 }
          : { kind, layout, min: 1, max: 600 };
      const out = validate(f.output, options);
      if (out === undefined) return;

      expect(out).toBe(out.normalize("NFC"));
      expect(out.length).toBeLessThanOrEqual(600);
      for (const ch of out) expect(strokesFor(layout, ch)).toBeDefined();
      if (kind !== "code") {
        expect(out).not.toMatch(MARKDOWN);
        expect(out).not.toMatch(/\s{2}|\n/);
      } else {
        expect(out).not.toContain("```");
      }
    });
  }

  test("gemma4 fenced code with prose yields only the snippet", () => {
    const f = fixtures.find((x) => x.name === "code-ts-lax-gemma4.json");
    const out = f ? validate(f.output, code(2000)) : undefined;
    expect(out?.startsWith("function debounce")).toBe(true);
    expect(out).not.toContain("How it works");
  });

  test("curly apostrophe in feedback becomes straight", () => {
    const f = fixtures.find((x) => x.name === "feedback-en-lax-gemma4.json");
    expect(f?.output).toContain("’");
    const out = f ? validate(f.output, topic(1, 5000)) : undefined;
    expect(out).toContain("It's great");
  });

  test("qwen numbered, quoted lesson list is cleaned", () => {
    const f = fixtures.find((x) => x.name === "lesson-en-lax-qwen2.5.json");
    const out = f
      ? validate(f.output, lesson(`${ALPHABET} .,!'?-`, 1, 2000))
      : undefined;
    expect(out).toBeDefined();
    expect(out).not.toMatch(/["\d]|Sure/);
    expect(out).toContain("The rain in Spain");
  });
});
