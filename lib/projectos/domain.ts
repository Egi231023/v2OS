export type Role='admin'|'manager'|'sales'|'agent'|'buyer'|'legal'|'finance'|'delivery'|'care'|'contractor'|'property_manager';
export type Kind='organization'|'project'|'inventory'|'contact'|'lead'|'deal'|'offer'|'allocation'|'document'|'signature'|'schedule'|'payment'|'payment_allocation'|'refund'|'commission'|'commission_payment'|'notification'|'milestone'|'change'|'inspection'|'handover'|'service'|'work_order'|'task'|'message'|'appointment'|'grant'|'termination'|'bank_account'|'request';
export interface RecordItem{id:string;kind:Kind;organizationId:string;projectId?:string;dealId?:string;parentId?:string;ownerId?:string;title:string;status:string;version:number;createdAt:string;updatedAt:string;data:Record<string,any>}
export interface Actor{id:string;name:string;role:Role;organizationId:string;projectIds:string[];active:boolean;company?:string}
export interface State{mode:'demo';entities:RecordItem[];actors:Actor[];createdAt:string}
export interface Command{action:string;id?:string;expectedVersion?:number;data?:Record<string,any>;key:string}
export class DomainError extends Error{status:number;constructor(message:string,status=400){super(message);this.status=status}}
export const money=(n:number,c='CAD')=>new Intl.NumberFormat('en-CA',{style:'currency',currency:c,maximumFractionDigits:n%100?2:0}).format(n/100);
export const nice=(s:string)=>s.replaceAll('_',' ').replace(/^./,x=>x.toUpperCase());
export const prettyDate=(s?:string)=>s?new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeZone:'America/Toronto'}).format(new Date(s)):'Not set';
export function parseCents(s:string){if(!/^\d{1,10}(\.\d{1,2})?$/.test(s))throw new DomainError('Enter a valid amount.');const [a,b='']=s.split('.');return Number(BigInt(a)*BigInt(100)+BigInt(b.padEnd(2,'0')))}
const later=(n:number,now=Date.now())=>new Date(now+n*86400000).toISOString();
export function seed():State{const now=new Date().toISOString(),entities:RecordItem[]=[],actors:Actor[]=[];
 const add=(kind:Kind,id:string,title:string,status:string,data:Record<string,any>={},projectId?:string,dealId?:string,ownerId?:string,org='cedar',parentId?:string)=>{const e:RecordItem={kind,id,title,status,data,projectId,dealId,ownerId,organizationId:org,parentId,version:1,createdAt:now,updatedAt:now};entities.push(e);return e};
 const person=(id:string,name:string,role:Role,projectIds=['cedar-quay','parkline'],org='cedar',company?:string)=>actors.push({id,name,role,projectIds,organizationId:org,active:true,company});
 person('admin','Alex Morgan','admin');person('manager','Eleanor Brooks','manager');person('sales','Daniel Reed','sales');person('agent-a','Sofia Laurent','agent',['cedar-quay'],'agency','Northline Realty');person('agent-b','James Ellis','agent',['cedar-quay'],'agency','Northline Realty');person('buyer','Emma Bennett','buyer',['cedar-quay']);person('co-buyer','Oliver Bennett','buyer',['cedar-quay']);person('finance','Priya Shah','finance');person('finance-2','Noah Patel','finance');person('legal','Lena Foster','legal');person('delivery','Marcus Lee','delivery');person('care','Grace Wilson','care');person('contractor-a','Adam Clarke','contractor',['cedar-quay'],'fix','Evergreen Services');person('contractor-b','Maya Scott','contractor',['cedar-quay'],'plumb','Clearwater Plumbing');person('property-manager','Avery Chen','property_manager',['cedar-quay']);person('other-owner','Taylor Rivers','admin',['harbour-house'],'harbour');
 for(const [id,name] of [['cedar','Cedar Developments'],['agency','Northline Realty'],['harbour','Harbour Living'],['fix','Evergreen Services'],['plumb','Clearwater Plumbing']])add('organization',id,name,'active',{fictional:true},undefined,undefined,undefined,id);
 for(const [id,title,city,phase,count] of [['cedar-quay','Cedar Quay','Toronto, Ontario','Under construction',16],['parkline','The Parkline','Hamilton, Ontario','Launching',8],['harbour-house','Harbour House','Ottawa, Ontario','Preparation',4]] as const){const org=id==='harbour-house'?'harbour':'cedar';add('project',id,title,phase,{city,currency:'CAD',timezone:'America/Toronto',areaUnit:'sq ft',slug:id,ownerOrganizationId:org,billingOrganizationId:org,policyVersion:1,holdHours:24,published:id==='cedar-quay',websiteDraft:'Thoughtful homes beside the water.',websitePublished:'Thoughtful homes beside the water.',websiteVersion:1,readiness:{organization:false,market:false,documents:false,bank:false,responsiblePeople:false},completionEstimate:later(150)},id,undefined,undefined,org);for(let i=0;i<count;i++){const floor=Math.floor(i/4)+1,code=id==='cedar-quay'?`A-${floor}0${i%4+1}`:id==='parkline'?`B-${floor}0${i%4+1}`:`H-${i+101}`,key=id==='cedar-quay'&&code==='A-204'?'unit-a204':`${id}-unit-${i+1}`;add('inventory',key,code,'released',{type:'home',floor,bedrooms:i%3+1,area:645+(i%4)*120,orientation:['South','West','East','North'][i%4],outdoorArea:60,priceCents:code==='A-204'?48000000:39000000+(i%7)*3500000,currency:'CAD',priceVersion:1,externalId:code,description:'Open-plan living and a private balcony.'},id,undefined,undefined,org)}}
 add('inventory','parking-p12','P-12','released',{type:'parking',priceCents:1500000,currency:'CAD',priceVersion:1},'cedar-quay');add('inventory','storage-s08','S-08','released',{type:'storage',priceCents:500000,currency:'CAD',priceVersion:1},'cedar-quay');
 add('contact','contact-emma','Emma Bennett','active',{email:'emma@example.invalid',fictional:true},'cedar-quay',undefined,'agent-a');add('contact','contact-oliver','Oliver Bennett','active',{email:'oliver@example.invalid',fictional:true},'cedar-quay',undefined,'agent-a');
 add('lead','lead-emma','Emma Bennett','negotiating',{contactId:'contact-emma',source:'Agency referral',unitId:'unit-a204',nextStep:'Approve offer'},'cedar-quay',undefined,'agent-a');
 for(const [id,name,status,owner,project] of [['mila','Mila Ross','viewing','sales','cedar-quay'],['leo','Leo Martin','qualified','agent-b','cedar-quay'],['ava','Ava Thompson','new','sales','parkline']] as const){add('contact',`contact-${id}`,name,'active',{email:`${id}@example.invalid`,fictional:true},project,undefined,owner);add('lead',`lead-${id}`,name,status,{contactId:`contact-${id}`,source:'Project website',nextStep:'Follow up'},project,undefined,owner)}
 add('deal','deal-emma','A-204 · Emma Bennett','draft',{unitId:'unit-a204',itemIds:['unit-a204','parking-p12','storage-s08'],contactId:'contact-emma',leadId:'lead-emma',partyActorIds:['buyer','co-buyer'],agentId:'agent-a',currency:'CAD',priceCents:50000000,policyVersion:1,requiredSigners:['buyer','co-buyer','manager'],binding:null,financeApproval:null,legalCompletion:null,technicalReady:false},'cedar-quay','deal-emma','sales');
 add('offer','offer-emma','Offer for A-204','draft',{items:[{id:'unit-a204',label:'A-204',amountCents:48000000,priceVersion:1},{id:'parking-p12',label:'P-12',amountCents:1500000,priceVersion:1},{id:'storage-s08',label:'S-08',amountCents:500000,priceVersion:1}],totalCents:50000000,currency:'CAD',expiresAt:later(7),version:1},'cedar-quay','deal-emma','sales');
 add('contact','contact-sam','Sam Parker','active',{email:'sam@example.invalid'},'cedar-quay',undefined,'sales');add('deal','deal-sam','A-101 · Sam Parker','completed',{unitId:'cedar-quay-unit-1',itemIds:['cedar-quay-unit-1'],contactId:'contact-sam',partyActorIds:[],currency:'CAD',priceCents:39000000,policyVersion:1,binding:{at:later(-50)},financeApproval:{at:later(-32)},legalCompletion:{at:later(-32)},technicalReady:true,completedAt:later(-30),handedOverAt:later(-28)},'cedar-quay','deal-sam','sales');add('allocation','alloc-sam','A-101 allocation','completed',{itemId:'cedar-quay-unit-1',endedAt:null},'cedar-quay','deal-sam');
 add('schedule','schedule-sam','Final payment','active',{amountCents:39000000,dueAt:later(-35),currency:'CAD',gate:'completion'},'cedar-quay','deal-sam');add('payment','payment-sam','Demo bank receipt','confirmed',{amountCents:39000000,currency:'CAD',direction:'receipt',reference:'DEMO-SAM-001',accountId:'demo-account',confirmedBy:'finance'},'cedar-quay','deal-sam');add('payment_allocation','pa-sam','Allocated receipt','active',{paymentId:'payment-sam',scheduleId:'schedule-sam',amountCents:39000000},'cedar-quay','deal-sam');
 add('service','service-tap','Kitchen tap leaking','assigned',{unitId:'cedar-quay-unit-1',location:'Kitchen',description:'Slow drip from the mixer tap.',priority:'normal',category:'Plumbing',reporterId:'contact-sam',dueAt:later(2)},'cedar-quay','deal-sam','care');add('work_order','job-tap','Repair the kitchen tap','offered',{serviceId:'service-tap',unitId:'cedar-quay-unit-1',scope:'Inspect and repair the tap. Supply a completion photograph.',contactName:'Sam Parker',contactPhone:'Ask customer care',accessConfirmed:false},'cedar-quay','deal-sam','contractor-a','cedar','service-tap');
 add('milestone','structure','Structure complete','published',{plannedAt:later(-20),actualAt:later(-18),summary:'Main structure complete. Windows are being installed.'},'cedar-quay',undefined,'delivery');add('milestone','fitout','Interior fit-out','in_progress',{plannedAt:later(50),summary:'Kitchen and bathroom finishes.'},'cedar-quay',undefined,'delivery');
 add('task','task-offer','Review offer for A-204','open',{entityId:'offer-emma',dueAt:later(0),blocker:'Manager approval'},'cedar-quay','deal-emma','manager');add('task','task-viewing','Confirm Mila’s viewing','open',{entityId:'lead-mila',dueAt:later(1)},'cedar-quay',undefined,'sales');add('task','task-care','Confirm contractor availability','open',{entityId:'job-tap',dueAt:later(1)},'cedar-quay','deal-sam','care');
 add('appointment','viewing-mila','Mila Ross · viewing','requested',{startsAt:later(1),endsAt:new Date(Date.parse(later(1))+3600000).toISOString(),resource:'Cedar sales office',type:'viewing',contactId:'contact-mila'},'cedar-quay',undefined,'sales');
 add('commission','commission-emma','Northline Realty · A-204','expected',{recipientId:'agent-a',amountCents:1000000,currency:'CAD',rateBps:200,ruleVersion:1,trigger:'completion'},'cedar-quay','deal-emma','agent-a');
 add('message','welcome','Welcome to Cedar Quay','sent',{audience:'buyer',body:'Your offer is being reviewed. We will keep your next step updated here.',recipients:['buyer','co-buyer']},'cedar-quay','deal-emma','sales');
 for(const p of actors.filter(x=>x.id!=='other-owner'))add('grant',`grant-${p.id}`,p.name,'active',{actorId:p.id,projectIds:p.projectIds,expiresAt:null},p.projectIds[0],undefined,'admin');
 return {mode:'demo',entities,actors,createdAt:now};}
