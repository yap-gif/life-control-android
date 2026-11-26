import {chromium} from "playwright";
import assert from "node:assert/strict";
import {mkdir,writeFile} from "node:fs/promises";
import {performance} from "node:perf_hooks";
const base="http://127.0.0.1:8080",routes=["overview","reports","insights","tasks","money","learning","journal","goals","privacy"];
const out=process.env.QA_ARTIFACT_DIR||"qa-artifacts";await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];const failures=[];const workflowChecks=[];
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
      stage="coach explicit save";
      await page.getByRole("button",{name:"Save simulated analysis"}).click();
      await page.getByText(/Confirmed in isolated memory/).waitFor();
      await page.locator('#page[aria-busy="false"]').waitFor();
      assert.equal(await page.locator("[data-unsaved-analysis]").count(),0,"Saved analysis must leave unsaved state");
      await page.locator("details").filter({hasText:"Browser QA question"}).first().waitFor();
      if(errors.length||external.length)failures.push({width,errors,external});
      else workflowChecks.push({width,task:true,coach:true});
    }catch(e){failures.push({width,stage,error:String(e),stack:String(e?.stack??"")});}
    finally{await context.close();}
  }
}finally{await browser.close();await writeFile(out+"/browser-results.json",JSON.stringify({results,workflowChecks,failures},null,2));}
console.log("BROWSER_QA "+JSON.stringify({routeChecks:results.length,workflowChecks:workflowChecks.length,failures}));
assert.equal(results.length,27);assert.deepEqual(failures,[]);assert.equal(workflowChecks.length,3);
