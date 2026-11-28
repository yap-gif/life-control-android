/** In-page explicit confirmation, independent of native modal permissions.
 * The frozen candidate is already validated by the store. This callback only
 * approves that pending operation; it never invokes storage or mutates it. */
export function createSaveConfirmation(doc){
  const main=doc.getElementById("main"),page=doc.getElementById("page");
  if(!main||!page)throw Error("CONFIRMATION_PANEL_MISSING");
  const section=doc.createElement("section");section.className="panel stack";section.id="save-confirmation";section.hidden=true;
  section.setAttribute("aria-labelledby","save-confirmation-title");
  const heading=doc.createElement("h2");heading.id="save-confirmation-title";heading.textContent="Confirm persistent save";heading.tabIndex=-1;
  const summary=doc.createElement("p");summary.id="save-confirmation-summary";
  const detail=doc.createElement("pre");detail.style.whiteSpace="pre-wrap";detail.style.overflowWrap="anywhere";
  const label=doc.createElement("label");label.className="tick";
  const tick=doc.createElement("input");tick.type="checkbox";tick.id="save-consent";label.append(tick,doc.createTextNode("I authorize exactly this one conditional v2 save. No automatic retry."));
  const actions=doc.createElement("div");actions.className="actions";
  const approve=doc.createElement("button");approve.type="button";approve.className="primary";approve.id="confirm-persistent-save";approve.textContent="Confirm save once";
  const cancel=doc.createElement("button");cancel.type="button";cancel.id="cancel-persistent-save";cancel.textContent="Cancel save";
  actions.append(approve,cancel);section.append(heading,summary,detail,label,actions);main.insertBefore(section,page);
  let pending=null;
  function finish(ok){
    if(!pending)return;const resolve=pending;pending=null;approve.disabled=true;cancel.disabled=true;tick.checked=false;section.hidden=true;summary.textContent="";detail.textContent="";resolve(ok);
  }
  tick.addEventListener("change",()=>{approve.disabled=!pending||!tick.checked;});
  approve.addEventListener("click",()=>{if(pending&&tick.checked)finish(true);});
  cancel.addEventListener("click",()=>finish(false));
  section.addEventListener("keydown",e=>{if(e.key==="Escape"){e.preventDefault();finish(false);}});
  return function confirmSave(candidate){
    if(pending)return Promise.resolve(false);
    return new Promise(resolve=>{
      pending=resolve;tick.checked=false;approve.disabled=true;cancel.disabled=false;
      summary.textContent="App 908 · Revision "+candidate.expectedRevision+" → "+candidate.nextRevision+" · "+candidate.bytes+" / 6144 bytes. One attempt only.";
      // Text only, never HTML, no fingerprint, ETag or token.
      detail.textContent=JSON.stringify(candidate.command,null,2);
      section.hidden=false;heading.focus();
    });
  };
}
