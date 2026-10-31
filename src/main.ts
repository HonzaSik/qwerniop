import { mount } from "svelte";
import App from "./App.svelte";
import { t } from "./ui/strings";
import { registerWorker } from "./ui/worker.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("Missing #app mount point");

document.documentElement.lang = t.language;
mount(App, { target });
if (import.meta.env.PROD) registerWorker();
