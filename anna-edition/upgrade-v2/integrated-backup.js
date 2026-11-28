import {canonicalJSON,utf8Bytes} from "../bundle/v2/workspace.js";
import {validateDomain} from "../bundle/v2/domain.js";
const enc=new TextEncoder(),dec=new TextDecoder("utf-8",{fatal:true});
const VERSION="life-control-app908-encrypted-v1",ITERATIONS=250000,LIMIT=32768;
const aad=enc.encode(VERSION+"|PBKDF2-SHA256|AES-256-GCM|250000");
const b64=b=>btoa(String.fromCharCode(...b));
const decode=(s,max)=>{if(typeof s!=="string"||s.length>Math.ceil(max/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(s)||s.length%4)throw Error("INVALID_ENVELOPE");const b=Uint8Array.from(atob(s),c=>c.charCodeAt(0));if(b.length>max||b64(b)!==s)throw Error("INVALID_ENVELOPE");return b;};
const fail=(code="INVALID_ENVELOPE")=>{throw Object.assign(Error(code),{code});};
const checkPass=pass=>{if(typeof pass!=="string"||pass.length<12||pass.length>256)fail("PASSPHRASE_INVALID");};
const checkCrypto=()=>{if(!globalThis.crypto?.subtle||typeof globalThis.crypto.getRandomValues!=="function")fail("CRYPTO_UNAVAILABLE");};
function checkWorkspace(w){try{if(validateDomain(w)!==true||utf8Bytes(w)>LIMIT)fail("DOMAIN_VALIDATION_FAILED");}catch{fail("DOMAIN_VALIDATION_FAILED");}}
async function key(pass,salt){
 checkPass(pass);checkCrypto();
 const bytes=enc.encode(pass);try{const material=await crypto.subtle.importKey("raw",bytes,"PBKDF2",false,["deriveKey"]);return await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:ITERATIONS,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);}catch{fail("KEY_DERIVATION_FAILED");}finally{bytes.fill(0);}
}
/** Offline encryption of the currently loaded snapshot, not the full account.
 * No remote I/O. Import verifies only; never replaces live data. */
