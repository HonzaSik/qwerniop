import type { AiMode, Language } from "../../core/settings/settings";
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
    settings: "Nastavení",
  },
  updateAvailable: "Je dostupná aktualizace",
  updateReload: "Načíst znovu",
  layoutLabel: "Rozložení",
  layoutNames: { "en-us": "Angličtina (US)", "cs-qwertz": "Čeština (QWERTZ)" },
  lengthLabel: "Délka",
  reduceMotionLabel: "Omezit pohyb",
  reduceMotionModes: { system: "Podle systému", on: "Zapnuto", off: "Vypnuto" },
  words: (n) => `${n} ${plural(n, "slovo", "slova", "slov")}`,
  seconds: (n) => (n < 60 ? `${n} s` : `${n / 60} min`),
  keyboardLabel: "Klávesnice",
  keyboardModes: {
    fingers: "Barvy prstů",
    next: "Jen další klávesa",
    hidden: "Skrytá",
  },
  wordListError: "Seznam slov se nepodařilo načíst.",
  tryAgain: "Zkusit znovu",
  help: {
    title: "Klávesové zkratky",
    close: "Zavřít",
    items: [
      ["Enter", "Pokračovat na další lekci"],
      ["R", "Zopakovat lekci"],
      ["Esc", "Pozastavit při psaní, jinde zpět na Procvičování"],
      [",", "Otevřít Nastavení"],
      ["?", "Zobrazit tuto nápovědu"],
    ],
  },
  settings: {
    title: "Nastavení",
    general: "Obecné",
    practice: "Cvičení",
    accessibility: "Přístupnost",
    appearance: "Vzhled",
    themeLabel: "Motiv",
    themeNames: {
      system: "Podle systému",
      light: "Světlý",
      dark: "Tmavý",
      oled: "Černý (OLED)",
    },
    accentLabel: "Barva zvýraznění",
    accentNames: {
      blue: "Modrá",
      green: "Zelená",
      purple: "Fialová",
      orange: "Oranžová",
    },
    textSizeLabel: "Velikost textu",
    textSizeNames: {
      small: "Malá",
      medium: "Střední",
      large: "Velká",
    },
    caretLabel: "Kurzor",
    caretNames: {
      bar: "Svislá čára",
      block: "Blok",
      underline: "Podtržení",
    },
    errorModeLabel: "Při chybné klávese",
    errorModeNames: {
      stop: "Zastavit do opravy",
      continue: "Pokračovat dál",
    },
    liveStats: "Zobrazovat rychlost a přesnost při psaní",
    languageLabel: "Jazyk",
    languageNames: {
      system: "Podle systému",
      en: "English",
      cs: "Čeština",
    } as Record<Language, string>,
    modelServer: "Model server",
    intro:
      "Volitelné. Model běžící na vašem počítači může psát cvičné texty. Tenfold funguje stejně i bez něj. Odesílají se jen zadání a statistiky cvičení, nikdy to, co píšete.",
    baseUrl: "Adresa",
    enabled: "Používat model server",
    modes: "Cvičný materiál",
    modeNames: {
      lesson: "Text lekce",
      topic: "Učení tématu",
      code: "Úryvky kódu",
      feedback: "Zpětná vazba ke cvičení",
    } as Record<AiMode, string>,
    topic: "Téma",
    topicNote:
      "Pro učení tématu, jakmile jsou odemčena všechna písmena. Například: jak fungují vakcíny.",
    model: "Model",
    noModel: "Spusťte test a vyberte model",
    apiKey: "Klíč API (volitelný)",
    apiKeyNote: "Uložen jen v tomto zařízení a není součástí exportu.",
    test: "Vyzkoušet připojení",
    testing: "Zkouším",
    connected: (n: number): string => `Připojeno. Nalezeno modelů: ${n}.`,
    errors: {
      network: "Server se nepodařilo zastihnout.",
      http: "Server požadavek odmítl. Zkontrolujte adresu a klíč API.",
      timeout: "Server odpovídal příliš dlouho.",
      "bad-response": "Server odpověděl, ale v neočekávaném formátu.",
      server: "Server hlásí chybu.",
    },
    corsTitle: "Pokud server běží, možná blokuje tuto stránku",
    corsIntro:
      "Prohlížeč dovolí Tenfoldu volat místní server jen tehdy, když server povolí jeho původ.",
    corsOllama: (origin: string): string =>
      `Ollama: spusťte ji s proměnnou OLLAMA_ORIGINS, která obsahuje ${origin}, například OLLAMA_ORIGINS="${origin}".`,
    corsLmStudio: "LM Studio: zapněte CORS v nastavení serveru.",
    corsOther:
      "Jiné servery: povolení požadavků z jiných původů najdete v jejich dokumentaci.",
  },
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
    connectKeyboard: "Pro cvičení připojte klávesnici",
  },
  summary: {
    label: "Výsledky cvičení",
    wpm: "Slov/min",
    accuracy: "Přesnost",
    time: "Čas",
    weakest: "Nejslabší klávesy",
    next: "Pokračovat",
    repeat: "Opakovat",
    recap: "Zamyslete se:",
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
    practice: "Cvičení",
    today: (minutes) =>
      minutes === 0 ? "Dnes zatím bez cvičení" : `Dnes: ${minutes} min`,
    minutes: (n) => `${n} min`,
    less: "Méně",
    more: "Více",
    previousMonth: "Předchozí měsíc",
    nextMonth: "Další měsíc",
    dayTip: (minutes, sessions) =>
      sessions === 0 ? "Bez cvičení" : `${minutes} min · ${sessions} cvičení`,
    monthSummary: (days, minutes) =>
      `Dny s cvičením: ${days}, celkem ${minutes} min.`,
    weekStart: 1,
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
