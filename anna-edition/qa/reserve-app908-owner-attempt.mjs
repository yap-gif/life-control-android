import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";
import {createHash} from "node:crypto";
import {PLAN_FILE,BACKUP_CIPHER_SHA,reserveOwnerAttempt} from "./owner-migration-local.mjs";
try{
  const [root,flag,...rest]=process.argv.slice(2);
  if(!root||flag!=="--owner-approved-single-live-attempt"||rest.length||resolve(root)!==resolve("C:/Users/User/LifeControl-App908-Recovery-20261127"))throw Error("INVALID_ARGS");
  const cipher=readFileSync(join(root,"live-data-R1-20261127-121444-17f66eb5","APS-V1-RESPONSE.dpapi"));
  if(createHash("sha256").update(cipher).digest("hex")!==BACKUP_CIPHER_SHA)throw Error("BACKUP_CHANGED");
  const p=JSON.parse(readFileSync(join(root,PLAN_FILE),"utf8"));
  const result=reserveOwnerAttempt(root,p,{liveWriteAuthorized:true,candidateSha256:p.candidateSha256,backupSha256:p.backupSha256,migrationId:p.migrationId,risk:p.risk});
  console.log(JSON.stringify({...result,remoteCalls:0,apsWrites:0,automaticRetry:false}));
}catch{console.error("LOCAL RESERVATION STOP. Do not overwrite or retry.");process.exitCode=1;}