export async function encryptWorkspace(workspace,pass){
 checkPass(pass);checkCrypto();checkWorkspace(workspace);
 const plain=enc.encode(canonicalJSON(workspace)),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 try{const k=await key(pass,salt);let cipher;try{cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:aad,tagLength:128},k,plain));}catch{fail("ENCRYPTION_FAILED");}
 return canonicalJSON({format:VERSION,iterations:ITERATIONS,salt:b64(salt),iv:b64(iv),ciphertext:b64(cipher)});}
 finally{plain.fill(0);}
}
export async function inspectWorkspaceBackup(text,pass,current){
 checkPass(pass);checkCrypto();
 if(typeof text!=="string"||text.length>50000)fail();
 let x,salt,iv,cipher;
 try{
  x=JSON.parse(text);if(!x||Object.keys(x).length!==5||x.format!==VERSION||x.iterations!==ITERATIONS)fail();
  salt=decode(x.salt,16);iv=decode(x.iv,12);cipher=decode(x.ciphertext,LIMIT+16);
  if(salt.length!==16||iv.length!==12||cipher.length<=16)fail();
 }catch{fail("INVALID_ENVELOPE");}
 const k=await key(pass,salt);let plain;
 try{
  try{plain=new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv,additionalData:aad,tagLength:128},k,cipher));}catch{fail("AUTHENTICATION_FAILED");}
  if(plain.length>LIMIT)fail("DOMAIN_VALIDATION_FAILED");
  let w;try{w=JSON.parse(dec.decode(plain));}catch{fail("DOMAIN_VALIDATION_FAILED");}
  checkWorkspace(w);if(current)checkWorkspace(current);
  return {revision:w.revision,bytes:utf8Bytes(w),sameWorkspace:current?canonicalJSON(w)===canonicalJSON(current):null,sameMigration:current?w.migration.id===current.migration.id:null,records:Object.fromEntries(Object.entries(w.collections).map(([k,v])=>[k,v.length])),restorePerformed:false};
 }finally{plain?.fill(0);}
}
export function createBackupPanel(doc,win,readWorkspace){
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const root=el("section");root.className="panel stack";root.append(el("h2","Encrypted local backup"),el("p","Generate and verify an AES-256-GCM encrypted JSON snapshot locally. Use a separate passphrase of 12–256 characters. Save the file or manually copy the encrypted text. Verification never restores or overwrites live data."));
 const password=(name)=>{const label=el("label",name),input=el("input");input.type="password";input.autocomplete="new-password";input.minLength=12;input.maxLength=256;label.append(input);root.append(label);return input;};
 const pass=password("Backup passphrase"),repeat=password("Repeat passphrase for export");
 const exportBtn=el("button","Export encrypted snapshot"),inspectBtn=el("button","Verify selected backup");exportBtn.type=inspectBtn.type="button";
 const fallback=el("div");fallback.hidden=true;
 const encryptedLabel=el("label","Verified encrypted JSON (manual save fallback)"),encrypted=el("textarea");encrypted.readOnly=true;encrypted.rows=5;encrypted.spellcheck=false;encryptedLabel.append(encrypted);
 const downloadBtn=el("button","Download verified encrypted JSON"),selectBtn=el("button","Select encrypted JSON"),clearBtn=el("button","Clear encrypted output");
 for(const b of [downloadBtn,selectBtn,clearBtn])b.type="button";
 fallback.append(el("p","Only encrypted text is shown. Select it and copy manually into a local UTF-8 .json file if downloading fails. Keep the password separate."),encryptedLabel,downloadBtn,selectBtn,clearBtn);
 const label=el("label","Encrypted JSON file"),file=el("input");file.type="file";file.accept=".json,application/json";label.append(file);root.append(exportBtn,fallback,label,inspectBtn);
 const result=el("pre","No backup operation performed.");result.style.whiteSpace="pre-wrap";result.style.overflowWrap="anywhere";result.setAttribute("role","status");root.append(result);
 const safeCodes=new Set(["PASSPHRASE_MISMATCH","PASSPHRASE_INVALID","CRYPTO_UNAVAILABLE","KEY_DERIVATION_FAILED","ENCRYPTION_FAILED","INVALID_ENVELOPE","AUTHENTICATION_FAILED","DOMAIN_VALIDATION_FAILED","BACKUP_SELF_CHECK_FAILED","FILE_READ_FAILED","PAGE_CHANGED","DOWNLOAD_UNAVAILABLE"]);
 let busy=false,revision=null;
 function clearOutput(){encrypted.value="";revision=null;fallback.hidden=true;}
 function download(){
  if(!root.isConnected||revision===null||!encrypted.value)fail("DOWNLOAD_UNAVAILABLE");
  let url,a;
  try{
   const blob=new win.Blob([encrypted.value],{type:"application/json"});url=win.URL.createObjectURL(blob);
   a=el("a");a.href=url;a.download="life-control-encrypted-r"+revision+".json";root.append(a);a.click();
   result.textContent="Encrypted snapshot self-check passed. Download requested; verify the file exists, or save the encrypted text manually.";
  }catch{fail("DOWNLOAD_UNAVAILABLE");}
  finally{a?.remove();if(url)win.setTimeout(()=>win.URL.revokeObjectURL(url),10000);}
 }
 function report(e){const code=safeCodes.has(e?.code)?e.code:"BACKUP_OPERATION_FAILED";result.textContent=code+". No live data changed."+(code==="DOWNLOAD_UNAVAILABLE"?" Save the verified encrypted text manually.":"");}
 async function run(exporting){
  if(busy)return;busy=true;exportBtn.disabled=inspectBtn.disabled=downloadBtn.disabled=selectBtn.disabled=clearBtn.disabled=true;
  const p=pass.value,again=repeat.value;pass.value=repeat.value="";
  if(exporting)clearOutput();result.textContent="Backup operation in progress…";
  try{
   checkPass(p);
   if(exporting){
    if(p!==again)fail("PASSPHRASE_MISMATCH");
    const snapshot=readWorkspace(),data=await encryptWorkspace(snapshot,p);
    let proof;try{proof=await inspectWorkspaceBackup(data,p,snapshot);}catch{fail("BACKUP_SELF_CHECK_FAILED");}
    if(proof.sameWorkspace!==true||proof.sameMigration!==true||proof.restorePerformed!==false)fail("BACKUP_SELF_CHECK_FAILED");
    if(!root.isConnected)fail("PAGE_CHANGED");
    revision=snapshot.revision;encrypted.value=data;fallback.hidden=false;
    download();
   }else{
    const f=file.files?.[0];if(!f||f.size>50000)fail("FILE_READ_FAILED");
    let text;try{text=await f.text();}catch{fail("FILE_READ_FAILED");}
    result.textContent=JSON.stringify(await inspectWorkspaceBackup(text,p,readWorkspace()),null,2);
   }
  }catch(e){report(e);}
  finally{file.value="";busy=false;exportBtn.disabled=inspectBtn.disabled=downloadBtn.disabled=selectBtn.disabled=clearBtn.disabled=false;}
 }
 exportBtn.addEventListener("click",()=>run(true));inspectBtn.addEventListener("click",()=>run(false));
 downloadBtn.addEventListener("click",()=>{if(!busy)try{download();}catch(e){report(e);}});
 selectBtn.addEventListener("click",()=>{if(!busy&&encrypted.value){encrypted.focus();encrypted.select();}});
 clearBtn.addEventListener("click",()=>{if(!busy){clearOutput();result.textContent="Encrypted output cleared locally. No live data changed.";}});
 return root;
}
