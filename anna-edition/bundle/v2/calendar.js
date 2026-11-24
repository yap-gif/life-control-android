/** Calendar dates are civil dates, never parsed in the browser's timezone. */
const DAY=86400000;
export function dayNumber(s) {
  if(typeof s!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(s) || s.slice(0,4)==="0000") throw new Error("Invalid calendar date");
  const ms=Date.parse(s+"T00:00:00Z");
  if(!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==s) throw new Error("Invalid calendar date");
  return ms/DAY;
}
export function dateFromDay(n) {
  if(!Number.isSafeInteger(n)) throw new Error("Invalid day");
  const s=new Date(n*DAY).toISOString().slice(0,10);
  dayNumber(s); return s;
}
export const shiftDay=(s,n)=>dateFromDay(dayNumber(s)+n);
export const weekday=s=>((dayNumber(s)+3)%7+7)%7+1; // Monday=1
export function weekStart(s){return shiftDay(s,1-weekday(s));}
export function monthStart(s){dayNumber(s);return s.slice(0,7)+"-01";}
export function shiftMonth(s,n){
  const d=new Date(dayNumber(monthStart(s))*DAY);
  d.setUTCMonth(d.getUTCMonth()+n);
  return dateFromDay(d.getTime()/DAY);
}
export const monthEnd=s=>shiftDay(shiftMonth(s,1),-1);
export function reportPeriods(spec,today){
  dayNumber(today);
  if(!spec||!["week","month","custom"].includes(spec.kind))throw new Error("Invalid period kind");
  const anchor=spec.anchor??today; dayNumber(anchor);
  let from,end,priorStart,priorEnd;
  if(spec.kind==="week"){
    from=weekStart(anchor);end=shiftDay(from,6);priorStart=shiftDay(from,-7);priorEnd=shiftDay(from,-1);
  }else if(spec.kind==="month"){
    from=monthStart(anchor);end=monthEnd(anchor);priorStart=shiftMonth(from,-1);priorEnd=shiftDay(from,-1);
  }else{
    from=spec.from;end=spec.through;dayNumber(from);dayNumber(end);
    if(end<from)throw new Error("Reversed range");
  }
  if(from>today)throw new Error("Future-only report");
  const through=end>today?today:end;
  const days=dayNumber(through)-dayNumber(from)+1;
  if(days<1||days>3660)throw new Error("Report range exceeds 3660 days");
  const partial=through!==end;
  if(spec.kind==="custom"){
    priorEnd=shiftDay(from,-1);priorStart=shiftDay(from,-days);
  }else if(partial){
    const equalEnd=shiftDay(priorStart,days-1);
    if(equalEnd<priorEnd)priorEnd=equalEnd;
  }
  const previousDays=dayNumber(priorEnd)-dayNumber(priorStart)+1;
  return {current:{from,through,scheduledThrough:end,partial,days},
    previous:{from:priorStart,through:priorEnd,days:previousDays},
    comparison:spec.kind==="custom"?"equal-days":partial?(days===previousDays?"equal-elapsed-days":"clipped-unequal-days"):"complete-calendar-periods",
    equalDayCount:days===previousDays};
}
