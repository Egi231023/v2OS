import {State,Actor,Command,RecordItem,Kind,DomainError,access,find,allocations} from './domain';
export const setupActions=new Set(['project.create','project.policy','inventory.import','deal.create','grant.create','grant.restore','grant.revoke','project.billing','bank.propose','bank.approve','change.order','change.implement','change.verify','milestone.create','request.review','service.pause','service.resume','task.assign']);
function fail(message:string):never{throw new DomainError(message)}
const text=(v:unknown,label:string,max=250)=>typeof v==='string'&&v.trim()&&v.length<=max?v.trim():fail(label+' is required.');
const integer=(v:unknown,min:number,max:number,label:string)=>Number.isSafeInteger(Number(v))&&Number(v)>=min&&Number(v)<=max?Number(v):fail('Invalid '+label+'.');
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():fail('Choose a valid date.');
export function setup(s:State,a:Actor,c:Command,now:string){
 const d=c.data||{};
 const role=(...roles:string[])=>{if(!roles.includes(a.role))throw new DomainError('Your role cannot perform this action.',403)};
 const get=(id:string,kind?:Kind)=>{const e=find(s,id);if(!e||kind&&e.kind!==kind||!access(s,a,e))throw new DomainError('Record unavailable.',404);return e};
 const bump=(e:RecordItem)=>{e.version++;e.updatedAt=now};
 const add=(kind:Kind,title:string,status:string,data:Record<string,any>,p:RecordItem,dealId?:string,ownerId=a.id)=>{const e:RecordItem={id:crypto.randomUUID(),kind,title,status,data,organizationId:p.organizationId,projectId:p.id,dealId,ownerId,version:1,createdAt:now,updatedAt:now};s.entities.push(e);return e};
 const e=c.id?get(c.id):undefined;if(e&&c.expectedVersion!==undefined&&c.expectedVersion!==e.version)throw new DomainError('Record changed. Refresh and retry.',409);
 let out:RecordItem;
 switch(c.action){
 case 'task.assign':{
  role('admin','manager');if(e?.kind!=='task'||e.status!=='open')fail('Choose an open task.');
  const target=s.actors.find(x=>x.id===d.actorId&&x.active),parent=find(s,e.data.entityId)||e;
  if(!target||!access(s,target,e)||!access(s,target,parent))fail('The assignee needs an existing valid grant to this task and its record.');
  const dueAt=date(d.dueAt),reason=text(d.reason,'Assignment reason');e.data.assignmentHistory=[...(e.data.assignmentHistory||[]),{ownerId:e.ownerId,dueAt:e.data.dueAt,changedBy:a.id,at:now,reason}];e.ownerId=target.id;e.data.dueAt=dueAt;bump(e);out=e;break;
 }
 case 'project.create':{
  role('admin');const title=text(d.title,'Project name'),slug=text(d.slug,'Slug',80).toLowerCase();if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||s.entities.some(x=>x.kind==='project'&&x.data.slug===slug))fail('Choose a unique lowercase project slug.');
  const currency=text(d.currency,'Currency');if(!['CAD','EUR','USD','GBP'].includes(currency))fail('Choose a supported currency.');const timezone=text(d.timezone,'Time zone');try{new Intl.DateTimeFormat('en',{timeZone:timezone})}catch{fail('Use a valid IANA time zone.')}
  const id=crypto.randomUUID();out={id,kind:'project',title,status:'Preparation',organizationId:a.organizationId,projectId:id,ownerId:a.id,version:1,createdAt:now,updatedAt:now,data:{city:text(d.city,'Location'),slug,currency,timezone,areaUnit:d.areaUnit==='sq ft'?'sq ft':'m²',ownerOrganizationId:a.organizationId,billingOrganizationId:a.organizationId,holdHours:24,policyVersion:1,depositBps:200,milestoneBps:1800,published:false,websiteDraft:'',websitePublished:'',websiteVersion:1,readiness:{organization:false,market:false,documents:false,bank:false,responsiblePeople:false},policyHistory:[]}};s.entities.push(out);a.projectIds=[...a.projectIds,id];break;
 }
 case 'project.policy':{
  role('manager');if(e?.kind!=='project')fail('Select a project.');const holdHours=integer(d.holdHours,1,168,'hold hours'),depositBps=integer(d.depositBps,1,10000,'deposit basis points'),milestoneBps=integer(d.milestoneBps,0,9999,'milestone basis points');if(depositBps+milestoneBps>10000)fail('Instalment percentages exceed 100%.');e.data.policyHistory=[...(e.data.policyHistory||[]),{version:e.data.policyVersion,holdHours:e.data.holdHours||24,depositBps:e.data.depositBps??200,milestoneBps:e.data.milestoneBps??1800}];Object.assign(e.data,{holdHours,depositBps,milestoneBps,policyVersion:e.data.policyVersion+1,policyReason:text(d.reason,'Policy approval reason'),policyApprovedBy:a.id});bump(e);out=e;break;
 }
 case 'inventory.import':{
  role('manager');const p=get(d.projectId,'project');if(!Array.isArray(d.rows)||d.rows.length<1||d.rows.length>500)fail('Import between 1 and 500 rows.');const seen=new Set<string>();let created=0,updated=0;
  for(const [index,row] of d.rows.entries()){
   const ext=text(row.externalId,'Row '+(index+1)+' external ID',100);if(seen.has(ext))fail('Duplicate external ID in row '+(index+1));seen.add(ext);
   const title=text(row.code,'Unit code',100),type=String(row.type);if(!['home','parking','storage'].includes(type))fail('Invalid inventory type in row '+(index+1));
   const currency=row.currency||p.data.currency;if(currency!==p.data.currency)fail('Inventory currency must match project.');const priceCents=integer(row.priceCents,1,9000000000000,'price');
   const data={externalId:ext,type,priceCents,currency,floor:integer(row.floor||0,0,200,'floor'),bedrooms:integer(row.bedrooms||0,0,20,'bedrooms'),area:Number(row.area||0),orientation:String(row.orientation||''),description:String(row.description||'').slice(0,1000)};if(!Number.isFinite(data.area)||data.area<0||type==='home'&&data.area===0)fail('Home area must be positive.');
   const existing=s.entities.find(x=>x.kind==='inventory'&&x.projectId===p.id&&x.data.externalId===ext);
   if(s.entities.some(x=>x.kind==='inventory'&&x.projectId===p.id&&x.title===title&&x.id!==existing?.id))fail('Unit code already exists: '+title);
   if(existing){if(allocations(s,existing.id))fail('Allocated item cannot be changed by import: '+title);if(existing.data.type!==type)fail('Inventory type is immutable.');existing.data.priceHistory=[...(existing.data.priceHistory||[]),{priceCents:existing.data.priceCents,version:existing.data.priceVersion,at:existing.updatedAt}];Object.assign(existing.data,data,{priceVersion:(existing.data.priceVersion||1)+1});existing.title=title;bump(existing);updated++}
   else{add('inventory',title,'unreleased',{...data,priceVersion:1},p);created++}
  }
  out=add('task',`Import complete: ${created} new, ${updated} updated`,'completed',{rows:d.rows.length,completedAt:now,source:'Validated CSV import',dueAt:now},p);break;
 }
 case 'deal.create':{
  role('sales','manager');const lead=get(d.leadId,'lead'),p=get(lead.projectId!,'project');if(['lost','converted'].includes(lead.status))fail('Select an active lead.');const unit=get(d.unitId,'inventory');if(unit.projectId!==p.id||unit.data.type!=='home')fail('Choose one home in this project.');
  const ids=[unit.id,...(Array.isArray(d.accessoryIds)?d.accessoryIds:[])];if(new Set(ids).size!==ids.length)fail('An item was selected twice.');const inventory=ids.map(id=>get(id,'inventory'));if(inventory.some(x=>x.projectId!==p.id||x.id!==unit.id&&x.data.type==='home'||x.status!=='released'||allocations(s,x.id)))fail('Every selected home/accessory must be available.');
  const partyIds=Array.isArray(d.partyActorIds)?d.partyActorIds:[];if(!partyIds.length||partyIds.some(id=>!s.actors.some(x=>x.id===id&&x.active&&x.role==='buyer'&&x.projectIds.includes(p.id)&&s.entities.some(g=>g.kind==='grant'&&g.status==='active'&&g.data.actorId===x.id&&g.data.projectIds.includes(p.id)&&(!g.data.expiresAt||Date.parse(g.data.expiresAt)>Date.parse(now))))))fail('Choose active buyer participants with project access.');
  // Buyers without an existing deal cannot read a project yet: validate their explicit grant instead.
  const seller=s.actors.find(x=>x.id===d.sellerSignerId&&x.active&&x.projectIds.includes(p.id)&&['manager','legal'].includes(x.role)&&access(s,x,p));if(!seller)fail('Choose an authorized seller signer.');
  const expiresAt=date(d.expiresAt);if(Date.parse(expiresAt)<=Date.parse(now))fail('Offer expiry must be in the future.');const total=inventory.reduce((n,x)=>n+x.data.priceCents,0);if(!Number.isSafeInteger(total))fail('Total exceeds supported amount.');
  out=add('deal',unit.title+' · '+lead.title,'draft',{unitId:unit.id,itemIds:ids,contactId:lead.data.contactId,leadId:lead.id,partyActorIds:[...new Set(partyIds)],agentId:s.actors.find(x=>x.id===lead.ownerId)?.role==='agent'?lead.ownerId:null,currency:p.data.currency,priceCents:total,policyVersion:p.data.policyVersion,policySnapshot:{version:p.data.policyVersion,holdHours:p.data.holdHours||24,depositBps:p.data.depositBps??200,milestoneBps:p.data.milestoneBps??1800},requiredSigners:[...new Set([...partyIds,seller.id])],binding:null,financeApproval:null,legalCompletion:null,technicalReady:false},p);out.dealId=out.id;
  add('offer','Offer for '+unit.title,'draft',{items:inventory.map(x=>({id:x.id,label:x.title,amountCents:x.data.priceCents,priceVersion:x.data.priceVersion})),totalCents:total,currency:p.data.currency,expiresAt,version:1},p,out.id);break;
 }
 case 'grant.create':case 'grant.restore':{
  role('admin');const p=get(d.projectId,'project');if(p.organizationId!==a.organizationId)fail('Only the owning organization can grant access.');
  let target=s.actors.find(x=>x.id===d.actorId);if(c.action==='grant.create'&&!target){const roleName=text(d.role,'Role');if(!['admin','manager','sales','agent','buyer','legal','finance','delivery','care','contractor','property_manager'].includes(roleName))fail('Invalid role.');target={id:crypto.randomUUID(),name:text(d.name,'Name'),role:roleName as Actor['role'],organizationId:a.organizationId,projectIds:[],active:true};s.actors.push(target)}if(!target)fail('Choose a person.');
  const expiresAt=d.expiresAt?date(d.expiresAt):null;if(expiresAt&&Date.parse(expiresAt)<=Date.parse(now))fail('Grant expiry must be in the future.');target.active=true;target.projectIds=[...new Set([...target.projectIds,p.id])];
  if(s.entities.some(x=>x.kind==='grant'&&x.data.actorId===target!.id&&x.status==='active'&&x.data.projectIds.includes(p.id)&&(!x.data.expiresAt||Date.parse(x.data.expiresAt)>Date.parse(now))))fail('This person already has an active project grant.');
  out=add('grant',target.name,'active',{actorId:target.id,projectIds:[p.id],expiresAt,reason:text(d.reason,'Grant reason')},p);break;
 }
 case 'grant.revoke':{
  role('admin');if(e?.kind!=='grant'||e.organizationId!==a.organizationId)fail('Only the owning organization may revoke this grant.');const who=s.actors.find(x=>x.id===e.data.actorId);if(!who||who.id===a.id)fail('Keep your administrator access.');if(who.role==='admin'&&s.actors.filter(x=>x.role==='admin'&&x.active&&x.organizationId===a.organizationId).length===1)fail('Keep at least one administrator.');e.status='revoked';bump(e);
  const grants=s.entities.filter(x=>x.kind==='grant'&&x.data.actorId===who.id&&x.status==='active'&&(!x.data.expiresAt||Date.parse(x.data.expiresAt)>Date.parse(now)));who.projectIds=[...new Set<string>(grants.flatMap(x=>x.data.projectIds))];if(who.role!=='admin'&&!grants.length)who.active=false;
  for(const task of s.entities.filter(x=>x.kind==='task'&&x.ownerId===who.id&&x.status==='open'&&e.data.projectIds.includes(x.projectId))){const p=find(s,task.projectId!)!;if(access(s,who,p))continue;const next=s.actors.find(x=>x.id!==who.id&&x.active&&x.role==='manager'&&access(s,x,p));if(!next)fail('Assign an active project manager before revoking this grant.');task.ownerId=next.id;bump(task)}out=e;break;
 }
 case 'project.billing':{role('admin');if(e?.kind!=='project'||e.organizationId!==a.organizationId)fail('Only the project owner may change the payer.');const org=s.entities.find(x=>x.kind==='organization'&&x.id===d.organizationId);if(!org)fail('Choose an existing organization.');e.data.billingOrganizationId=org.id;bump(e);out=e;break;}
 case 'bank.propose':{role('finance');const p=get(d.projectId,'project');out=add('bank_account',text(d.title,'Account label'),'proposed',{instructions:text(d.instructions,'Verified bank instructions',1000),evidence:text(d.reason,'Verification evidence'),proposedBy:a.id,currency:p.data.currency},p);break;}
 case 'bank.approve':{role('finance');if(e?.kind!=='bank_account'||e.status!=='proposed'||e.data.proposedBy===a.id)fail('A second Finance person must approve this account.');const p=get(e.projectId!,'project');for(const previous of s.entities.filter(x=>x.kind==='bank_account'&&x.projectId===p.id&&x.status==='approved')){previous.status='superseded';bump(previous)}e.status='approved';e.data.approvedBy=a.id;e.data.approvedAt=now;bump(e);p.data.bankAccountId=e.id;p.data.bankVersion=(p.data.bankVersion||0)+1;bump(p);for(const deal of s.entities.filter(x=>x.kind==='deal'&&x.projectId===p.id))add('message','Bank instructions updated','sent',{audience:'buyer',body:'Project bank instructions have changed. Review the approved account before paying.',recipients:deal.data.partyActorIds||[]},p,deal.id);out=e;break;}
 case 'change.order':case 'change.implement':case 'change.verify':{role('delivery');if(e?.kind!=='change')fail('Select a change.');const flow={'change.order':['approved','ordered'],'change.implement':['ordered','implemented'],'change.verify':['implemented','verified']}[c.action]!;if(e.status!==flow[0])fail('Complete the previous step first.');e.status=flow[1];e.data[flow[1]]={at:now,actorId:a.id,evidence:text(d.reason,'Evidence')};bump(e);out=e;break;}
 case 'milestone.create':{role('delivery','manager');const p=get(d.projectId,'project');out=add('milestone',text(d.title,'Milestone title'),'in_progress',{plannedAt:date(d.plannedAt),summary:text(d.description,'Description')},p);break;}
 case 'request.review':{role('sales','manager');if(e?.kind!=='request'||e.status!=='submitted')fail('Select a submitted request.');if(!['reviewing','declined'].includes(d.status))fail('Choose an outcome.');e.status=d.status;e.data.reviewReason=text(d.reason,'Review reason');bump(e);out=e;break;}
 case 'service.pause':case 'service.resume':{role('care');if(e?.kind!=='service')fail('Choose a service case.');if(c.action==='service.pause'){if(['closed','declined','on_hold'].includes(e.status))fail('This case cannot be paused.');const dueAt=date(d.dueAt);if(Date.parse(dueAt)<=Date.parse(now))fail('Choose a future review date.');e.data.pause={previousStatus:e.status,at:now,reason:text(d.reason,'Pause reason'),ownerId:a.id,reviewAt:dueAt};e.status='on_hold'}else{if(e.status!=='on_hold'||!e.data.pause)fail('Case is not paused.');e.status=e.data.pause.previousStatus;e.data.pauseHistory=[...(e.data.pauseHistory||[]),{...e.data.pause,resumedAt:now,reasonResolved:text(d.reason,'Resolution')}];delete e.data.pause}bump(e);out=e;break;}
 default:fail('Unsupported setup action.');
 }
 return {state:s,id:out!.id,message:'Saved successfully.'};
}
