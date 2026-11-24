# LC-P01-INTELLIGENCE — Reporting engine and AI Coach contract
Date: 2026-11-24. Design baseline; no runtime implementation claimed.

## 1. Deterministic report engine (P02)
Pure functions take validated workspace snapshot, report range, local today and authorized categories; output canonical metric records {id, value, unit, range, sampleCount, coverage, definitionVersion}. All reports and AI evidence use the same engine, with display formatting separate from arithmetic. Use integer sen for money, integer minutes/counts, safe-integer sum checks. No LLM needed to calculate any total.

Periods: calendar week Monday–Sunday, month first–last day, custom inclusive dates. Current week/month through today, label partial. Historical complete periods compare with immediately preceding complete period; for partial comparison offer previous equal elapsed-day window, clipped and labelled if unequal (do not call it full-period change). Custom prior interval has same day count immediately before start. Future actual records excluded; planned amounts/due dates separated. Do not imply empty logs = no activity. Explicit no-record state. A percent change when baseline = 0 is unavailable, not infinity or 100%; report absolute delta. No annualization.

| Metric | Calculation |
|---|---|
| Income / expense | Sum positive amountMinor by kind within date range |
| Net cashflow | Income minus expense |
| Net cashflow ratio | Net/income ×100 if income >0; label as recorded net/income, not verified savings rate |
| Category share | Expense in category / total expense ×100 if expense >0 |
| Budget remaining | Monthly category limit minus logged expense in matching month/category; negative = over budget |
| Learning | Sum minutes; count sessions; totals by normalized topic; weekly target progress, no assumed efficiency |
| Tasks | Due counts and current open/done for due-date cohort separately from completion/reopen events dated inside range; no historical timestamps fabricated |
| Goals | Manual progress / target if target >0; remaining and months = ceil(remaining/monthly) when monthly >0; no double-count from transaction surplus |
| Habits | completed scheduled eligible days / elapsed scheduled days from start; skipped not complete; no future denominator; streak counts consecutive scheduled completed days |

Charts: income vs expenses columns, expense breakdown, weekly/monthly trends, learning topic bars, goal progress. No blank chart implying zero without records; accessible labels/tables. Show period, currency, and source coverage. Local filters and exports never invoke model.

Synthetic reference fixture: Nov 2026; income RM600 Nov 3, RM400 Nov 10; expense Food RM100 Nov 4, Transport RM50 Nov 11, Food RM125 Nov 20. Month through Nov 24 = income RM1000, expense RM275, net RM725, ratio 72.5%, Food RM225 / 81.818...% rounded 81.8%, Transport RM50 / 18.2%; Food budget RM200 -> remaining -RM25. Week Nov 2–8 = RM600/RM100/RM500; Nov 9–15 = RM400/RM50/RM350; Nov 16–22 = RM0/RM125/-RM125. Week Nov 23–24 has no logs, not proof of inactivity. Add Feb leap day, month/year boundaries, UTC±timezone, empty, zero income, one-cent and safe-integer tests.

## 2. Coach request contract (P04)
Modes: comprehensive (still selected-only), financial, learning, task, goal/habit, custom. User may ask "How can I reduce food spending next month?" or "Given my logged study hours, build a realistic revision plan." Select range (7/30/90 days, calendar week/month, custom), categories, and optional prior accepted plan. No automatically enabled category; preset suggests categories, user confirms. New categories goals/habits independent from Money, including migrated savings data; no silent goal leakage. Journal text separate explicit selection and preview. Custom question can itself contain personal data; clearly show question is sent, cap and allow edit.

Contract request = {schemaVersion, requestId, snapshotRevision, period, focus, question, authorizedCategories, metrics, evidence, coverage, optionalPreviousPlan}. Each metric/evidence ID is scoped to selected categories only, with explicit units and dates. Raw evidence selected deterministically within bounded size; indicate omitted counts, include exact aggregate for full selected range. No model-derived facts in input metrics. User question is a request for analysis, not permission to access unselected records or execute tools. Treat record fields as untrusted data. No hidden prompts/context from other accounts. Preview exact outgoing content, categories, date range, prior-plan inclusion and credit notice. Consent bound to immutable request digest; changes invalidate consent; duplicate clicks blocked; one authorized call. No auto retry, follow-up call or startup call; fresh consent for each call. No external network or tool invocation. Anna llm.complete is the only model path initially. Token/byte budgets and timeout tested against actual supported SDK/model; no guarantee of exact model capabilities. Start with design target maxTokens 2200 and bounded context <=24 KiB, revise after platform testing; oversize request requires reducing range/selection, not silent truncation of totals.

## 3. Structured response and validation
Prefer JSON-only response through plain text, no unsupported schema API assumed. Expected shape:
```json
{
  "schemaVersion": 1,
  "summary": "Plain language answer",
  "findings": [{"metricIds":["money.expense.current"],"interpretation":"...","confidence":"limited","limitation":"..."}],
  "actions": [{"id":"a1","title":"Review food spending","reasonMetricIds":["money.food.current"],"target":{"metric":"expense","category":"Food","quantity":20000,"unit":"MYR_sen"},"dueDate":"2026-12-01"}],
  "followUp": {"measurement":"Compare next recorded period","limitations":["..."]}
}
```
Example is fictional; do not display as live report. Validate exact schema, allowed enums, field lengths, bounded arrays (1–5 findings, 0–5 actions), date range for actionable plan, finite safe integer quantities, metric/category references and authorization. Do not treat arbitrary free-text numeric claims as verified: render canonical metrics with programmatic values alongside interpretations, label narrative as model interpretation and reject unsupported numeric factual claims where structured validation can detect them. No claim of complete hallucination prevention. On malformed output show safe failure and optionally retain clearly labelled unverified text only with user choice; never enable import of malformed actions. Escape HTML; no executable Markdown/URLs, no raw host error messages. Model cannot write records. Do not recommend financial investments, diagnose mood, invent task completion times, or confuse logging gaps with lack of activity.

## 4. Action and history lifecycle
Persist latest valid report and history only after verified storage; if write unconfirmed show unsaved result and block unsafe mutation. History entries show original period, selected categories, question, date and evidence revision; mark stale after records change; do not silently recalculate past report. Restore without model call. User may delete reports separately. Save selected structured plan, distinct from report; explicit review/edit/select actions -> create linked Tasks via idempotent action ID. No automatic action creation. User manually completes/dismisses task; actual timestamp recorded. Subsequent analysis only includes prior plan after opt-in and all source categories authorized, with later evidence and actual action links. Legacy same-day date-only records cannot prove post-plan progress; actual timestamped events may establish chronology. If no later evidence, say unknown. Plan completion is based on confirmed task action status or metric check, not AI assertion. Deleting records does not silently alter a saved historical report; offer delete dependent history or retain with explicit warning. Never resend history by default.

## 5. Required AI negative tests
Excluded-category canaries in records, aggregates, question-independent scope, saved plan and prior reports; malicious instructions in task/journal; model fabricated metric IDs, categories, JSON, dates, huge strings, HTML, invalid amounts, no evidence, partial periods, quota error, timeout, duplicate submit, consent invalidation on edit, stale snapshot, readback mismatch, reboot no model call, repeat import idempotence. Mock tests plus real Cloud Agent, using synthetic data. No new Anna release on design or mock evidence alone.