export const find=(s:State,id:string)=>s.entities.find(e=>e.id===id);
export const allocations=(s:State,itemId:string)=>s.entities.find(e=>e.kind==='allocation'&&e.data.itemId===itemId&&!e.data.endedAt);
export const availability=(s:State,e:RecordItem)=>allocations(s,e.id)?.status|| (e.status==='released'?'available':e.status);
export const balance=(s:State,x:RecordItem)=>x.data.amountCents-s.entities.filter(e=>e.kind==='payment_allocation'&&e.status==='active'&&e.data.scheduleId===x.id).reduce((n,e)=>n+e.data.amountCents,0);
export function access(s:State,a:Actor,e:RecordItem):boolean{
 if(!a.active)return false;
 if(e.kind==='organization')return e.id===a.organizationId||s.entities.some(p=>p.kind==='project'&&p.organizationId===e.id&&a.projectIds.includes(p.id));
 const p=find(s,e.projectId||'');if(!p||!a.projectIds.includes(p.id))return false;
 const grant=s.entities.find(g=>g.kind==='grant'&&g.data.actorId===a.id&&g.status==='active'&&g.data.projectIds.includes(p.id)&&(!g.data.expiresAt||Date.parse(g.data.expiresAt)>Date.now()));
 if(!grant && !(a.role==='admin'&&p.organizationId===a.organizationId))return false;
 if(e.kind==='notification')return e.ownerId===a.id;
 if(e.kind==='commission_payment')return a.role==='agent'?e.data.recipientId===a.id:['finance','manager'].includes(a.role);
 if(a.role==='contractor'){const jobs=s.entities.filter(j=>j.kind==='work_order'&&j.ownerId===a.id&&!['declined','reassigned','cancelled'].includes(j.status));if(e.kind==='project')return jobs.some(j=>j.projectId===e.id);if(e.kind==='work_order')return jobs.some(j=>j.id===e.id);if(e.kind==='service')return jobs.some(j=>j.data.serviceId===e.id);return e.kind==='document'&&e.data.audience==='contractor'&&jobs.some(j=>j.id===e.parentId)}
 if(a.role==='property_manager')return e.kind==='project'||(e.kind==='service'&&!e.dealId)||(e.kind==='task'&&e.ownerId===a.id)||(e.kind==='document'&&e.data.audience==='technical'&&!e.dealId);
 const related=s.entities.find(d=>d.kind==='deal'&&d.id===e.dealId);if(a.role==='buyer'){
   const deals=s.entities.filter(d=>d.kind==='deal'&&d.data.partyActorIds?.includes(a.id));
   if(e.kind==='project')return deals.some(d=>d.projectId===e.id);
   if(e.kind==='inventory')return deals.some(d=>d.data.itemIds?.includes(e.id));
   if(e.kind==='milestone')return e.status==='published';
   if(e.kind==='task')return e.ownerId===a.id;
   if(['organization','contact','lead','offer','grant','commission','request','refund','work_order','termination'].includes(e.kind))return false;
   if(!deals.some(d=>d.id===e.dealId))return false;
   if(['message','document'].includes(e.kind))return ['buyer','all_parties'].includes(e.data.audience)&&(!e.data.recipients?.length||e.data.recipients.includes(a.id));
   return true;
 }
 if(a.role==='agent'){
   if(['project','inventory'].includes(e.kind))return true;
   if(['lead','contact','request','task'].includes(e.kind))return e.ownerId===a.id;
   if(e.kind==='commission')return e.data.recipientId===a.id;
   if(['grant','payment','payment_allocation','schedule','refund','work_order','service','bank_account','handover','inspection','termination'].includes(e.kind))return false;
   if(!related||related.data.agentId!==a.id)return false;
   if(['message','document'].includes(e.kind))return ['agent','all_parties'].includes(e.data.audience);
   return true;
 }
 if(e.kind==='grant')return a.role==='admin';
 if(e.kind==='message'&&e.data.audience==='internal')return !['buyer','agent','contractor'].includes(a.role);
 if(e.kind==='message'&&e.data.audience==='finance')return ['manager','finance'].includes(a.role);
 if(e.kind==='message'&&e.data.audience==='legal')return ['manager','legal'].includes(a.role);
 return true;
}
export function projection(s:State,a:Actor,revision:number,updatedAt:string){
 const visible=s.entities.filter(e=>access(s,a,e));
 const involved=new Set<string>([a.id]);
 if(a.role==='buyer'){for(const e of visible){if(e.kind==='deal')for(const id of e.data.partyActorIds||[])involved.add(id);if(e.kind==='project'){involved.add('manager');involved.add('care')}}}
 if(a.role==='contractor'){involved.add('care')}
 if(a.role==='agent'){for(const e of visible)if(e.kind==='deal'&&e.ownerId)involved.add(e.ownerId)}
 const actors=s.actors.filter(x=>!['buyer','contractor','agent','property_manager'].includes(a.role)?x.organizationId===a.organizationId||x.projectIds.some(p=>a.projectIds.includes(p))&&x.role==='agent':involved.has(x.id)).map(({id,name,role,organizationId,projectIds,active,company})=>({id,name,role,organizationId,projectIds,active,company}));
 return {actor:a,actors,demoActors:s.actors.map(({id,name,role,active})=>({id,name,role,active})),entities:visible.map(e=>{const x=structuredClone(e);if(a.role==='contractor'){if(e.kind==='service')x.data={description:e.data.description,location:e.data.location,priority:e.data.priority,category:e.data.category};if(e.kind==='project')x.data={city:e.data.city,timezone:e.data.timezone};delete x.dealId}if(a.role==='buyer'&&e.kind==='deal'){delete x.data.financeApproval;delete x.data.legalCompletion;delete x.data.agentId;delete x.data.contactId}if(e.kind==='document'){delete x.data.storageKey;delete x.data.fileId}return x}),revision,updatedAt,mode:'demo' as const}}
