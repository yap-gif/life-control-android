import {mountPreview} from "./ui.js";
import {createDemoStore} from "./demo-store.js";
try{await mountPreview(document,window,await createDemoStore());}catch{document.getElementById("status").textContent="Preview could not initialize. No real data was accessed.";document.getElementById("status").classList.add("error");}
