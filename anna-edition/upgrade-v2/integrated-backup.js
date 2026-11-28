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
async function decryptLegacyWorkspace(text,pass){
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
  checkWorkspace(w);return w;
 }finally{plain?.fill(0);}
}
function backupProof(w,current){
 if(current)checkWorkspace(current);
 return {revision:w.revision,bytes:utf8Bytes(w),sameWorkspace:current?canonicalJSON(w)===canonicalJSON(current):null,sameMigration:current?w.migration.id===current.migration.id:null,records:Object.fromEntries(Object.entries(w.collections).map(([k,v])=>[k,v.length])),restorePerformed:false};
}
export async function inspectWorkspaceBackup(text,pass,current){return backupProof(await decryptLegacyWorkspace(text,pass),current);}
export function createBackupPanel(doc,win,readWorkspace){
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const root=el("section");root.className="panel stack";root.append(el("h2","Legacy encrypted backup (v1)"),el("p","Generate and verify an AES-256-GCM encrypted JSON snapshot locally. Use a separate passphrase of 12–256 characters. Save the file or manually copy the encrypted text. Verification never restores or overwrites live data."));
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


// Recovery-capable backup v2. All operations are local and file-only.
// Separate random DEK, two independently authenticated key slots, authenticated
// envelope metadata and a fixed, bounded parser. Never returns plaintext to UI.
const RECOVERY_FORMAT="life-control-app908-encrypted-v2",RECOVERY_ITERATIONS=600000,RECOVERY_LIMIT=52000;
const random=n=>crypto.getRandomValues(new Uint8Array(n));
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
export function generateBackupRecoveryKey(){checkCrypto();const b=random(32);try{return hex(b).match(/.{8}/g).join("-");}finally{b.fill(0);}}
export function generateBackupPassword(){checkCrypto();const b=random(24);try{return b64(b).replace(/\+/g,"-").replace(/\//g,"_");}finally{b.fill(0);}}
function recoveryBytes(value){
 if(typeof value!=="string"||! /^(?:[0-9a-fA-F]{64}|[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{8}){7})$/.test(value.trim()))fail("RECOVERY_KEY_INVALID");
 return Uint8Array.from(value.trim().replace(/-/g,"").match(/../g),x=>parseInt(x,16));
}
function exact(x,keys){return x!==null&&typeof x==="object"&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));}
function fixed(s,n){const b=decode(s,n);if(b.length!==n)fail();return b;}
const recoveryHeader=()=>({format:RECOVERY_FORMAT,algorithm:"AES-256-GCM",iterations:RECOVERY_ITERATIONS});
const slotAAD=(kind,salt)=>enc.encode(canonicalJSON({...recoveryHeader(),purpose:"dek-wrap",kind,salt}));
const payloadAAD=(password,recovery)=>enc.encode(canonicalJSON({...recoveryHeader(),purpose:"workspace",password,recovery}));
async function passwordKEK(pass,salt){
 checkPass(pass);const bytes=enc.encode(pass);
 try{const material=await crypto.subtle.importKey("raw",bytes,"PBKDF2",false,["deriveKey"]);return await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:RECOVERY_ITERATIONS,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);}
 finally{bytes.fill(0);}
}
async function recoveryKEK(value,salt){
 const bytes=recoveryBytes(value);
 try{const material=await crypto.subtle.importKey("raw",bytes,"HKDF",false,["deriveKey"]);return await crypto.subtle.deriveKey({name:"HKDF",salt,hash:"SHA-256",info:enc.encode(RECOVERY_FORMAT+"|recovery-wrap")},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);}
 finally{bytes.fill(0);}
}
async function seal(k,iv,aad,bytes){return new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:aad,tagLength:128},k,bytes));}
async function unseal(k,iv,aad,bytes){try{return new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv,additionalData:aad,tagLength:128},k,bytes));}catch{fail("AUTHENTICATION_FAILED");}}
async function makeSlot(kind,credential,dek){
 const salt=random(16),iv=random(12),s=b64(salt);
 const k=kind==="password"?await passwordKEK(credential,salt):await recoveryKEK(credential,salt);
 return {salt:s,iv:b64(iv),wrapped:b64(await seal(k,iv,slotAAD(kind,s),dek))};
}
export async function encryptRecoveryBackup(workspace,pass,recoveryKey){
 checkCrypto();checkPass(pass);checkWorkspace(workspace);
 const probe=recoveryBytes(recoveryKey);probe.fill(0);
 const dek=random(32),plain=enc.encode(canonicalJSON(workspace)),iv=random(12);
 try{
  const password=await makeSlot("password",pass,dek),recovery=await makeSlot("recovery",recoveryKey,dek);
  const k=await crypto.subtle.importKey("raw",dek,"AES-GCM",false,["encrypt"]);
  const ciphertext=b64(await seal(k,iv,payloadAAD(password,recovery),plain));
  return canonicalJSON({...recoveryHeader(),password,recovery,iv:b64(iv),ciphertext});
 }finally{dek.fill(0);plain.fill(0);}
}
function parseRecovery(text){
 if(typeof text!=="string"||text.length>RECOVERY_LIMIT)fail();
 try{
  const x=JSON.parse(text);
  if(!exact(x,["format","algorithm","iterations","password","recovery","iv","ciphertext"])||x.format!==RECOVERY_FORMAT||x.algorithm!=="AES-256-GCM"||x.iterations!==RECOVERY_ITERATIONS)fail();
  for(const slot of [x.password,x.recovery]){
   if(!exact(slot,["salt","iv","wrapped"]))fail();
   fixed(slot.salt,16);fixed(slot.iv,12);fixed(slot.wrapped,48);
  }
  fixed(x.iv,12);if(decode(x.ciphertext,LIMIT+16).length<=16)fail();
  return x;
 }catch{fail("INVALID_ENVELOPE");}
}
async function unlockRecovery(text,credential,method){
 checkCrypto();
 if(method!=="password"&&method!=="recovery")fail("UNLOCK_METHOD_INVALID");
 const x=parseRecovery(text),slot=x[method],salt=fixed(slot.salt,16);
 const k=method==="password"?await passwordKEK(credential,salt):await recoveryKEK(credential,salt);
 let dek,plain;
 try{
  dek=await unseal(k,fixed(slot.iv,12),slotAAD(method,slot.salt),fixed(slot.wrapped,48));
  if(dek.length!==32)fail();
  const dataKey=await crypto.subtle.importKey("raw",dek,"AES-GCM",false,["decrypt"]);
  plain=await unseal(dataKey,fixed(x.iv,12),payloadAAD(x.password,x.recovery),decode(x.ciphertext,LIMIT+16));
  let w;try{w=JSON.parse(dec.decode(plain));}catch{fail("DOMAIN_VALIDATION_FAILED");}
  if(plain.length>LIMIT)fail("DOMAIN_VALIDATION_FAILED");checkWorkspace(w);return w;
 }finally{dek?.fill(0);plain?.fill(0);}
}
async function unlockAny(text,credential,method){
 if(typeof text!=="string"||text.length>RECOVERY_LIMIT)fail();
 let format;try{format=JSON.parse(text)?.format;}catch{fail();}
 if(format===VERSION){if(method!=="password")fail("LEGACY_PASSWORD_REQUIRED");return decryptLegacyWorkspace(text,credential);}
 if(format!==RECOVERY_FORMAT)fail();
 return unlockRecovery(text,credential,method);
}
export async function inspectRecoveryBackup(text,credential,method,current){return backupProof(await unlockAny(text,credential,method),current);}
async function checkedRecoveryExport(w,pass,recoveryKey){
 const text=await encryptRecoveryBackup(w,pass,recoveryKey);
 for(const [credential,method] of [[pass,"password"],[recoveryKey,"recovery"]]){
  const proof=await inspectRecoveryBackup(text,credential,method,w);
  if(proof.sameWorkspace!==true||proof.sameMigration!==true||proof.restorePerformed!==false)fail("BACKUP_SELF_CHECK_FAILED");
 }
 return text;
}
export async function reencryptBackup(text,credential,method,newPass,newRecoveryKey){
 const w=await unlockAny(text,credential,method);
 return {text:await checkedRecoveryExport(w,newPass,newRecoveryKey),revision:w.revision,restorePerformed:false};
}

