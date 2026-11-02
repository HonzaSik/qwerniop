import type { PetMoment, PetState } from "../../core/stats/pet";
import type { PetMemory } from "../../core/stats/pet-memories";
import { plural } from "./cs";
import { t } from "./index";

// Apart from the other strings because only lazily loaded code shows them, and the first page load has a size budget.
const en = {
  unnamed: "Your pet",
  askName: (egg: boolean): string =>
    egg
      ? "You found an egg! What will you call it?"
      : "Your pet needs a name. What will you call it?",
  giveName: "Name it",
  nameOnce: "You choose this once, so make it a good one.",
  moment: (moment: PetMoment, name: string): string => {
    switch (moment.kind) {
      case "reborn":
        return `${name} is back as a new egg. Stay a while this time.`;
      case "missed":
        return `You came back after ${moment.days} days. ${name} missed you.`;
      case "stage":
        return `${name} grew into a ${en.stages[moment.stage].toLowerCase()}!`;
      case "level":
        return `${name} reached level ${moment.level}!`;
      case "speed":
        return `${moment.wpm} wpm is your best yet. ${name} is cheering!`;
      case "key":
        return `${name} saw you beat the ${moment.key.toUpperCase()} key.`;
      case "clean":
        return `Not one wrong key. ${name} is proud of you.`;
    }
  },
  together: "Together for",
  stages: {
    egg: "Egg",
    hatchling: "Hatchling",
    seedling: "Seedling",
    sprout: "Sprout",
    sapling: "Sapling",
    bush: "Bush",
    bloom: "Bloom",
    guardian: "Guardian",
  },
  label: (pet: PetState, name: string): string => {
    const who = `${name}: ${en.stages[pet.stage].toLowerCase()}, level ${pet.level}`;
    return pet.mood === "dead"
      ? `${who}, dead`
      : pet.mood === "hungry"
        ? `${who}, hungry`
        : `${who}, content`;
  },
  level: "Level",
  toLevel: (level: number): string => `Progress to level ${level}`,
  status: (pet: PetState, name: string): string =>
    pet.mood === "dead"
      ? `${name} died after 14 days without practice. Finish a session and ${name} comes back as a new egg. Your typing progress is safe.`
      : pet.mood === "hungry"
        ? `${name} is hungry: ${pet.daysAway} days without practice. One session fixes it.`
        : pet.toNext === undefined
          ? `${name} reached the top level.`
          : `${pet.toNext} min to level ${pet.level + 1}.`,
  note: (name: string): string =>
    `${name} grows with practice, up to 60 minutes a day. Gets hungry after 4 days without practice and dies after 14.`,
  stageLabel: "Stage",
  age: "Age",
  days: (n: number): string => `${n} ${n === 1 ? "day" : "days"}`,
  counted: "Practice counted",
  toNext: "To next level",
  last: "Last practised",
  lost: "Lives lost",
  greeting: (pet: PetState, name: string): string => {
    if (pet.mood !== "content") return en.status(pet, name);
    if (pet.daysAway === 0) return `${name} is ready when you are.`;
    if (pet.daysAway === 1) return `${name} is glad you are back.`;
    return `${name} waited ${pet.daysAway} days for you.`;
  },
  memories: "Memories",
  day: (day: number): string => `Day ${day}`,
  memory: (memory: PetMemory, name: string): string => {
    switch (memory.kind) {
      case "met":
        return "You found the egg";
      case "stage":
        return `${name} grew into a ${en.stages[memory.stage].toLowerCase()}`;
      case "lost":
        return `${name} died`;
      case "back":
        return `${name} came back as a new egg`;
      case "speed":
        return `First session at ${memory.wpm} wpm`;
      case "clean":
        return "First session with no wrong keys";
    }
  },
};

