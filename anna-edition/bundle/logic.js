/** Pure transformations for Life Control on Anna. No platform or network access. */
export const STORAGE_KEY = "life-control-anna:v1";
export const CONTEXT_CATEGORIES = Object.freeze(["tasks", "money", "learning", "journal"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validDate(date) {
  return typeof date === "string" && DATE_PATTERN.test(date) &&
    !Number.isNaN(new Date(date + "T12:00:00").getTime()) &&
    new Date(date + "T12:00:00").toISOString().slice(0, 10) === date;
}
export function localDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")].join("-");
}
export function weekStart(today) {
  if (!validDate(today)) throw new Error("Invalid date");
  const date = new Date(today + "T12:00:00");
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localDate(date);
}
function text(value, cap) { return String(value ?? "").trim().slice(0, cap); }
function amount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100000000 ? number : 0;
}
function records(value, normalize) {
  return (Array.isArray(value) ? value.slice(0, 100) : [])
    .map(normalize).filter(Boolean);
}
export function normalizeState(raw) {
  const s = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const goal = s.goal && typeof s.goal === "object" ? s.goal : {};
  return {
    version: 1,
    tasks: records(s.tasks, v => v && validDate(v.date) && text(v.title, 120) ?
      { id: text(v.id, 60), title: text(v.title, 120), date: v.date, done: v.done === true } : null),
    money: records(s.money, v => v && validDate(v.date) && Number(v.amount) > 0 &&
      Number.isFinite(Number(v.amount)) && ["income", "expense"].includes(v.type) ?
      { id: text(v.id, 60), date: v.date, amount: amount(v.amount), type: v.type,
        category: text(v.category, 48) || "Other" } : null),
    learning: records(s.learning, v => v && validDate(v.date) &&
      Number.isInteger(Number(v.minutes)) && Number(v.minutes) > 0 && Number(v.minutes) <= 1440 &&
      text(v.topic, 120) ?
      { id: text(v.id, 60), date: v.date, topic: text(v.topic, 120), minutes: Number(v.minutes) } : null),
    journal: records(s.journal, v => v && validDate(v.date) && text(v.text, 2000) ?
      { id: text(v.id, 60), date: v.date, text: text(v.text, 2000) } : null),
    goal: { goal: amount(goal.goal), saved: amount(goal.saved), monthly: amount(goal.monthly) }
  };
}
export function calculateForecast(goal) {
  const target = amount(goal?.goal);
  const saved = amount(goal?.saved);
  const monthly = amount(goal?.monthly);
  if (target === 0) return { status: "unset", months: null, remaining: 0 };
  if (saved >= target) return { status: "reached", months: 0, remaining: 0 };
  const remaining = Math.round((target - saved) * 100) / 100;
  if (monthly <= 0) return { status: "no-contribution", months: null, remaining };
  return { status: "projected", months: Math.ceil(remaining / monthly), remaining };
}
function inWeek(item, start, today) { return item.date >= start && item.date <= today; }
export function calculateSummary(state, today) {
  const safe = normalizeState(state);
  const start = weekStart(today);
  const weekMoney = safe.money.filter(v => inWeek(v, start, today));
  return {
    openTasks: safe.tasks.filter(v => !v.done).length,
    dueTasks: safe.tasks.filter(v => !v.done && v.date <= today).length,
    studyMinutes: safe.learning.filter(v => inWeek(v, start, today)).reduce((n, v) => n + v.minutes, 0),
    weeklyNet: Math.round(weekMoney.reduce((n, v) => n + (v.type === "income" ? v.amount : -v.amount), 0) * 100) / 100
  };
}
/**
 * The only input to the remote AI call. No excluded category contributes
 * even a derived aggregate. Use explicit selected categories every run.
 */
export function buildReviewContext(state, selected, today) {
  if (!validDate(today)) throw new Error("Invalid review date");
  const allow = [...new Set(Array.isArray(selected) ? selected : [])];
  if (!allow.length || allow.some(k => !CONTEXT_CATEGORIES.includes(k))) {
    throw new Error("Choose at least one supported context category");
  }
  const s = normalizeState(state);
  const start = weekStart(today);
  const result = { period: { from: start, through: today } };
  if (allow.includes("tasks")) {
    result.tasks = s.tasks.filter(v => inWeek(v, start, today))
      .slice(0, 30).map(v => ({ title: v.title, due: v.date, completed: v.done }));
  }
  if (allow.includes("money")) {
    const entries = s.money.filter(v => inWeek(v, start, today));
    result.money = {
      currency: "MYR",
      income: Math.round(entries.filter(v => v.type === "income").reduce((n, v) => n + v.amount, 0) * 100) / 100,
      expense: Math.round(entries.filter(v => v.type === "expense").reduce((n, v) => n + v.amount, 0) * 100) / 100,
      entries: entries.slice(0, 30).map(v => ({ type: v.type, amount: v.amount, category: v.category, date: v.date })),
      goalForecast: calculateForecast(s.goal)
    };
  }
  if (allow.includes("learning")) {
    result.learning = s.learning.filter(v => inWeek(v, start, today))
      .slice(0, 30).map(v => ({ topic: v.topic, minutes: v.minutes, date: v.date }));
  }
  if (allow.includes("journal")) {
    result.journal = s.journal.filter(v => inWeek(v, start, today))
      .slice(0, 7).map(v => ({ date: v.date, reflection: v.text }));
  }
  return result;
}
