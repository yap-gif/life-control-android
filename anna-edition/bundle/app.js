import { AnnaAppRuntime } from "/static/anna-apps/_sdk/latest/index.js";
import {
  STORAGE_KEY, normalizeState, localDate, calculateForecast,
  calculateSummary
} from "./logic.js";
import { buildReviewRequest } from "./review-contract.js";
import { renderReviewMarkdown } from "./review-format.js";

const $ = id => document.getElementById(id);
const forms = ["task-form","money-form","learning-form","journal-form","goal-form","review-form"];
let anna = null;
let state = normalizeState({});
let saveChain = Promise.resolve();
let reviewBusy = false;
const TODAY = () => localDate();
const money = n => "RM " + Number(n).toFixed(2);
const id = () => "lc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 11);

function status(message, error = false) {
  $("message").textContent = message;
  $("message").style.color = error ? "#ffc0bc" : "#9cdbc4";
}
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function limitEntries(key, nextEntry) {
  if (!Array.isArray(state[key])) throw new Error("Invalid data list");
  state[key].unshift(nextEntry);
  state[key] = state[key].slice(0, 100);
}
function persistAndRender() {
  state = normalizeState(state);
  render();
  const snapshot = JSON.parse(JSON.stringify(state));
  saveChain = saveChain.catch(() => {}).then(async () => {
    await anna.storage.set({ key: STORAGE_KEY, value: snapshot });
  });
  saveChain.then(() => status("Saved to your Anna app storage."), error => status(
    "Storage failed — changes are visible in this session but may be lost: " + String(error.message || error), true
  ));
}
function entry(li, primary, subtitle, buttons = []) {
  const content = el("div","entry-content");
  content.append(el("div","primary",primary),el("div","meta",subtitle));
  li.append(content);
  if (buttons.length) {
    const actions = el("div","actions");
    buttons.forEach(b => {
      const button = el("button","",b.label);
      button.type = "button";
      button.addEventListener("click", b.action);
      actions.append(button);
    });
    li.append(actions);
  }
  return li;
}
function renderList(listId, records, renderItem, emptyLabel) {
  const list = $(listId);
  list.replaceChildren();
  if (!records.length) {
    list.append(el("li","meta",emptyLabel));
    return;
  }
  records.slice(0, 12).forEach(v => list.append(renderItem(v)));
}
function deleteById(key, recordId) {
  state[key] = state[key].filter(v => v.id !== recordId);
  persistAndRender();
}
function render() {
  const today = TODAY();
  const summary = calculateSummary(state,today);
  $("open-count").textContent = String(summary.openTasks);
  $("due-count").textContent = String(summary.dueTasks);
  $("study-count").textContent = summary.studyMinutes + " min";
  $("net-count").textContent = money(summary.weeklyNet);

  renderList("task-list",state.tasks, v => {
    const li = el("li",v.done ? "is-done" : "");
    const dueLabel = v.done ? "Completed" : (v.date < today ? "Overdue" : (v.date === today ? "Due today" : "Due " + v.date));
    const row = entry(li,v.title,dueLabel,[{
      label: v.done ? "Reopen" : "Complete",
      action: () => { const t=state.tasks.find(t => t.id === v.id); if (t) { t.done=!t.done; persistAndRender(); } }
    },{label:"Delete",action:()=>deleteById("tasks",v.id)}]);
    if (!v.done && v.date <= today) row.querySelector(".meta").className += v.date < today ? " overdue" : " soon";
    return row;
  },"No tasks yet.");

  renderList("money-list",state.money,v => entry(el("li"),
    (v.type==="income" ? "+ " : "− ") + money(v.amount),
    v.category + " · " + v.date,
    [{label:"Delete",action:()=>deleteById("money",v.id)}]
  ),"No transactions yet.");

  renderList("learning-list",state.learning,v => entry(el("li"),v.topic,
    v.minutes + " min · " + v.date,
    [{label:"Delete",action:()=>deleteById("learning",v.id)}]
  ),"No study sessions yet.");

  renderList("journal-list",state.journal,v => entry(el("li"),v.text,
    "Journal · " + v.date,
    [{label:"Delete",action:()=>deleteById("journal",v.id)}]
  ),"No reflections yet.");

  const forecast = calculateForecast(state.goal);
  const forecastText = forecast.status === "unset" ? "Enter a savings goal to start."
    : forecast.status === "reached" ? "Goal reached. Set a new target when ready."
    : forecast.status === "no-contribution" ? money(forecast.remaining) + " remaining. Add a positive monthly saving to estimate timing."
    : money(forecast.remaining) + " remaining · approximately " + forecast.months + " month(s) at your planned pace.";
  $("forecast").textContent = forecastText;
}
function bindForm(formId, handler) {
  $(formId).addEventListener("submit", event => {
    event.preventDefault();
    try { handler(new FormData(event.currentTarget)); }
    catch(error) { status(String(error.message || error),true); }
  });
}
function bindEntries() {
  bindForm("task-form",f=>{
    const title=String(f.get("title") || "").trim();
    const date=String(f.get("date") || "");
    if(!title || !/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error("Enter a task and due date.");
    limitEntries("tasks",{id:id(),title,date,done:false});
    $("task-form").reset();
    $("task-form").elements.namedItem("date").value=TODAY();
    persistAndRender();
  });
  bindForm("money-form",f=>{
    const amount=Number(f.get("amount"));
    const type=String(f.get("type"));
    const category=String(f.get("category")||"").trim();
    const date=String(f.get("date")||"");
    if(!(amount>0 && amount<=100000000 && Number.isFinite(amount)) ||
      !["income","expense"].includes(type) || !category || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Enter a positive amount, type, category and date.");
    }
    limitEntries("money",{id:id(),amount,type,category,date});
    $("money-form").reset();
    $("money-form").elements.namedItem("date").value=TODAY();
    persistAndRender();
  });
  bindForm("learning-form",f=>{
    const topic=String(f.get("topic")||"").trim();
    const minutes=Number(f.get("minutes"));
    const date=String(f.get("date")||"");
    if(!topic || !Number.isInteger(minutes) || minutes<1 || minutes>1440 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error("Enter a topic, minutes and date.");
    limitEntries("learning",{id:id(),topic,minutes,date});
    $("learning-form").reset();
    $("learning-form").elements.namedItem("date").value=TODAY();
    persistAndRender();
  });
  bindForm("journal-form",f=>{
    const text=String(f.get("text")||"").trim();
    const date=String(f.get("date")||"");
    if(!text || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Enter reflection and date.");
    const existing=state.journal.find(v=>v.date===date);
    if(existing){existing.text=text;}else{limitEntries("journal",{id:id(),text,date});}
    $("journal-form").elements.namedItem("text").value="";
    persistAndRender();
  });
  bindForm("goal-form",f=>{
    const goal=Number(f.get("goal")),saved=Number(f.get("saved")),monthly=Number(f.get("monthly"));
    if([goal,saved,monthly].some(v=>!Number.isFinite(v)||v<0||v>100000000))
      throw new Error("Goal, saved and monthly amounts must be non-negative.");
    state.goal={goal,saved,monthly};
    persistAndRender();
  });
}
async function handleReview(event) {
  event.preventDefault();
  if (reviewBusy) return;
  const selected=[...document.querySelectorAll('#review-form input[name="context"]:checked')].map(e=>e.value);
  if (!$("ai-consent").checked) { status("Please explicitly authorize this one AI request.",true); return; }
  let request;
  try { request = buildReviewRequest(state, selected, TODAY()); }
  catch(error) { status(error.message,true); return; }

  // Per-request consent; a future review always needs another explicit approval.
  $("ai-consent").checked=false;
  reviewBusy=true;
  $("review-btn").disabled=true;
  $("review-btn").textContent="Generating...";
  $("review-result").textContent="Sending selected categories only and generating your weekly review...";
  status("Only the selected categories are included in this AI request.");
  try {
    const reply=await anna.llm.complete(request);
    const output=reply?.content?.text;
    if(typeof output!=="string" || !output.trim()) throw new Error("AI did not return a usable review.");
    renderReviewMarkdown($("review-result"), output);
    status("Review complete. No other categories were sent.");
  } catch(error) {
    $("review-result").textContent="Review failed; no result saved. " + String(error.message || error);
    status("AI request failed. You can opt in again to retry.",true);
  } finally {
    reviewBusy=false;
    $("review-btn").disabled=false;
    $("review-btn").textContent="Generate weekly review";
  }
}
async function eraseWorkspace() {
  if (reviewBusy) {
    status("An AI request is still running. Previously sent data cannot be recalled. Try erasing again after the request finishes.",true);
    return;
  }
  $("erase-confirm").disabled = true;
  $("erase-cancel").disabled = true;
  forms.forEach(fid => $(fid).querySelectorAll("input,textarea,select,button").forEach(input => input.disabled = true));
  try {
    // Always drain pending saves before deletion so an older save cannot revive erased data.
    await saveChain.catch(() => {});
    if (typeof anna.storage.delete === "function") {
      await anna.storage.delete({ key: STORAGE_KEY });
    } else {
      // Older Anna harnesses expose get/set but not delete; replace with a blank state.
      await anna.storage.set({ key: STORAGE_KEY, value: normalizeState({}) });
    }
    state = normalizeState({});
    for (const [key,value] of Object.entries(state.goal)) {
      $("goal-form").elements.namedItem(key).value = String(value);
    }
    $("review-result").textContent = "No AI request sent yet.";
    $("ai-consent").checked = false;
    render();
    status("Anna Edition app records erased from this app's storage. Platform logs/backups and past AI requests are outside this control.");
  } catch (error) {
    status("Unable to erase stored records: " + String(error.message || error), true);
  } finally {
    $("erase-confirm-panel").hidden = true;
    $("erase-confirm").disabled = false;
    $("erase-cancel").disabled = false;
    forms.forEach(fid => $(fid).querySelectorAll("input,textarea,select,button").forEach(input => input.disabled = false));
  }
}

async function boot() {
  forms.forEach(fid=>{
    $(fid).querySelectorAll("input,textarea,select,button").forEach(input=>input.disabled=true);
  });
  try {
    anna=await AnnaAppRuntime.connect();
    const response=await anna.storage.get({key:STORAGE_KEY});
    state=normalizeState(response?.value);
    $("connection").textContent="Anna connected";
    ["task-form","money-form","learning-form","journal-form"].forEach(fid=>{
      $(fid).elements.namedItem("date").value=TODAY();
    });
    for(const [key,val] of Object.entries(state.goal)){
      $("goal-form").elements.namedItem(key).value=String(val);
    }
    bindEntries();
    $("review-form").addEventListener("submit",handleReview);
    $("erase-data").disabled = false;
    $("erase-data").addEventListener("click", () => { $("erase-confirm-panel").hidden = false; });
    $("erase-cancel").addEventListener("click", () => { $("erase-confirm-panel").hidden = true; });
    $("erase-confirm").addEventListener("click", eraseWorkspace);
    forms.forEach(fid=>{
      $(fid).querySelectorAll("input,textarea,select,button").forEach(input=>input.disabled=false);
    });
    render();
    status("Ready. AI remains off until you explicitly authorize a review.");
  } catch(error) {
    $("connection").textContent="Connection unavailable";
    status("Unable to load Anna storage. Editing is disabled to prevent unsaved records. " + String(error.message || error),true);
  }
}
boot();
