import {AnnaAppRuntime} from "/static/anna-apps/_sdk/latest/index.js";
import {mountCapacityProbe} from "./capacity-probe-entry.js";
mountCapacityProbe(document,()=>AnnaAppRuntime.connect());
