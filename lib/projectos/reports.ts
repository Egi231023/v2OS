import {Actor,State,RecordItem,DomainError,access,availability,balance} from './domain';
export const reportDefinitions={
 available:'Released homes without an active allocation. Parking and storage are excluded.',
 reservations:'Active reserved deals, including contract preparation. Holds are excluded.',
 binding:'Deals with binding approval and no completed termination. Completed sales are included, not treated as accounting revenue.',
 receipts:'Confirmed receipts dated in the selected UTC period. Refunds and net cash flow are shown separately.',
 overdue:'Current positive instalment balances with a known due time before now. Undated milestones are excluded.',
 delivery:'Planned, confirmed and completed handovers. A confirmed appointment does not authorize key issuance.',
 care:'Current service cases excluding closed and declined. Pauses do not reset age.',
 tasks:'Current open tasks with their owner, deadline and blocker.',
 leads:'Leads created in the selected UTC cohort. Converted means a reservation was confirmed; later losses do not move the cohort.'
} as const;
export type ReportKind=keyof typeof reportDefinitions;
export interface ReportRow{id:string;projectId:string;project:string;title:string;status:string;owner:string;date:string|null;currency:string|null;amountCents:number|null;ageDays:number|null;blocker:string;href:string}
export interface ReportFilter{kind:ReportKind;projectId:string;from?:string;to?:string}
function instant(value:string|undefined,end=false){if(!value)return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T00:00:00Z'))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw new DomainError('Choose a valid date.');return Date.parse(value+'T00:00:00Z')+(end?86400000:0)}
export function report(s:State,a:Actor,filter:ReportFilter,now=new Date().toISOString()){
 if(!a.active||!['admin','manager','sales','finance','legal','delivery','care'].includes(a.role))throw new DomainError('Reports are restricted to assigned internal roles.',403);
 if(!Object.hasOwn(reportDefinitions,filter.kind))throw new DomainError('Unknown report.');
 const projects=s.entities.filter(x=>x.kind==='project'&&access(s,a,x));
 if(filter.projectId!=='all'&&!projects.some(x=>x.id===filter.projectId))throw new DomainError('Project unavailable.',404);
 const start=instant(filter.from),end=instant(filter.to,true);if(start!==null&&end!==null&&start>=end)throw new DomainError('The end date must not precede the start date.');
 const inPeriod=(date:unknown)=>{const time=typeof date==='string'?Date.parse(date):NaN;return Number.isFinite(time)&&(start===null||time>=start)&&(end===null||time<end)};
 const scoped=s.entities.filter(e=>(filter.projectId==='all'||e.projectId===filter.projectId)&&access(s,a,e));
 let records:RecordItem[]=[];
 switch(filter.kind){
 case 'available':records=scoped.filter(x=>x.kind==='inventory'&&x.data.type==='home'&&availability(s,x)==='available');break;
 case 'reservations':records=scoped.filter(x=>x.kind==='deal'&&['reserved','contracting'].includes(x.status));break;
 case 'binding':records=scoped.filter(x=>x.kind==='deal'&&x.data.binding&&x.status!=='terminated');break;
 case 'receipts':records=scoped.filter(x=>x.kind==='payment'&&x.status==='confirmed'&&['receipt','refund'].includes(x.data.direction)&&inPeriod(x.data.receivedAt));break;
 case 'overdue':records=scoped.filter(x=>x.kind==='schedule'&&x.status==='active'&&x.data.dueAt&&Date.parse(x.data.dueAt)<Date.parse(now)&&balance(s,x)>0);break;
 case 'delivery':records=scoped.filter(x=>x.kind==='handover');break;
 case 'care':records=scoped.filter(x=>x.kind==='service'&&!['closed','declined'].includes(x.status));break;
 case 'tasks':records=scoped.filter(x=>x.kind==='task'&&x.status==='open');break;
 case 'leads':records=scoped.filter(x=>x.kind==='lead'&&inPeriod(x.createdAt));break;
 }
 const rows:ReportRow[]=records.map(e=>{
  const date=filter.kind==='receipts'?e.data.receivedAt:filter.kind==='overdue'||filter.kind==='tasks'?e.data.dueAt:filter.kind==='delivery'?e.data.scheduledAt:e.createdAt;
  const section=e.kind==='inventory'?'projects':e.kind==='payment'||e.kind==='schedule'?'finance':e.kind==='handover'?'delivery':e.kind==='service'?'care':e.kind==='task'?'overview':'sales';
  const hasAmount=['binding','receipts','overdue'].includes(filter.kind);
  const amount=filter.kind==='binding'?e.data.priceCents:filter.kind==='overdue'?balance(s,e):filter.kind==='receipts'?e.data.amountCents*(e.data.direction==='refund'?-1:1):null;
  const validAmount=!hasAmount||Number.isSafeInteger(amount);
  return {id:e.id,projectId:e.projectId!,project:projects.find(x=>x.id===e.projectId)?.title||'Unavailable',title:e.title,status:filter.kind==='receipts'?e.data.direction:e.status,owner:s.actors.find(x=>x.id===e.ownerId)?.name||'Unassigned',date:typeof date==='string'&&Number.isFinite(Date.parse(date))?date:null,currency:hasAmount&&typeof e.data.currency==='string'?e.data.currency:null,amountCents:validAmount?amount:null,ageDays:filter.kind==='care'?Math.max(0,Math.floor((Date.parse(now)-Date.parse(e.createdAt))/86400000)):null,blocker:filter.kind==='tasks'?String(e.data.blocker||''):filter.kind==='care'?String(e.data.pause?.reason||''):'',href:'/app/'+encodeURIComponent(e.projectId!)+'/'+section+(e.kind==='deal'||e.kind==='inventory'||e.kind==='service'?'/'+encodeURIComponent(e.id):'')};
 }).sort((x,y)=>(x.date||'9999').localeCompare(y.date||'9999')||x.id.localeCompare(y.id));
 const totals:Record<string,{amountCents:number;receiptsCents:number;refundsCents:number}>={};
 for(const r of rows){if(r.amountCents===null||!r.currency)continue;const total=totals[r.currency]??={amountCents:0,receiptsCents:0,refundsCents:0};for(const k of ['amountCents','receiptsCents','refundsCents'] as const){const n=k==='amountCents'?r.amountCents:k==='receiptsCents'?Math.max(0,r.amountCents):Math.max(0,-r.amountCents);if(!Number.isSafeInteger(total[k]+n))throw new DomainError('Report total exceeds supported precision.');total[k]+=n}}
 const unavailableDates=filter.kind==='receipts'?scoped.filter(x=>x.kind==='payment'&&x.status==='confirmed'&&['receipt','refund'].includes(x.data.direction)&&!Number.isFinite(Date.parse(x.data.receivedAt))).length:0;
 const converted=filter.kind==='leads'?rows.filter(x=>x.status==='converted').length:null;
 return {kind:filter.kind,definition:reportDefinitions[filter.kind],periodApplies:['receipts','leads'].includes(filter.kind),periodTimezone:'UTC',updatedAt:now,unavailableDates,rows,count:rows.length,totals,converted,conversionRate:converted===null||rows.length===0?null:converted/rows.length,unavailableAmounts:['binding','receipts','overdue'].includes(filter.kind)?rows.filter(x=>x.amountCents===null||!x.currency).length:0,projects:projects.map(x=>({id:x.id,title:x.title}))};
}
export function reportCSV(rows:ReportRow[]){
 const escape=(v:unknown)=>{let t=v===null||v===undefined?'':String(v);if(/^[\s]*[=+@-]/.test(t))t="'"+t;return '"'+t.replaceAll('"','""')+'"'};
 const keys=['id','project','title','status','owner','date','currency','amountCents','ageDays','blocker'] as const;
 return '\uFEFF'+[keys.map(escape).join(','),...rows.map(row=>keys.map(key=>escape(row[key])).join(','))].join('\r\n');
}