const cs: typeof en = {
  unnamed: "Mazlíček",
  askName: (egg) =>
    egg
      ? "Našli jste vajíčko! Jak se bude jmenovat?"
      : "Váš mazlíček potřebuje jméno. Jak se bude jmenovat?",
  giveName: "Pojmenovat",
  nameOnce: "Vybíráte jen jednou, tak ať stojí za to.",
  moment: (moment, name) => {
    switch (moment.kind) {
      case "reborn":
        return `${name} je zpět jako nové vajíčko. Tentokrát zůstaňte déle.`;
      case "missed":
        return `Po ${moment.days} dnech jste zpět a ${name} už nemá hlad.`;
      case "stage":
        return `${name} postupuje do nové fáze: ${cs.stages[moment.stage].toLowerCase()}!`;
      case "level":
        return `${name} je teď na úrovni ${moment.level}!`;
      case "speed":
        return `${moment.wpm} slov za minutu je váš rekord. ${name} jásá!`;
      case "key":
        return `Klávesa ${moment.key.toUpperCase()} vás už nezradila a ${name} má radost.`;
      case "clean":
        return `Ani jedna chyba. ${name} má radost.`;
    }
  },
  together: "Spolu už",
  stages: {
    egg: "Vajíčko",
    hatchling: "Mládě ve skořápce",
    seedling: "Semenáček",
    sprout: "Výhonek",
    sapling: "Stromek",
    bush: "Keřík",
    bloom: "V květu",
    guardian: "Strážce",
  },
  label: (pet, name) => {
    const who = `${name}, ${cs.stages[pet.stage].toLowerCase()}, úroveň ${pet.level}`;
    return pet.mood === "dead"
      ? `${who}: nežije`
      : pet.mood === "hungry"
        ? `${who}: má hlad`
        : `${who}: v pohodě`;
  },
  level: "Úroveň",
  toLevel: (level) => `Postup na úroveň ${level}`,
  status: (pet, name) =>
    pet.mood === "dead"
      ? `Mazlíček ${name} zemřel po 14 dnech bez cvičení. Po dalším cvičení se vrátí jako nové vajíčko. O pokrok v psaní nepřijdete.`
      : pet.mood === "hungry"
        ? `${name} má hlad: ${pet.daysAway} ${plural(pet.daysAway, "den", "dny", "dní")} bez cvičení. Stačí jedno cvičení.`
        : pet.toNext === undefined
          ? `Mazlíček ${name} dosáhl nejvyšší úrovně.`
          : `Do úrovně ${pet.level + 1} zbývá ${pet.toNext} min.`,
  note: (name) =>
    `${name} roste se cvičením, nejvýše 60 minut denně. Po 4 dnech bez cvičení má hlad, po 14 zemře.`,
  stageLabel: "Fáze",
  age: "Věk",
  days: (n) => `${n} ${plural(n, "den", "dny", "dní")}`,
  counted: "Započtené cvičení",
  toNext: "Do další úrovně",
  last: "Naposledy cvičeno",
  lost: "Ztracené životy",
  greeting: (pet, name) => {
    if (pet.mood !== "content") return cs.status(pet, name);
    if (pet.daysAway === 0) return `${name} čeká, až začnete.`;
    if (pet.daysAway === 1) return `${name} má radost, že jste zpět.`;
    return `${name} na vás čeká už ${pet.daysAway} dny.`;
  },
  memories: "Vzpomínky",
  day: (day) => `Den ${day}`,
  memory: (memory, name) => {
    switch (memory.kind) {
      case "met":
        return "Našli jste vajíčko";
      case "stage":
        return `${name} postupuje do nové fáze: ${cs.stages[memory.stage].toLowerCase()}`;
      case "lost":
        return `Mazlíček ${name} zemřel`;
      case "back":
        return `${name} je zpět jako nové vajíčko`;
      case "speed":
        return `Poprvé ${memory.wpm} slov za minutu`;
      case "clean":
        return "První cvičení bez chyby";
    }
  },
};

/** Follows the language setting, as `t` does. */
export const tp: typeof en = new Proxy(en, {
  get: (_, key) => Reflect.get(t.language === "cs" ? cs : en, key),
});
