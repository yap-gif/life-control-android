import {validateDomain,labelKey} from "./domain.js";
import {dayNumber} from "./calendar.js";
const allowed={
  tasks:{date:"dueDate",text:["title"],filter:"status",values:["open","done"]},
  transactions:{date:"date",text:["category","note"],filter:"kind",values:["income","expense"],category:"category"},
  budgets:{date:"month",text:["category"],category:"category"},
  learning:{date:"date",text:["topic","note"],category:"topic"},
  journal:{date:"date",text:["reflection", "tags"]},
  goals:{date:"dueDate",text:["title"],filter:"kind",values:["savings","general"]},
  milestones:{date:"targetDate",text:["title"]},
  habits:{date:"startDate",text:["title"]},
  habitCheckins:{date:"date",text:[]}
};
const cmp=(a,b)=>a<b?-1:a>b?1:0;
/** Local, read-only view pagination. No retention cap and no writes. */
export function selectPage(workspace,collection,options={}){
  validateDomain(workspace);
  if(!Object.hasOwn(allowed,collection))throw new Error("Unsupported collection");
  const spec=allowed[collection];
  if(!options||typeof options!=="object"||Array.isArray(options)||Object.keys(options).some(k=>!["page","pageSize","query","from","through","filter","category","priority","parentId"].includes(k)))throw new Error("Invalid filter options");
  const {page=1,pageSize=25,query="",from=null,through=null,filter=null,category=null,priority=null,parentId=null}=options;
  if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>100)throw new Error("Invalid pagination");
  if(typeof query!=="string"||query.length>200)throw new Error("Invalid search");
  if(from!==null)dayNumber(from);if(through!==null)dayNumber(through);
  if(from!==null&&through!==null&&from>through)throw new Error("Reversed range");
  if(filter!==null&&(!spec.values||!spec.values.includes(filter)))throw new Error("Invalid filter");
  if(category!==null&&(!spec.category||typeof category!=="string"||!category.trim()))throw new Error("Invalid category filter");
  if(priority!==null&&(collection!=="tasks"||!["low","normal","high"].includes(priority)))throw new Error("Invalid priority filter");
  const parentField=collection==="milestones"?"goalId":collection==="habitCheckins"?"habitId":null;
  if(parentId!==null&&(!parentField||typeof parentId!=="string"||!parentId.trim()))throw new Error("Invalid parent filter");
  const q=labelKey(query);
  const filtered=workspace.collections[collection].filter(r=>{
    const date=r[spec.date];
    if(from!==null||through!==null){
      if(date===null)return false;
      if(collection==="budgets"){
        if(from!==null&&date<from.slice(0,7)||through!==null&&date>through.slice(0,7))return false;
      }else if(from!==null&&date<from||through!==null&&date>through)return false;
    }
    return (!q||spec.text.some(k=>(Array.isArray(r[k])?r[k]:[r[k]]).some(v=>typeof v==="string"&&labelKey(v).includes(q))))
      &&(filter===null||r[spec.filter]===filter)&&(category===null||labelKey(r[spec.category])===labelKey(category))
      &&(priority===null||r.priority===priority)&&(parentId===null||r[parentField]===parentId);
  });
  const key=r=>r.id??JSON.stringify([r.habitId,r.date]);
  filtered.sort((a,b)=>cmp(b[spec.date]??"",a[spec.date]??"")||cmp(key(a),key(b)));
  const total=filtered.length,pageCount=Math.ceil(total/pageSize);
  const offset=page>pageCount?total:(page-1)*pageSize;
  return {rows:JSON.parse(JSON.stringify(filtered.slice(offset,offset+pageSize))),total,page,pageSize,pageCount};
}
