import {AnnaAppRuntime} from "/static/anna-apps/_sdk/latest/index.js";
import {mountPersistentEntry} from "./continuous-entry.js";
mountPersistentEntry(document,window,()=>AnnaAppRuntime.connect());
