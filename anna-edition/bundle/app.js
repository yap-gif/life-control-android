import { AnnaAppRuntime } from "/static/anna-apps/_sdk/latest/index.js";
import {
  STORAGE_KEY, normalizeState, localDate, calculateForecast,
  calculateSummary, validDate
} from "./logic.js";
import { explainHostError, entryActionLabel, isMissingStorageKey } from "./ui-feedback.js";
import { buildReviewRequest } from "./review-contract.js";
import { summarizePatternPreview } from "./patterns.js";
import { renderReviewMarkdown } from "./review-format.js";
import { queueStorageWrite } from "./storage-flow.js";

const $ = id => document.getElementById(id);
const forms = ["task-form","money-form","learning-form","journal-form","goal-form","review-form"];
let anna = null;
let state = normalizeState({});
let saveChain = Promise.resolve();
let reviewBusy = false;
let planSaving = false;
let listenersAttached = false;
let connectBusy = false;
let storageWriteUncertain = false;
let lastGeneratedPlan = null;
const TODAY = () => localDate();
const money = n => "RM " + Number(n).toFixed(2);
const id = () => "lc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 11);

function status(message, error = false) {
  $("message").textContent = message;
  $("message").style.color = error ? "#ffc0bc" : "#9cdbc4";
  $("message").setAttribute("aria-live", error ? "assertive" : "polite");
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
// All writes are serialized. A button only reports success after Anna
// acknowledges its write. Failed writes remain visible and can be retried.
function lockUnsafeEdits() {
  if (!storageWriteUncertain) return;
  for (const fid of forms) {
    $(fid).querySelectorAll("input,textarea,select,button")
      .forEach(control => { control.disabled = true; });
  }
  for (const id of ["erase-data","save-plan-btn","forget-plan-btn","retry-save-result"]) {
    $(id).disabled = true;
  }
}
function persistAndRender({ notify = true } = {}) {
  if (storageWriteUncertain) {
    status("Anna Storage is still unconfirmed. Close and reopen this app to verify saved records before making more changes.", true);
    lockUnsafeEdits();
    return Promise.resolve(false);
  }
  state = normalizeState(state);
  render();
  const snapshot = JSON.parse(JSON.stringify(state));
  if (notify) status("Saving changes to Anna storage...");
  const write = queueStorageWrite(saveChain, anna.storage, STORAGE_KEY, snapshot);
  saveChain = write;
  return withDeadline(write, 15000, "Anna storage did not confirm the write within 15 seconds.")
    .then(() => {
      if (notify) status("Saved to your Anna app storage.");
      return true;
    })
    .catch(error => {
      const timedOut = error?.message?.startsWith("Anna storage did not confirm");
      if (timedOut) {
        // The host write may still be executing, so starting a second write
        // could queue forever or produce an ambiguous snapshot order.
        storageWriteUncertain = true;
        lockUnsafeEdits();
      }
      status(timedOut
        ? "Anna Storage did not confirm the write. Editing is paused. Close and reopen the app, check saved records, then try again if needed."
        : explainHostError(error, "storage") + " Changes were not confirmed. Please retry.", true);
      return false;
    });
}
function entry(li, primary, subtitle, buttons = [], recordId = "") {
  const content = el("div","entry-content");
  content.append(el("div","primary",primary),el("div","meta",subtitle));
  li.append(content);
  if (buttons.length) {
    const actions = el("div","actions");
    buttons.forEach(b => {
      const button = el("button","",b.label);
      button.type = "button";
      button.setAttribute("aria-label", entryActionLabel(b.label, primary));
      button.dataset.entryId = recordId;
      // Complete and Reopen are the same action, so retain keyboard focus.
      button.dataset.actionKey = ["Complete", "Reopen"].includes(b.label) ? "toggle" : b.label.toLowerCase();
      button.addEventListener("click", () => {
        if (storageWriteUncertain) {
          status("Storage state is unconfirmed. Reopen the app before editing.", true);
          return;
        }
        const fallbackInput = li.closest(".card")?.querySelector("input,textarea,select");
        const recordKey = button.dataset.entryId;
        const actionKey = button.dataset.actionKey;
        b.action();
        const replacementButton = [...document.querySelectorAll(".entries button[data-entry-id]")]
          .find(candidate => candidate.dataset.entryId === recordKey &&
            candidate.dataset.actionKey === actionKey);
        (replacementButton || fallbackInput)?.focus();
      });
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
    },{label:"Delete",action:()=>deleteById("tasks",v.id)}],v.id);
    if (!v.done && v.date <= today) row.querySelector(".meta").className += v.date < today ? " overdue" : " soon";
    return row;
  },"No tasks yet.");

  renderList("money-list",state.money,v => entry(el("li"),
    (v.type==="income" ? "+ " : "− ") + money(v.amount),
    v.category + " · " + v.date,
    [{label:"Delete",action:()=>deleteById("money",v.id)}],v.id
  ),"No transactions yet.");

  renderList("learning-list",state.learning,v => entry(el("li"),v.topic,
    v.minutes + " min · " + v.date,
    [{label:"Delete",action:()=>deleteById("learning",v.id)}],v.id
  ),"No study sessions yet.");

  renderList("journal-list",state.journal,v => entry(el("li"),v.text,
    "Journal · " + v.date,
    [{label:"Delete",action:()=>deleteById("journal",v.id)}],v.id
  ),"No reflections yet.");

  const forecast = calculateForecast(state.goal);
  const forecastText = forecast.status === "unset" ? "Enter a savings goal to start."
    : forecast.status === "reached" ? "Goal reached. Set a new target when ready."
    : forecast.status === "no-contribution" ? money(forecast.remaining) + " remaining. Add a positive monthly saving to estimate timing."
    : money(forecast.remaining) + " remaining · approximately " + forecast.months + " month(s) at your planned pace.";
  $("forecast").textContent = forecastText;
  renderPatternPreview();
}
const PAGES = new Set(["overview","insights","tasks","money","learning","journal","savings","privacy"]);
function navigateToCurrentPage() {
  const requested = window.location.hash.slice(1);
  const page = PAGES.has(requested) ? requested : "overview";
  for (const el of document.querySelectorAll("[data-page]")) {
    el.hidden = el.dataset.page !== page;
  }
  for (const link of document.querySelectorAll("[data-nav]")) {
    if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  document.title = "Life Control · " + page[0].toUpperCase() + page.slice(1);
}

function restoreAnalysis() {
  const previous = state.lastReview;
  if (previous) {
    renderReviewMarkdown($("review-result"), previous.text);
    $("analysis-meta").textContent = "Restored analysis from " + previous.generatedAt +
      " · Categories: " + previous.categories.join(", ") +
      ". Reusing it in a future AI request still requires a separate saved-plan opt-in.";
    lastGeneratedPlan = {
      savedAt: previous.generatedAt, text: previous.text,
      categories: [...previous.categories]
    };
    $("save-plan-btn").disabled = false;
  } else {
    $("review-result").textContent = "No AI analysis saved yet.";
    $("analysis-meta").textContent = "";
    lastGeneratedPlan = null;
    $("save-plan-btn").disabled = true;
  }
  $("review-save-status").textContent = "";
  $("retry-save-result").hidden = true;
}
function selectedReviewCategories() {
  return [...document.querySelectorAll('#review-form input[name="context"]:checked')].map(e => e.value);
}
function renderPatternPreview() {
  const target = $("pattern-preview");
  if (!target) return;
  target.replaceChildren();
  const categories = selectedReviewCategories();
  let insights = [];
  try {
    insights = categories.length ? summarizePatternPreview(state, categories, TODAY()) :
      ["Select a category to preview only the records you permit."];
  } catch {
    insights = ["Unable to build local preview. Check saved dates."];
  }
  insights.forEach(item => target.append(el("li", "", item)));
  const plan = state.savedPlan;
  $("saved-plan-status").textContent = plan ?
    "Saved " + plan.savedAt + " · source categories: " + plan.categories.join(", ") +
      ". Include it only with all these categories selected." :
    "No saved plan. You may save the next AI response for a future comparison.";
  $("include-saved-plan").disabled = !plan;
  if (!plan) $("include-saved-plan").checked = false;
  $("forget-plan-btn").disabled = !plan;
}
function bindForm(formId, handler) {
  $(formId).addEventListener("submit", event => {
    event.preventDefault();
    if (storageWriteUncertain) {
      status("Storage state is unconfirmed. Reopen the app before editing.", true);
      return;
    }
    try { handler(new FormData(event.currentTarget)); }
    catch (error) {
      // Form validation messages originate from this app. Never display arbitrary exceptions.
      const allowed = new Set([
        "Enter a task and due date.",
        "Enter a positive amount, type, category and date.",
        "Enter a topic, minutes and date.",
        "Enter reflection and date.",
        "Goal, saved and monthly amounts must be non-negative."
      ]);
      status(allowed.has(error?.message) ? error.message :
        "Could not process this form. Please check your inputs and try again.", true);
    }
  });
}
function bindEntries() {
  bindForm("task-form",f=>{
    const title=String(f.get("title") || "").trim();
    const date=String(f.get("date") || "");
    if(!title || !validDate(date))throw new Error("Enter a task and due date.");
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
      !["income","expense"].includes(type) || !category || !validDate(date)) {
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
      !validDate(date))throw new Error("Enter a topic, minutes and date.");
    limitEntries("learning",{id:id(),topic,minutes,date});
    $("learning-form").reset();
    $("learning-form").elements.namedItem("date").value=TODAY();
    persistAndRender();
  });
  bindForm("journal-form",f=>{
    const text=String(f.get("text")||"").trim();
    const date=String(f.get("date")||"");
    if(!text || !validDate(date)) throw new Error("Enter reflection and date.");
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
  if (reviewBusy || planSaving || storageWriteUncertain) return;
  const selected = selectedReviewCategories();
  if (!$("ai-consent").checked) {
    status("Please explicitly authorize this one AI request.", true);
    return;
  }
  let request;
  try {
    request = buildReviewRequest(state, selected, TODAY(),
      { includeSavedPlan: $("include-saved-plan").checked });
  } catch (error) {
    status(error.message, true);
    return;
  }

  // Consent is consumed at request start and NEVER restored automatically.
  $("ai-consent").checked = false;
  reviewBusy = true;
  $("review-btn").disabled = true;
  $("review-btn").textContent = "Analyzing history...";
  $("save-plan-btn").disabled = true;
  $("retry-save-result").hidden = true;
  $("review-result").setAttribute("aria-busy", "true");
  $("review-result").textContent =
    "Analyzing selected historical evidence and developing a measurable next-week plan...";
  $("analysis-meta").textContent = "";
  $("review-save-status").textContent = "";
  status("Only the selected categories are included in this AI request.");
  try {
    const reply = await withDeadline(anna.llm.complete(request), 45000,
      "The AI request took too long. Please retry with a new authorization.");
    const output = reply?.content?.text;
    if (typeof output !== "string" || !output.trim()) {
      throw new Error("AI did not return a usable review.");
    }

    // Keep the analysis separate from the user's deliberately saved plan.
    const generatedAt = TODAY();
    state.lastReview = { generatedAt, text: output.slice(0, 6000), categories: [...selected] };
    lastGeneratedPlan = {
      savedAt: generatedAt, text: state.lastReview.text, categories: [...selected]
    };
    renderReviewMarkdown($("review-result"), state.lastReview.text);
    $("analysis-meta").textContent = "Generated " + generatedAt +
      " · Saving analysis for restoration after reopening...";
    $("save-plan-btn").disabled = false;

    const confirmed = await persistAndRender({ notify: false });
    if (confirmed) {
      $("analysis-meta").textContent = "Generated " + generatedAt +
        " · Analysis saved to Anna storage and can be restored after reopening.";
      $("review-save-status").textContent = "Analysis persisted. Save as a comparison plan only if you choose.";
      status("Evidence-based analysis generated and safely stored.");
    } else {
      $("analysis-meta").textContent = "Generated " + generatedAt +
        " · Analysis is visible but NOT confirmed in storage.";
      $("retry-save-result").hidden = storageWriteUncertain;
      $("review-save-status").textContent = storageWriteUncertain
        ? "Storage confirmation timed out. Close and reopen to verify; do not retry here."
        : "Storage could not confirm the analysis. Retry saving before closing the app.";
      status("AI analysis was generated, but storage did not confirm it.", true);
    }
  } catch (error) {
    const explanation = error?.message?.startsWith("The AI request took too long")
      ? "The AI request took too long. Please retry with a new authorization."
      : explainHostError(error, "ai");
    $("review-result").textContent = explanation;
    status(explanation, true);
    // Do not erase the previous saved analysis if the new AI request failed.
  } finally {
    $("review-result").setAttribute("aria-busy", "false");
    reviewBusy = false;
    $("review-btn").disabled = false;
    $("review-btn").textContent = "Analyze pattern & adjust plan";
    $("save-plan-btn").disabled = !lastGeneratedPlan;
    lockUnsafeEdits();
  }
}

function withDeadline(promise, ms, message) {
  let deadline;
  const timeout = new Promise((_, reject) => {
    deadline = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(deadline));
}

async function eraseWorkspace() {
  if (reviewBusy || planSaving || storageWriteUncertain) {
    status("An AI request or storage write is still unresolved. Reopen and verify before erasing.", true);
    return;
  }
  $("erase-confirm").disabled = true;
  $("erase-cancel").disabled = true;
  forms.forEach(fid => $(fid).querySelectorAll("input,textarea,select,button").forEach(input => input.disabled = true));
  try {
    // Always drain pending saves before deletion so an older save cannot revive erased data.
    await withDeadline(saveChain.catch(() => {}), 15000,
      "Pending storage writes did not finish. Erase was NOT attempted; reload and verify first.");
    if (typeof anna.storage.delete === "function") {
      await anna.storage.delete({ key: STORAGE_KEY });
    } else {
      // Older Anna harnesses expose get/set but not delete; replace with a blank state.
      await anna.storage.set({ key: STORAGE_KEY, value: normalizeState({}) });
    }
    state = normalizeState({});
    lastGeneratedPlan = null;
    $("save-plan-btn").disabled = true;
    $("include-saved-plan").checked = false;
    for (const [key,value] of Object.entries(state.goal)) {
      $("goal-form").elements.namedItem(key).value = String(value);
    }
    $("review-result").textContent = "No AI plan requested yet.";
    $("analysis-meta").textContent = "";
    $("review-save-status").textContent = "";
    $("retry-save-result").hidden = true;
    $("ai-consent").checked = false;
    render();
    status("Life Control records erased from this app's storage. Platform logs/backups and past AI requests are outside this control.");
  } catch (error) {
    status(explainHostError(error, "storage"), true);
  } finally {
    $("erase-confirm-panel").hidden = true;
    $("erase-data").setAttribute("aria-expanded", "false");
    $("erase-data").focus();
    $("erase-confirm").disabled = false;
    $("erase-cancel").disabled = false;
    forms.forEach(fid => $(fid).querySelectorAll("input,textarea,select,button").forEach(input => input.disabled = false));
    lockUnsafeEdits();
  }
}

async function boot() {
  if (connectBusy) return;
  connectBusy = true;
  $("retry-connect").hidden = true;
  forms.forEach(fid => {
    $(fid).querySelectorAll("input,textarea,select,button").forEach(input => input.disabled = true);
  });
  try {
    anna = await withDeadline(AnnaAppRuntime.connect(), 12000, "Anna connection timed out.");
    let response;
    try {
      response = await withDeadline(anna.storage.get({ key: STORAGE_KEY }), 12000,
        "Anna storage could not load your records in time.");
    } catch (error) {
      if (!isMissingStorageKey(error)) throw error;
      // First install: Anna may return 404 for an absent app storage key.
      // Never convert permission/timeout errors into an empty workspace.
      response = { value: null };
    }
    state = normalizeState(response?.value);
    $("connection").textContent = "Anna connected";
    ["task-form","money-form","learning-form","journal-form"].forEach(fid => {
      $(fid).elements.namedItem("date").value = TODAY();
    });
    for (const [key, val] of Object.entries(state.goal)) {
      $("goal-form").elements.namedItem(key).value = String(val);
    }

    // Bind once only: failed startup followed by Retry must not double-submit forms.
    if (!listenersAttached) {
      bindEntries();
      $("review-form").addEventListener("submit", handleReview);
      $("review-form").querySelectorAll('input[name="context"]').forEach(input => {
        input.addEventListener("change", renderPatternPreview);
      });
      $("save-plan-btn").addEventListener("click", async () => {
        if (!lastGeneratedPlan || reviewBusy || planSaving || storageWriteUncertain) return;
        planSaving = true;
        const previous = state.savedPlan;
        const candidate = { ...lastGeneratedPlan, categories: [...lastGeneratedPlan.categories] };
        $("save-plan-btn").disabled = true;
        $("save-plan-btn").textContent = "Saving plan to Anna...";
        $("review-save-status").textContent = "Waiting for Anna Storage confirmation...";
        try {
          state.savedPlan = candidate;
          let confirmed = await persistAndRender({ notify: false });
          if (confirmed) {
            // Anna's write acknowledgment alone is not a durability proof.
            // Re-read the exact plan before reporting that it can be recovered.
            try {
              const readback = await withDeadline(anna.storage.get({ key: STORAGE_KEY }),
                10000, "Plan readback timed out.");
              const remote = normalizeState(readback?.value).savedPlan;
              confirmed = !!remote &&
                remote.text === candidate.text &&
                remote.savedAt === candidate.savedAt &&
                remote.categories.join(",") === candidate.categories.join(",");
            } catch {
              confirmed = false;
            }
          }
          if (confirmed) {
            $("review-save-status").textContent =
              "Saved plan verified by Anna Storage readback. It can be recovered after reopening.";
            status("AI plan saved and verified by Anna Storage readback.");
          } else {
            state.savedPlan = previous;
            render();
            $("review-save-status").textContent = storageWriteUncertain
              ? "Plan save timed out. Storage status is uncertain. Reopen and verify before another attempt."
              : "Plan save was NOT confirmed by readback. Retry after verifying the connection.";
            status(storageWriteUncertain
              ? "Anna Storage is unconfirmed. Close and reopen to reconcile the saved plan."
              : "Plan was not confirmed as saved. Try again.", true);
          }
        } finally {
          planSaving = false;
          $("save-plan-btn").textContent = "Save this AI plan for next week's comparison";
          $("save-plan-btn").disabled = !!(state.savedPlan &&
            state.savedPlan.text === candidate.text &&
            state.savedPlan.savedAt === candidate.savedAt);
          $("review-btn").disabled = false;
          lockUnsafeEdits();
        }
      });
      $("forget-plan-btn").addEventListener("click", async () => {
        if (!state.savedPlan || reviewBusy || planSaving || storageWriteUncertain) return;
        planSaving = true;
        const previous = state.savedPlan;
        state.savedPlan = null;
        $("include-saved-plan").checked = false;
        const confirmed = await persistAndRender({ notify: false });
        if (confirmed) {
          status("Saved AI plan removed and confirmed by Anna Storage.");
        } else {
          state.savedPlan = previous;
          render();
          status("Could not confirm plan deletion. Try again.", true);
        }
        planSaving = false;
        lockUnsafeEdits();
      });
      $("retry-save-result").addEventListener("click", async () => {
        if (reviewBusy || planSaving || storageWriteUncertain || !state.lastReview) return;
        $("retry-save-result").disabled = true;
        $("review-save-status").textContent = "Retrying the analysis save...";
        const confirmed = await persistAndRender({ notify: false });
        $("retry-save-result").hidden = confirmed;
        $("retry-save-result").disabled = false;
        $("review-save-status").textContent = confirmed
          ? "Analysis stored successfully. It will restore after reopening."
          : storageWriteUncertain
            ? "Storage timed out. Close and reopen to verify before retrying."
            : "Still not confirmed. Do not assume the result is saved.";
        lockUnsafeEdits();
      });

      $("erase-data").disabled = false;
      const dismissErase = () => {
        $("erase-confirm-panel").hidden = true;
        $("erase-data").setAttribute("aria-expanded", "false");
        $("erase-data").focus();
      };
      $("erase-data").addEventListener("click", () => {
        $("erase-confirm-panel").hidden = false;
        $("erase-data").setAttribute("aria-expanded", "true");
        $("erase-cancel").focus();
      });
      $("erase-cancel").addEventListener("click", dismissErase);
      $("erase-confirm-panel").addEventListener("keydown", event => {
        if (event.key === "Escape") { event.preventDefault(); dismissErase(); }
      });
      $("erase-confirm").addEventListener("click", eraseWorkspace);
      listenersAttached = true;
    }
    forms.forEach(fid => {
      $(fid).querySelectorAll("input,textarea,select,button").forEach(input => input.disabled = false);
    });
    $("retry-connect").hidden = true;
    render();
    restoreAnalysis();
    status(state.lastReview
      ? "Ready. Your last AI analysis was restored. A new AI call still needs fresh consent."
      : "Ready. AI remains off until you explicitly authorize a review.");
  } catch (error) {
    $("connection").textContent = "Connection unavailable";
    $("retry-connect").hidden = false;
    status("Anna data did not load. Editing is disabled to prevent overwriting records. Use Retry Anna connection.", true);
  } finally {
    connectBusy = false;
  }
}

window.addEventListener("hashchange", navigateToCurrentPage);
navigateToCurrentPage();
$("retry-connect").addEventListener("click", boot);
boot();
