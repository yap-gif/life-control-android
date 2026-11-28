import {canonicalJSON,utf8Bytes} from "../bundle/v2/workspace.js";
import {validateDomain} from "../bundle/v2/domain.js";
const enc=new TextEncoder(),dec=new TextDecoder("utf-8",{fatal:true});
const VERSION="life-control-app908-encrypted-v1",ITERATIONS=250000,LIMIT=32768;
const aad=enc.encode(VERSION+"|PBKDF2-SHA256|AES-256-GCM|250000");
const b64=b=>btoa(String.fromCharCode(...b));
const decode=(s,max)=>{if(typeof s!=="string"||s.length>Math.ceil(max/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(s)||s.length%4)throw Error("INVALID_ENVELOPE");const b=Uint8Array.from(atob(s),c=>c.charCodeAt(0));if(b.length>max||b64(b)!==s)throw Error("INVALID_ENVELOPE");return b;};
const fail=()=>{throw Error("BACKUP_INVALID_OR_WRONG_PASSPHRASE");};
async function key(pass,salt){
 if(typeof pass!=="string"||pass.length<12||pass.length>256)fail();
 const bytes=enc.encode(pass);try{const material=await crypto.subtle.importKey("raw",bytes,"PBKDF2",false,["deriveKey"]);return await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:ITERATIONS,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);}finally{bytes.fill(0);}
}
/** Offline encryption of the currently loaded snapshot, not the full account.
 * No remote I/O. Import verifies only; never replaces live data. */
export async function encryptWorkspace(workspace,pass){
 validateDomain(workspace);if(utf8Bytes(workspace)>LIMIT)fail();
 const plain=enc.encode(canonicalJSON(workspace)),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 try{const k=await key(pass,salt),cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:aad,tagLength:128},k,plain));
 return canonicalJSON({format:VERSION,iterations:ITERATIONS,salt:b64(salt),iv:b64(iv),ciphertext:b64(cipher)});}
 finally{plain.fill(0);}
}
export async function inspectWorkspaceBackup(text,pass,current){
 if(typeof text!=="string"||text.length>50000)fail();
 let plain;
 try{
 const x=JSON.parse(text);if(!x||Object.keys(x).length!==5||x.format!==VERSION||x.iterations!==ITERATIONS)fail();
 const salt=decode(x.salt,16),iv=decode(x.iv,12),cipher=decode(x.ciphertext,LIMIT+16);if(salt.length!==16||iv.length!==12||cipher.length<=16)fail();
 plain=new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv,additionalData:aad,tagLength:128},await key(pass,salt),cipher));
 if(plain.length>LIMIT)fail();const w=JSON.parse(dec.decode(plain));validateDomain(w);if(current)validateDomain(current);
 return {revision:w.revision,bytes:utf8Bytes(w),sameWorkspace:current?canonicalJSON(w)===canonicalJSON(current):null,sameMigration:current?w.migration.id===current.migration.id:null,records:Object.fromEntries(Object.entries(w.collections).map(([k,v])=>[k,v.length])),restorePerformed:false};
 }catch{fail();}finally{plain?.fill(0);}
}
export function createBackupPanel(doc,win,readWorkspace){
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const root=el("section");root.className="panel stack";root.append(el("h2","Encrypted local backup"),el("p","Export the current loaded snapshot (including saved AI evidence) as AES-256-GCM encrypted JSON. Use a separate passphrase of at least 12 characters. Keep the file and passphrase safe. Inspect an encrypted backup locally without restoring or overwriting any data."));
 const password=(name)=>{const label=el("label",name),input=el("input");input.type="password";input.autocomplete="new-password";input.minLength=12;input.maxLength=256;label.append(input);root.append(label);return input;};
 const pass=password("Backup passphrase"),repeat=password("Repeat passphrase for export");
 const exportBtn=el("button","Export encrypted snapshot"),inspectBtn=el("button","Verify selected backup");exportBtn.type=inspectBtn.type="button";
 const label=el("label","Encrypted JSON file"),file=el("input");file.type="file";file.accept=".json,application/json";label.append(file);root.append(exportBtn,label,inspectBtn);
 const result=el("pre","No backup operation performed.");result.style.whiteSpace="pre-wrap";result.style.overflowWrap="anywhere";result.setAttribute("role","status");root.append(result);
 let busy=false;
 async function run(exporting){if(busy)return;busy=true;exportBtn.disabled=inspectBtn.disabled=true;const p=pass.value,again=repeat.value;pass.value=repeat.value="";
 try{
   if(exporting){if(p!==again)throw Error("Passphrases differ");const snapshot=readWorkspace(),data=await encryptWorkspace(snapshot,p);
    if(!root.isConnected)throw Error("Page changed");const blob=new win.Blob([data],{type:"application/json"}),url=win.URL.createObjectURL(blob),a=el("a");a.href=url;a.download="life-control-encrypted-r"+snapshot.revision+".json";root.append(a);try{a.click();}finally{a.remove();win.setTimeout(()=>win.URL.revokeObjectURL(url),1000);}result.textContent="Encrypted download requested. Verify the file exists before relying on it.";
   }else{const f=file.files?.[0];if(!f||f.size>50000)throw Error("Select valid backup");result.textContent=JSON.stringify(await inspectWorkspaceBackup(await f.text(),p,readWorkspace()),null,2);}
 }catch{result.textContent="Backup operation stopped. Check the passphrase, file and Host download support. No data changed.";}
 finally{file.value="";busy=false;exportBtn.disabled=inspectBtn.disabled=false;}
 }
 exportBtn.addEventListener("click",()=>run(true));inspectBtn.addEventListener("click",()=>run(false));return root;
}
