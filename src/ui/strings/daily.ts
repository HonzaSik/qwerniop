import { t } from "./index";

// Apart from the other strings because only lazily loaded code shows them, and the first page load has a size budget.
const en = {
  title: "Daily challenge",
  intro:
    "The same words for everyone today, using every letter. Your first finished try is your score, so you can compare with friends. Later tries are practice. It counts in Stats but unlocks nothing.",
  start: "Start",
  again: "Try again",
  copy: "Copy result",
  copied: "Copied. Paste it to your friends.",
  copyFailed: "Could not copy. Your browser refused it.",
  scoreLabel: "Today's score",
  bestLabel: "Best",
  daysLabel: "Days played",
  practiceTitle: (date: string): string => `Daily challenge · ${date}`,
  score: (result: string): string => `Today's score: ${result}`,
  practice: (result: string): string =>
    `Practice. Today's score stays ${result}.`,
  share: (date: string, layout: string, result: string, url: string): string =>
    `Qwerniop daily ${date} · ${layout}\n${result}\n${url}`,
};

const cs: typeof en = {
  title: "Denní výzva",
  intro:
    "Dnes pro všechny stejná slova se všemi písmeny. Skóre je váš první dokončený pokus, takže se můžete porovnat s přáteli. Další pokusy jsou jen cvičení. Počítá se do statistik, ale nic neodemyká.",
  start: "Začít",
  again: "Zkusit znovu",
  copy: "Kopírovat výsledek",
  copied: "Zkopírováno. Pošlete to přátelům.",
  copyFailed: "Kopírování se nepovedlo. Prohlížeč ho odmítl.",
  scoreLabel: "Dnešní skóre",
  bestLabel: "Nejlepší",
  daysLabel: "Odehrané dny",
  practiceTitle: (date) => `Denní výzva · ${date}`,
  score: (result) => `Dnešní skóre: ${result}`,
  practice: (result) => `Cvičení. Dnešní skóre zůstává ${result}.`,
  share: (date, layout, result, url) =>
    `Qwerniop denní výzva ${date} · ${layout}\n${result}\n${url}`,
};

export const td: typeof en = new Proxy(en, {
  get: (_, key) => Reflect.get(t.language === "cs" ? cs : en, key),
});

/** "2 November" for a daily challenge's date. */
export function dailyDate(date: string): string {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(t.language, {
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
}
