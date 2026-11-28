import {AnnaAppRuntime} from "/static/anna-apps/_sdk/latest/index.js";
import {mountPersistentEntry} from "./persistent-entry.js";
mountPersistentEntry(document,window,()=>AnnaAppRuntime.connect());
