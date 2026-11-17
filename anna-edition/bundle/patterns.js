/**
 * Evidence-first, consent-scoped longitudinal summary for Life Control.
 * Runs entirely in the UI before explicit Anna LLM authorization.
 * A completed historical week is comparable to another completed week;
 * the current calendar week may be partial and MUST be labelled.
 */
import { CONTEXT_CATEGORIES, normalizeState, validDate, weekStart, calculateForecast } from "./logic.js";

function shiftDay(day, amount) {
  const d = new Date(day + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
const total = (a, fn) => a.reduce((sum, x) => sum + fn(x), 0);
const cents = n => Math.round((n + Number.EPSILON) * 100) / 100;

export function buildPatternContext(rawState, selected, today, options = {}) {
  if (!validDate(today)) throw new Error("Invalid analysis date");
  const chosen = [...new Set(Array.isArray(selected) ? selected : [])];
  if (!chosen.length || chosen.some(x => !CONTEXT_CATEGORIES.includes(x))) {
    throw new Error("Choose at least one supported context category");
  }
  const state = normalizeState(rawState);
  const currentMonday = weekStart(today);
  const firstMonday = shiftDay(currentMonday, -28);
  const result = {
    analysis: "Life Control history-to-plan",
    period: { from: firstMonday, through: today, completedWeeks: 4, includesPartialCurrentWeek: true },
    interpretationRules: [
      "Historical task done flags reflect CURRENT status of tasks due that week; completion dates were not collected.",
      "No logging is not proof of no activity; distinguish recorded activity from actual activity.",
      "Compare prior full weeks separately from the current potentially partial week.",
      "Only selected categories have been included in this request."
    ],
    weeks: []
  };

  for (let offset = -4; offset <= 0; offset++) {
    const from = shiftDay(currentMonday, offset * 7);
    const fullThrough = shiftDay(from, 6);
    const through = fullThrough < today ? fullThrough : today;
    const w = { from, through, complete: through === fullThrough, daysInWindow: Math.min(7, Math.max(1, Math.round((Date.parse(through) - Date.parse(from)) / 86400000) + 1)) };
    if (chosen.includes("tasks")) {
      const due = state.tasks.filter(x => x.date >= from && x.date <= through);
      w.tasks = { due: due.length, currentlyCompleted: due.filter(x => x.done).length, currentlyOpen: due.filter(x => !x.done).length };
    }
    if (chosen.includes("learning")) {
      const entries = state.learning.filter(x => x.date >= from && x.date <= through);
      w.learning = { loggedMinutes: total(entries, x => x.minutes), loggedSessions: entries.length,
        topics: [...new Set(entries.map(x => x.topic))].slice(0, 8) };
    }
    if (chosen.includes("money")) {
      const entries = state.money.filter(x => x.date >= from && x.date <= through);
      const income = cents(total(entries.filter(x => x.type === "income"), x => x.amount));
      const expenses = cents(total(entries.filter(x => x.type === "expense"), x => x.amount));
      w.money = { currency: "MYR", income, expenses, net: cents(income - expenses), loggedEntries: entries.length };
    }
    if (chosen.includes("journal")) {
      const entries = state.journal.filter(x => x.date >= from && x.date <= through);
      w.journal = { loggedDays: entries.length, reflections: entries.slice(0, 7).map(x => ({
        date: x.date, text: x.text.slice(0, 800)
      })) };
    }
    result.weeks.push(w);
  }

  const recent = x => x.date >= firstMonday && x.date <= today;
  if (chosen.includes("tasks")) {
    result.taskEvidence = state.tasks.filter(recent).slice(0, 30).map(x => ({
      title: x.title, due: x.date, completedNow: x.done
    }));
  }
  if (chosen.includes("learning")) {
    result.learningEvidence = state.learning.filter(recent).slice(0, 35).map(x => ({
      topic: x.topic, minutes: x.minutes, date: x.date
    }));
  }
  if (chosen.includes("money")) {
    result.moneyEvidence = {
      forecastBasedOnManuallyEnteredGoal: calculateForecast(state.goal),
      entries: state.money.filter(recent).slice(0, 35).map(x => ({
        type: x.type, amount: x.amount, category: x.category, date: x.date
      }))
    };
  }

  if (options.includeSavedPlan === true) {
    const plan = state.savedPlan;
    if (!plan) throw new Error("There is no saved plan to compare.");
    if (!plan.categories.every(cat => chosen.includes(cat))) {
      throw new Error("Select every category used in the saved plan, or uncheck 'Include saved plan'.");
    }
    result.previousUserSavedPlan = {
      savedAt: plan.savedAt,
      text: plan.text,
      caveat: "This is a prior AI output the user deliberately saved, not proof they completed it."
    };
  }
  return result;
}

/** A local-only preview (no model requests, no hidden categories). */
export function summarizePatternPreview(raw, selected, today) {
  const r = buildPatternContext(raw, selected, today);
  const done = r.weeks.filter(x => x.complete);
  const latest = done[done.length - 1];
  const previous = done[done.length - 2];
  const format = (n, unit) => n + " " + unit;
  const items = [];
  if (latest && previous && latest.learning && previous.learning) {
    items.push("Learning: " + format(previous.learning.loggedMinutes, "min") +
      " → " + format(latest.learning.loggedMinutes, "min") + " (last two complete weeks)");
  }
  if (latest && previous && latest.money && previous.money) {
    items.push("Expense: RM " + previous.money.expenses.toFixed(2) + " → RM " +
      latest.money.expenses.toFixed(2) + " (last two complete weeks)");
  }
  if (latest && previous && latest.tasks && previous.tasks) {
    items.push("Tasks due: " + previous.tasks.due + " → " + latest.tasks.due +
      " (current completion states, not historical completion dates)");
  }
  if (latest && previous && latest.journal && previous.journal) {
    items.push("Journal days: " + previous.journal.loggedDays + " → " +
      latest.journal.loggedDays + " (last two complete weeks)");
  }
  return items.length ? items : ["Not enough comparable history. Record activity across at least two complete weeks."];
}
