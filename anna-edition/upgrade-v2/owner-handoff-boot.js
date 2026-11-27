import {AnnaAppRuntime} from "/static/anna-apps/_sdk/latest/index.js";
import {mountOwnerHandoff} from "./owner-handoff-entry.js";
mountOwnerHandoff(document,window,()=>AnnaAppRuntime.connect());
