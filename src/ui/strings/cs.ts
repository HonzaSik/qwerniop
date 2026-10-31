import type { Strings } from "./en";

/** Czech forms for 1, 2 to 4, and 5 or more. */
export const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n >= 2 && n <= 4 ? few : many;

/** "A, B a C". */
const list = (keys: readonly string[]): string =>
  keys.length < 2
    ? (keys[0] ?? "")
    : `${keys.slice(0, -1).join(", ")} a ${keys.at(-1)}`;

export const cs: Strings = {
  language: "cs",
  nav: {
    label: "Zobrazení",
    practice: "Procvičování",
    lessons: "Lekce",
    stats: "Statistiky",
  },
  layoutLabel: "Rozložení",
  layoutNames: { "en-us": "Angličtina (US)", "cs-qwertz": "Čeština (QWERTZ)" },
  lengthLabel: "Délka",
  words: (n) => `${n} ${plural(n, "slovo", "slova", "slov")}`,
  seconds: (n) => `${n} s`,
  keyboardLabel: "Klávesnice",
  keyboardModes: {
    fingers: "Barvy prstů",
    next: "Jen další klávesa",
    hidden: "Skrytá",
  },
  wordListError: "Seznam slov se nepodařilo načíst.",
  tryAgain: "Zkusit znovu",
  lesson: "Lekce",
  trackNames: {
    letters: "Písmena",
    punctuation: "Interpunkce",
    numbers: "Čísla",
    code: "Kód",
  },
  noNewKeys: { capitals: "velká písmena", snippets: "celé úryvky" },
  lessons: {
    accuracy: "Přesnost",
    speed: "Rychlost",
    wpm: (n) => `${n} slov/min`,
    unlocked: (done, all) => `Odemčeno ${done} z ${all}`,
    opensAt: (stage) => `Otevře se u lekce písmen ${stage}`,
    done: "Hotovo",
  },
  practice: {
    timeLeft: "Zbývající čas",
    typeText: "Pište text",
    paused: "Klikněte nebo stiskněte libovolnou klávesu a pokračujte",
  },
  summary: {
    label: "Výsledky cvičení",
    wpm: "Slov/min",
    accuracy: "Přesnost",
    time: "Čas",
    weakest: "Nejslabší klávesy",
    next: "Pokračovat",
    repeat: "Opakovat",
  },
  feedback: {
    unlocked: (title) => `Odemčeno: ${title}.`,
    accuracy: (keys) =>
      keys.length > 0
        ? `Zpomalte a soustřeďte se na přesnost, zejména u ${keys.length === 1 ? "klávesy" : "kláves"} ${list(keys)}.`
        : "Zpomalte a soustřeďte se na přesnost.",
    speed: (keys) =>
      keys.length > 0
        ? `Přesnost je v cíli. Držte stálý rytmus a zrychlete u ${keys.length === 1 ? "klávesy" : "kláves"} ${list(keys)}.`
        : "Přesnost je v cíli. Držte stálý rytmus a zrychlete.",
    met: (keys) =>
      keys.length > 0
        ? `Oba cíle jsou splněné. ${keys.length === 1 ? "Klávesu" : "Klávesy"} ${list(keys)} je ještě potřeba procvičit.`
        : "Oba cíle jsou splněné.",
  },
  stats: {
    loading: "Načítání",
    empty: "Zatím žádná cvičení. Dokončete cvičení a objeví se tady.",
    history: "Historie",
    speed: "Rychlost",
    wpmUnit: "slov/min",
    accuracy: "Přesnost",
    errorsByKey: "Chyby podle kláves",
    noErrors: "Žádné chyby.",
    mostMissed: "Nejčastěji chybné:",
    loadFailed: "Statistiky se nepodařilo načíst.",
    chart: (title, n, last, unit, min, max) =>
      `${title} za ${n === 1 ? "poslední cvičení" : `posledních ${n} cvičení`}: poslední ${last} ${unit}, nejnižší ${min}, nejvyšší ${max}.`,
  },
  data: {
    title: "Vaše data",
    export: "Exportovat",
    import: "Importovat",
    exported: "Exportováno.",
    exportFailed: "Export se nezdařil.",
    tooLarge: "Soubor je příliš velký na export z Tenfoldu.",
    notJson: "Soubor není platný JSON.",
    errors: {
      notExport: "Toto není exportní soubor Tenfoldu.",
      noFormat: "Soubor nemá platnou verzi formátu.",
      newer:
        "Soubor vytvořila novější verze Tenfoldu. Aktualizujte aplikaci a zkuste to znovu.",
      noSessions: "Soubor neobsahuje seznam cvičení.",
    },
    imported: "Importováno.",
    importedMemory:
      "Importováno jen pro tuto návštěvu. Ukládání není dostupné, takže data po zavření stránky zmizí a cvičení se neukládají.",
    importFailed: "Import se nezdařil. Nic se nezměnilo.",
    replaceTitle: "Nahradit vaše data?",
    replaceBody: (current, incoming) =>
      `Vaše nastavení, pokrok a uložená cvičení (${current}) se nahradí nastavením, pokrokem a cvičeními ze souboru (${incoming}). Tuto akci nelze vrátit zpět.`,
    skipped: (n) =>
      `${n} ${plural(n, "neplatné cvičení", "neplatná cvičení", "neplatných cvičení")} v souboru ${plural(n, "bude přeskočeno", "budou přeskočena", "bude přeskočeno")}.`,
    cancel: "Zrušit",
    replace: "Nahradit",
  },
};