// New v2 panel is isolated from the legacy panel; no runtime or store mutation API.
export function createRecoveryBackupPanel(doc,win,readWorkspace){
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const root=el("section");root.className="panel stack";
 root.append(el("h2","Encrypted backup with recovery key (recommended v2)"),
 el("p","A password OR the separate recovery key unlocks this backup. If both are lost and the original data is unavailable, recovery is impossible. Save the key separately in a password manager or secure offline location; anyone with it can unlock its backup. The optional key download is an UNENCRYPTED secret file. Never store it alongside the encrypted backup. No live restore or data writes."));
 const field=(name,type="password")=>{const l=el("label",name),i=el("input");i.type=type;i.autocomplete="off";i.spellcheck=false;l.append(i);root.append(l);return i;};
 const button=(name,fn)=>{const b=el("button",name);b.type="button";b.addEventListener("click",fn);root.append(b);return b;};
 const pass=field("New backup passphrase"),repeat=field("Repeat new passphrase");
 pass.autocomplete=repeat.autocomplete="new-password";pass.maxLength=repeat.maxLength=256;
 const strength=el("p","Use a unique random password or a long passphrase (12–256 characters). Length is not a guarantee of strength.");root.append(strength);
 const updateStrength=()=>{strength.textContent=pass.value.length<12?"Too short (minimum 12 characters).":pass.value.length<20?"Length accepted; a longer unique password is recommended.":"Length accepted (20+ characters); avoid reused or predictable passwords.";};
 pass.addEventListener("input",updateStrength);
 const show=button("Show / hide passphrases",()=>{const type=pass.type==="password"?"text":"password";pass.type=repeat.type=unlock.type=type;});
 const generate=button("Generate random password",()=>{try{pass.value=repeat.value=generateBackupPassword();updateStrength();result.textContent="Random password generated. Store it in a password manager before export.";}catch(e){report(e);}});
 const keyLabel=el("label","Recovery key (save separately)"),keyDisplay=el("input");keyDisplay.type="text";keyDisplay.readOnly=true;keyDisplay.autocomplete="off";keyDisplay.spellcheck=false;keyLabel.append(keyDisplay);root.append(keyLabel);
 const confirm=field("Re-enter saved recovery key");confirm.maxLength=80;
 const result=el("pre","No recovery backup operation performed.");result.style.whiteSpace="pre-wrap";result.style.overflowWrap="anywhere";result.setAttribute("role","status");
 let busy=false,recoveryKey="",recoveryId="",outName=null;
 const safe=new Set(["PASSPHRASE_INVALID","PASSPHRASE_MISMATCH","RECOVERY_KEY_INVALID","RECOVERY_KEY_CONFIRMATION_REQUIRED","CRYPTO_UNAVAILABLE","INVALID_ENVELOPE","AUTHENTICATION_FAILED","DOMAIN_VALIDATION_FAILED","LEGACY_PASSWORD_REQUIRED","UNLOCK_METHOD_INVALID","BACKUP_SELF_CHECK_FAILED","FILE_READ_FAILED","DOWNLOAD_UNAVAILABLE","PAGE_CHANGED"]);
 function report(e){result.textContent=(safe.has(e?.code)?e.code:"BACKUP_OPERATION_FAILED")+". No live data changed.";}
 function clearKey(){recoveryKey=recoveryId="";keyDisplay.value=confirm.value="";}
 function clearOutput(){output.value="";outName=null;download.disabled=select.disabled=true;}
 function saveFile(text,name,type){let url,a;try{if(!root.isConnected)fail("PAGE_CHANGED");url=win.URL.createObjectURL(new win.Blob([text],{type}));a=el("a");a.href=url;a.download=name;root.append(a);a.click();}catch{fail("DOWNLOAD_UNAVAILABLE");}finally{a?.remove();if(url)win.setTimeout(()=>win.URL.revokeObjectURL(url),10000);}}
 const newKey=button("Generate new recovery key",()=>{try{clearKey();recoveryKey=generateBackupRecoveryKey();recoveryId=hex(random(16));keyDisplay.value=recoveryKey;result.textContent="Save the recovery key separately, then re-enter it to confirm. Generating a new key does not change existing backups.";}catch(e){report(e);}});
 const saveKey=button("Download recovery key separately",()=>{try{if(!recoveryKey)fail("RECOVERY_KEY_CONFIRMATION_REQUIRED");saveFile(recoveryKey+"\n","life-control-recovery-key-"+recoveryId+".txt","text/plain");result.textContent="UNENCRYPTED recovery key download requested. Move it to a secure location separate from the backup. Confirm by re-entering the saved key.";}catch(e){report(e);}});
 const exportBtn=button("Export recovery-protected snapshot",()=>run("export"));
 const fileLabel=el("label","Encrypted backup file (v1 or v2)"),file=el("input");file.type="file";file.accept=".json,application/json";fileLabel.append(file);root.append(fileLabel);
 const methodLabel=el("label","Unlock using"),method=el("select");for(const [v,t] of [["password","Password"],["recovery","Recovery key"]]){const o=el("option",t);o.value=v;method.append(o);}methodLabel.append(method);root.append(methodLabel);
 const unlock=field("Existing backup password or recovery key");unlock.maxLength=256;
 const verifyBtn=button("Verify recovery or legacy backup",()=>run("verify"));
 root.append(el("p","Forgot password? Select the old file, choose Recovery key and enter it. Generate a new recovery key and new password above, then re-encrypt. Legacy v1 needs its original password."));
 const rotateBtn=button("Re-encrypt selected backup with new password and key",()=>run("rotate"));
 const outLabel=el("label","Verified encrypted JSON (manual save fallback)"),output=el("textarea");output.readOnly=true;output.rows=5;output.spellcheck=false;outLabel.append(output);root.append(outLabel);
 const download=button("Download verified recovery backup again",()=>{try{if(!output.value||!outName)fail("DOWNLOAD_UNAVAILABLE");saveFile(output.value,outName,"application/json");result.textContent="Verified encrypted backup download requested.";}catch(e){report(e);}});
 const select=button("Select recovery backup ciphertext",()=>{output.focus();output.select();});
 const clear=button("Clear recovery panel secrets and output",()=>{clearKey();clearOutput();pass.value=repeat.value=unlock.value=file.value="";pass.type=repeat.type=unlock.type="password";updateStrength();result.textContent="Local fields cleared. Previously downloaded files are unchanged.";});
 root.append(result);clearOutput();
 const controls=[pass,repeat,confirm,unlock,file,method,show,generate,newKey,saveKey,exportBtn,verifyBtn,rotateBtn,download,select,clear];
 function checkedNew(p,again,c){
  checkPass(p);if(p!==again)fail("PASSPHRASE_MISMATCH");
  if(!recoveryKey||!recoveryId)fail("RECOVERY_KEY_CONFIRMATION_REQUIRED");
  const b=recoveryBytes(c);try{if(hex(b)!==recoveryKey.replace(/-/g,""))fail("RECOVERY_KEY_CONFIRMATION_REQUIRED");}finally{b.fill(0);}
  return recoveryKey;
 }
 async function selected(f){if(!f||f.size>RECOVERY_LIMIT)fail("FILE_READ_FAILED");try{return await f.text();}catch{fail("FILE_READ_FAILED");}}
 async function run(operation){
  if(busy)return;busy=true;for(const control of controls)control.disabled=true;
  if(operation!=="verify")clearOutput();
  const p=pass.value,again=repeat.value,c=confirm.value,credential=unlock.value,how=method.value,f=file.files?.[0];
  pass.value=repeat.value=confirm.value=unlock.value="";pass.type=repeat.type=unlock.type="password";updateStrength();
  result.textContent="Local backup operation in progress...";
  try{
   if(operation==="verify"){
    const proof=await inspectRecoveryBackup(await selected(f),credential,how,readWorkspace());
    if(!root.isConnected)fail("PAGE_CHANGED");result.textContent=JSON.stringify(proof,null,2);
   }else{
    const rk=checkedNew(p,again,c);let data;
    if(operation==="export"){const w=readWorkspace();data={text:await checkedRecoveryExport(w,p,rk),revision:w.revision};}
    else data=await reencryptBackup(await selected(f),credential,how,p,rk);
    if(!root.isConnected)fail("PAGE_CHANGED");
    output.value=data.text;outName="life-control-recovery-r"+data.revision+"-"+recoveryId+".json";clearKey();
    saveFile(output.value,outName,"application/json");
    result.textContent="Both password and recovery key self-checks passed. Download requested; verify the file exists. No live data changed.";
   }
  }catch(e){report(e);}
  finally{file.value="";busy=false;for(const control of controls)control.disabled=false;download.disabled=select.disabled=!outName||!output.value;}
 }
 return root;
}
