/** P07-A read-only release status. Deliberately cannot authorize a release.
 * Never connect to Anna, read credentials, perform writes, or run deployment commands.
 * Status success means the blocked ledger and protected blobs are intact, not release approval.
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
const HARD_GATES=Object.freeze(["APS-SCOPE","APS-CONTRACT","APS-CAPACITY","APS-EXCLUSIVE-MIGRATION","HOST-ADAPTER","LLM-CONSENT","CLOUD-AGENT","ERASURE","LISTING-MEDIA","OWNER-RELEASE"]);
const FROZEN=Object.freeze({
  "app.json": "dd13b1feb101183430d3bc8188628e3a58a51675",
  "manifest.json": "9cc9fc74ee83bdc6307a3d8736a6b15a3ef3c1d6",
  "package.json": "6f728928020a196b2a2d20db178a237e59bfd751",
  "PRIVACY.md": "556170727a7d031ff66bda66f9eb917f058bf84d",
  "release-preflight.mjs": "949e767b7d9f70c90632f4d3e213e36e51daabe9",
  "bundle/index.html": "6bcc8c89a9ce2a00ad6ae2eebfd492788767a592",
  "bundle/app.js": "65bd790ad4f5920ead87624be31a0c724e1e2763",
  "bundle/style.css": "433863a5601a18f188c1ddf5f1a3904190a21ea2",
  "store-screenshots/SOURCE-VERSION.txt": "d917d3e26adc9854b4569871e20111c38de2606f"
});
const SOURCE_COMMIT="90557b9de7149ff4b852b0367f38330d13310670";
const LEDGER=new URL("../docs/v0.2.0/release-readiness-v2.json",import.meta.url);
const sha1Blob=bytes=>createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
export function inspectReadiness(ledger,readFrozen){
  const errors=[];
  if(!ledger||typeof ledger!=="object"||ledger.schemaVersion!==1||ledger.targetVersion!=="0.2.0"||ledger.stage!=="P07-A"||ledger.candidateKind!=="isolated-preview-not-deployable"||ledger.applicationSourceCommit!==SOURCE_COMMIT||ledger.productionRelease!=="BLOCKED")errors.push("Unexpected readiness ledger identity or status.");
  if(ledger?.protectedApp?.id!==908||ledger?.protectedApp?.version!=="0.1.2"||ledger?.protectedApp?.versionId!==2720)errors.push("Protected app identity changed.");
  const s=ledger?.sourceQA,b=ledger?.browserQA;
  if(s?.commit!==SOURCE_COMMIT||s?.runId!==45370877996||s?.passed!==168||s?.failed!==0)errors.push("Source evidence does not match the reviewed baseline.");
  if(b?.commit!==SOURCE_COMMIT||b?.runId!==45370877903||b?.routeChecks!==27||b?.failed!==0||b?.disclosuresPassed!==3||b?.artifactId!==14908708440||b?.sha256!=="20f959c94197283b5dbac3aef173cdca10d6e907b59702a440062589a98509fe")errors.push("Browser evidence does not match the reviewed baseline.");
  const list=ledger?.hardGates;
  if(!Array.isArray(list)||list.length!==HARD_GATES.length||HARD_GATES.some(id=>list.filter(g=>g?.id===id&&g?.status==="BLOCKED"&&typeof g.required==="string"&&g.required.trim()).length!==1))errors.push("Hard gate ledger is missing, duplicated, or prematurely promoted.");
  for(const [path,expected] of Object.entries(FROZEN)){
    if(ledger?.frozenBaseline?.localBlobChecks?.[path]!==expected)errors.push("Protected blob ledger mismatch: "+path);
    try{if(sha1Blob(readFrozen(path))!==expected)errors.push("Protected source changed: "+path);}
    catch{errors.push("Cannot verify protected source: "+path);}
  }
  return {integrity:errors.length===0?"PASS":"FAIL",release:"BLOCKED",sourceCommit:SOURCE_COMMIT,blockedGates:[...HARD_GATES],errors};
}
export function main(args=process.argv.slice(2)){
  if(args.length>1||(args.length===1&&!["--status","--release"].includes(args[0]))){console.error("Only --status or --release accepted.");return 1;}
  let result;
  try{result=inspectReadiness(JSON.parse(readFileSync(LEDGER,"utf8")),path=>readFileSync(new URL("../"+path,import.meta.url)));}
  catch{console.error("Cannot read release readiness evidence. Release BLOCKED.");return 1;}
  console.log(JSON.stringify(result,null,2));
  if(result.errors.length)return 1;
  // No ledger edits, environment variables or command flags can unblock this P07-A tool.
  return args[0]==="--release"?2:0;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=main();
