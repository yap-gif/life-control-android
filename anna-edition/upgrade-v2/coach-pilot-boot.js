import {AnnaAppRuntime} from "/static/anna-apps/_sdk/latest/index.js";
import {mountPersistentEntry} from "./coach-pilot-entry.js";
mountPersistentEntry(document,window,()=>AnnaAppRuntime.connect());
