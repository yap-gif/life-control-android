import {AnnaAppRuntime} from "/static/anna-apps/_sdk/latest/index.js";
import {mountReadOnlyEntry} from "./readonly-entry.js";
mountReadOnlyEntry(document,window,()=>AnnaAppRuntime.connect());
