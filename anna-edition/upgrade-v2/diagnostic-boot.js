import {AnnaAppRuntime} from "/static/anna-apps/_sdk/latest/index.js";
import {mountMigrationDiagnostic} from "./diagnostic-view.js";
mountMigrationDiagnostic(document,()=>AnnaAppRuntime.connect());
