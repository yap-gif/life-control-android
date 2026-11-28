import {chromium} from "playwright";
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {performance} from "node:perf_hooks";
const base="http://127.0.0.1:8080",routes=["overview","reports","insights","tasks","money","learning","journal","goals","privacy"];
const out=process.env.QA_ARTIFACT_DIR||"qa-artifacts";await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];const failures=[];const workflowChecks=[];const recoveryChecks=[];
try{
  for(const width of [360,768,1040]){
    const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
    const external=[],errors=[];
    await context.route("**/*",route=>{const u=new URL(route.request().url());if(u.origin!==base){external.push(u.origin);return route.abort();}return route.continue();});
    const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
    let stage="initial navigation";
    try{
      await page.goto(base+"/preview-v2/");
      await page.getByText(/Isolated workspace ready/).waitFor();
      for(const id of routes){
        stage="route:"+id;
        const t=performance.now();
        await page.locator('nav a[data-route="'+id+'"]').click();
        await page.locator('nav a[aria-current="page"][data-route="'+id+'"]').waitFor();
        const dimensions=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,unlabelled:[...document.querySelectorAll("input,select,textarea")].filter(e=>!e.labels?.length&&!e.getAttribute("aria-label")).length,renderFailed:document.querySelector("#page").textContent.includes("Unable to render")}));
        const row={width,route:id,elapsedMs:Math.round(performance.now()-t),...dimensions};
        if(id==="reports"){
          const height=await page.evaluate(()=>document.documentElement.scrollHeight);row.defaultHeight=height;
          if(height>4500)failures.push({width,route:id,defaultHeight:height,reason:"Default report exceeds compact-height budget for fixed fixture"});
          const details=page.locator("details.report-disclosure").filter({hasText:"Canonical evidence"});assert.equal(await details.count(),1);assert.equal(await details.evaluate(e=>e.open),false);
          await details.locator("summary").click();assert.equal(await details.evaluate(e=>e.open),true);
          assert.ok(await details.locator("table").count()>=2);assert.ok(await details.locator("td").count()>30);
          const expanded=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
          if(expanded.scroll>width+1||expanded.body>width+1)failures.push({width,route:id,expanded});
          await details.locator("summary").click();assert.equal(await details.evaluate(e=>e.open),false);
          row.disclosureVerified=true;
        }
        results.push(row);
        if(dimensions.scroll>width+1||dimensions.body>width+1||dimensions.unlabelled||dimensions.renderFailed)failures.push(row);
        await page.screenshot({path:out+"/"+width+"-"+id+".png",fullPage:true});
      }
      stage="task workflow";
      await page.locator('nav a[data-route="tasks"]').click();
      await page.locator('nav a[aria-current="page"][data-route="tasks"]').waitFor();
      await page.getByRole("button",{name:"Add task",exact:true}).click();
      await page.getByLabel("Task title",{exact:true}).fill("Browser QA task");
      await page.getByRole("button",{name:"Save",exact:true}).click();
      await page.getByText("Browser QA task",{exact:true}).waitFor();
      const row=page.locator(".entry").filter({hasText:"Browser QA task"});
      await row.getByRole("button",{name:"Complete",exact:true}).click();
      await row.getByRole("button",{name:"Reopen",exact:true}).waitFor();
      // Hash navigation renders asynchronously. count() itself does not wait.
      stage="coach navigation";
      await page.locator('#page[aria-busy="false"]').waitFor();
      await page.locator('nav a[data-route="insights"]').click();
      await page.locator('nav a[aria-current="page"][data-route="insights"]').waitFor();
      await page.getByRole("heading",{name:"AI Personal Coach",exact:true}).waitFor();
      stage="coach accessible name and description";
      const question=page.getByRole("textbox",{name:"Your question",exact:true});
      await question.waitFor({state:"visible"});
      assert.equal(await question.count(),1,"Exactly one accessible question textbox");
      assert.equal(await question.getAttribute("aria-describedby"),"coach-question-count");
      assert.equal(await page.locator("#coach-question-count").textContent(),"0 / 1000 characters");
      await page.getByLabel("Your question",{exact:true}).fill("Browser QA question");
      assert.equal(await question.count(),1);
      assert.equal(await page.locator("#coach-question-count").textContent(),"19 / 1000 characters");
      stage="coach preview and explicit consent";
      await page.getByLabel("Money",{exact:true}).check();
      await page.getByRole("button",{name:"Preview exact AI request"}).click();
      await page.getByText("Exact authorized payload",{exact:true}).waitFor();
      assert.equal(await page.getByRole("button",{name:"Run simulated analysis"}).isDisabled(),true);
      await page.getByLabel("I authorize this one simulated analysis").check();
      await page.getByRole("button",{name:"Run simulated analysis"}).click();
      await page.getByText("Unsaved analysis",{exact:true}).waitFor();
      await page.locator('#page[aria-busy="false"]').waitFor();
      stage="coach pending result protection";
      assert.equal(await question.isDisabled(),true);
      assert.equal(await page.getByRole("button",{name:"Preview exact AI request",exact:true}).isDisabled(),true);
      await page.getByText("Suggested actions · preview only",{exact:true}).waitFor();
      stage="coach explicit save";
      await page.getByRole("button",{name:"Save simulated analysis"}).click();
      await page.getByText(/Confirmed in isolated memory/).waitFor();
      await page.locator('#page[aria-busy="false"]').waitFor();
      assert.equal(await page.locator("[data-unsaved-analysis]").count(),0,"Saved analysis must leave unsaved state");
      const history=page.locator("details").filter({hasText:"Browser QA question"}).first();
      await history.waitFor();
      assert.equal(await question.isEnabled(),true);
      stage="coach plan selection and task import";
      await history.locator("summary").click();
      assert.equal(await history.getByRole("button",{name:"Save selected plan",exact:true}).isDisabled(),true);
      await history.getByLabel("Include in plan",{exact:true}).check();
      await history.getByRole("button",{name:"Save selected plan",exact:true}).click();
      await page.getByRole("button",{name:"Accept as task",exact:true}).waitFor();
      await page.locator('#page[aria-busy="false"]').waitFor();
      await page.getByRole("button",{name:"Accept as task",exact:true}).click();
      await page.getByText("Linked task: Review the selected records",{exact:true}).waitFor();
      await page.locator('#page[aria-busy="false"]').waitFor();
      if(errors.length||external.length)failures.push({width,errors,external});
      else workflowChecks.push({width,task:true,coach:true});
      // Real Chromium, actual production backup module, synthetic workspace only.
      // No Anna runtime, no account or personal fixture, no screenshots of secrets.
      stage="recovery panel mount";
      await page.evaluate(async()=>{
        const {createRecoveryBackupPanel}=await import("/upgrade-v2/integrated-backup.js");
        const {migrateLegacy}=await import("/bundle/v2/workspace.js");
        const w=migrateLegacy({version:1,tasks:[],money:[],learning:[],journal:[],goal:{goal:1000,saved:0,monthly:0},lastReview:null,savedPlan:null},{timezone:"Asia/Kuching",legacyEtag:"synthetic",migrationId:"browser-recovery-fixture"});
        document.body.replaceChildren(createRecoveryBackupPanel(document,window,()=>w));
      });
      const root=page.locator("section.panel"),status=root.getByRole("status"),pass=root.getByLabel("New backup passphrase",{exact:true}),repeat=root.getByLabel("Repeat new passphrase",{exact:true}),confirm=root.getByLabel("Re-enter saved recovery key",{exact:true});
      const go=root.getByRole("button",{name:"Export recovery-protected snapshot",exact:true}),password="Synthetic browser backup password";
      const fill=async()=>{await pass.fill(password);await repeat.fill(password);};
      stage="recovery confirmation required";
      await fill();await go.click();await status.filter({hasText:"RECOVERY_KEY_CONFIRMATION_REQUIRED"}).waitFor();
      stage="recovery key generation and export";
      await root.getByRole("button",{name:"Generate new recovery key",exact:true}).click();
      const key=await root.getByLabel("Recovery key (save separately)",{exact:true}).inputValue();assert.match(key,/^[0-9a-f]{8}(?:-[0-9a-f]{8}){7}$/);
      await fill();await confirm.fill(key);
      const downloadPromise=page.waitForEvent("download");await go.click();const download=await downloadPromise;
      assert.match(download.suggestedFilename(),/^life-control-recovery-r\d+-[0-9a-f]{32}\.json$/);
      await status.filter({hasText:"Both password and recovery key self-checks passed"}).waitFor();
      const output=root.getByLabel("Verified encrypted JSON (manual save fallback)",{exact:true}),cipher=await output.inputValue();
      assert.ok(cipher.length>0);assert.equal(await pass.inputValue(),"");assert.equal(await confirm.inputValue(),"");
      stage="recovery verification";
      const file=root.getByLabel("Encrypted backup file (v1 or v2)",{exact:true}),method=root.getByLabel("Unlock using",{exact:true}),secret=root.getByLabel("Existing backup password or recovery key",{exact:true}),verify=root.getByRole("button",{name:"Verify recovery or legacy backup",exact:true});
      await file.setInputFiles({name:"synthetic.json",mimeType:"application/json",buffer:Buffer.from(cipher)});
      await method.selectOption("recovery");await secret.fill(key);await verify.click();
      await status.filter({hasText:'"sameWorkspace": true'}).waitFor();
      assert.equal(JSON.parse(await status.textContent()).restorePerformed,false);
      stage="recovery stale output rejection";
      await fill();await go.click();await status.filter({hasText:"RECOVERY_KEY_CONFIRMATION_REQUIRED"}).waitFor();
      assert.equal(await output.inputValue(),"");assert.equal(await root.getByRole("button",{name:"Download verified recovery backup again",exact:true}).isDisabled(),true);
      if(errors.length||external.length)failures.push({width,stage,errors,external});
      else recoveryChecks.push({width,recoveryExport:true,recoveryVerify:true,staleOutputRejected:true});
    }catch(e){failures.push({width,stage,error:String(e),stack:String(e?.stack??"")});}
    finally{await context.close();}
  }
}finally{await browser.close();await writeFile(out+"/browser-results.json",JSON.stringify({results,workflowChecks,recoveryChecks,failures},null,2));}
console.log("BROWSER_QA "+JSON.stringify({routeChecks:results.length,workflowChecks:workflowChecks.length,recoveryChecks:recoveryChecks.length,failures}));
assert.equal(results.length,27);assert.deepEqual(failures,[]);assert.equal(workflowChecks.length,3);assert.equal(recoveryChecks.length,3);
