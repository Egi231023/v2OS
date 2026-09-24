import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'projectos-acceptance-'));
for(const name of ['domain','engine']){let source=fs.readFileSync(`lib/projectos/${name}.ts`,'utf8').replace("from './domain'","from './domain.mjs'");const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;fs.writeFileSync(path.join(temp,`${name}.mjs`),code)}
const {seed,access,projection,balance}=await import(pathToFileURL(path.join(temp,'domain.mjs'))),{run}=await import(pathToFileURL(path.join(temp,'engine.mjs')));
let state=seed();const who=id=>state.actors.find(a=>a.id===id),entity=id=>state.entities.find(e=>e.id===id),invoke=(actor,action,id,data={})=>{const command={key:crypto.randomUUID(),action,id,expectedVersion:id?entity(id)?.version:undefined,data};const output=run(state,who(actor),command);state=output.state;return output.id};
const fail=(actor,action,id,data,pattern)=>assert.throws(()=>invoke(actor,action,id,data),pattern);
// A01: unrelated company cannot open or act on another company's inventory.
assert.equal(access(state,who('other-owner'),entity('unit-a204')),false);
fail('other-owner','inventory.price','unit-a204',{priceCents:100},/not found|accessible/i);
assert(!projection(state,who('other-owner'),1,'').entities.some(x=>x.id==='unit-a204'));
// A04/A05: only one exclusive allocation; accessories are acquired together.
invoke('manager','offer.approve','offer-emma');invoke('sales','hold.create','deal-emma');
assert.equal(state.entities.filter(x=>x.kind==='allocation'&&x.dealId==='deal-emma'&&!x.data.endedAt).length,3);
const duplicate=structuredClone(entity('deal-emma'));duplicate.id='deal-duplicate';duplicate.status='draft';duplicate.title='A-204 · Other person';state.entities.push(duplicate);
const secondOffer=structuredClone(entity('offer-emma'));secondOffer.id='offer-duplicate';secondOffer.dealId='deal-duplicate';state.entities.push(secondOffer);
fail('sales','hold.create','deal-duplicate',{},/unavailable/);
assert.equal(state.entities.filter(x=>x.kind==='allocation'&&x.dealId==='deal-duplicate').length,0);
// A12/A13/A17: evidence alone is not received; two verified partial payments add exactly.
const deposit=state.entities.find(x=>x.kind==='schedule'&&x.dealId==='deal-emma'&&x.data.gate==='reservation');
function receipt(reference,amount){const id=invoke('buyer','payment.record',undefined,{dealId:'deal-emma',projectId:'cedar-quay',currency:'CAD',amountCents:amount,reference,receivedAt:new Date().toISOString(),evidence:'Fictional bank receipt'});assert.equal(entity(id).status,'pending');invoke('finance','payment.confirm',id,{reason:'Fictional bank ledger'});invoke('finance','payment.allocate',id,{scheduleId:deposit.id,amountCents:amount});return id}
receipt('TEST-4000',400000);assert.equal(balance(state,deposit),600000);receipt('TEST-6000',600000);assert.equal(balance(state,deposit),0);
fail('manager','reservation.confirm','deal-emma',{},/agreement/);
// Approved agreement, signing and verified evidence for all parties.
const docData=(type,parentId='deal-emma')=>({projectId:'cedar-quay',dealId:'deal-emma',parentId,title:type,type,audience:'buyer',fileId:'demo/test-file',filename:'evidence.pdf',mime:'application/pdf',size:100,sha256:'123456'});
const agreement=invoke('legal','document.create',undefined,docData('reservation_agreement'));
invoke('legal','document.review',agreement);invoke('legal','document.approve',agreement);invoke('legal','document.signing',agreement);
for(const signerId of ['buyer','co-buyer','manager']){const proof=invoke('legal','document.create',undefined,docData('evidence'));invoke('legal','document.signature',agreement,{signerId,signedAt:new Date().toISOString(),evidenceId:proof})}
assert.equal(entity(agreement).status,'fully_signed');invoke('manager','reservation.confirm','deal-emma');assert.equal(entity('deal-emma').status,'reserved');
const sale=invoke('legal','document.create',undefined,docData('sale_agreement'));invoke('legal','document.review',sale);invoke('legal','document.approve',sale);invoke('legal','document.signing',sale);
for(const signerId of ['buyer','co-buyer','manager']){const proof=invoke('legal','document.create',undefined,docData('evidence'));invoke('legal','document.signature',sale,{signerId,signedAt:new Date().toISOString(),evidenceId:proof})}
fail('manager','deal.complete','deal-emma',{},/Binding/);
invoke('legal','deal.binding','deal-emma',{reason:'All fictional conditions checked'});
fail('delivery','deal.ready','deal-emma',{reason:'Checked'},/inspection/);
const inspection=invoke('delivery','inspection.create',undefined,{dealId:'deal-emma',rooms:'All rooms',checks:'One minor paint mark',criticalDefects:false});invoke('delivery','deal.ready','deal-emma',{reason:'Technical checklist complete'});
const handover=invoke('delivery','handover.create',undefined,{dealId:'deal-emma',scheduledAt:new Date(Date.now()+86400000).toISOString(),participants:'Buyer, delivery'});invoke('delivery','handover.confirm',handover);fail('delivery','handover.complete',handover,{outcome:'accepted',meters:'1 m3',keys:'2',reason:'Signed'},/Sale/);
const line90=state.entities.find(x=>x.kind==='schedule'&&x.dealId==='deal-emma'&&x.data.amountCents===9000000);
const line400=state.entities.find(x=>x.kind==='schedule'&&x.dealId==='deal-emma'&&x.data.amountCents===40000000);
for(const [line,amount,reference] of [[line90,9000000,'TEST-90000'],[line400,40000000,'TEST-400000']]){const id=invoke('finance','payment.record',undefined,{dealId:'deal-emma',projectId:'cedar-quay',currency:'CAD',amountCents:amount,reference,receivedAt:new Date().toISOString(),evidence:'Fictional bank ledger'});invoke('finance','payment.confirm',id,{reason:'Verified'});invoke('finance','payment.allocate',id,{scheduleId:line.id,amountCents:amount})}
assert.equal(balance(state,line90),0);assert.equal(balance(state,line400),0);
invoke('finance','deal.finance_approve','deal-emma',{reason:'500,000 verified'});invoke('legal','deal.legal_approve','deal-emma',{reason:'Fictional final documents and formalities'});invoke('manager','deal.complete','deal-emma');
assert.equal(entity('deal-emma').status,'completed');invoke('delivery','handover.complete',handover,{outcome:'accepted_with_defects',meters:'Electric 112 kWh',keys:'Two keys',reason:'Fictional signed protocol'});assert(entity('deal-emma').data.handedOverAt);
const issue=invoke('buyer','service.create',undefined,{projectId:'cedar-quay',dealId:'deal-emma',title:'Paint finish',location:'Living room',description:'One minor paint defect',priority:'normal'});
invoke('care','service.review',issue);invoke('care','service.decide',issue,{status:'approved',reason:'Covered in fictional demonstration'});
const job=invoke('care','service.assign',issue,{contractorId:'contractor-b',scope:'Repair paint and document result'});invoke('contractor-b','job.accept',job);invoke('contractor-b','job.schedule',job,{scheduledAt:new Date(Date.now()+172800000).toISOString(),accessConfirmed:true,reason:'Resident agreed to visit'});invoke('contractor-b','job.start',job);
const evidence=invoke('contractor-b','document.create',undefined,{...docData('evidence',job),parentId:job,mime:'image/png',filename:'finished.png'});invoke('contractor-b','job.submit',job,{evidenceId:evidence,reason:'Paint repaired'});assert.equal(entity(issue).status,'awaiting_verification');
fail('contractor-b','service.close',issue,{reason:'Done'},/role/);invoke('buyer','service.owner_response',issue,{response:'confirmed',reason:'Repair checked'});invoke('care','service.close',issue,{reason:'Photograph and owner response checked'});assert.equal(entity(issue).status,'closed');
// A16/A35: a refund correction after completion creates debt without reversing sale or keys.
const finalReceipt=state.entities.find(x=>x.kind==='payment'&&x.data.reference==='TEST-400000');
const refund=invoke('finance','refund.request',finalReceipt.id,{amountCents:200000,reason:'Fictional corrective refund'});
fail('finance','refund.approve',refund,{},/Another Finance/);
invoke('finance-2','refund.approve',refund);
invoke('finance','refund.execute',refund,{reference:'TEST-REFUND-2000',reason:'Verified fictional bank movement'});
assert.equal(balance(state,line400),200000);assert.equal(entity('deal-emma').status,'completed');assert(entity('deal-emma').data.handedOverAt);
fail('finance','payment.allocate',finalReceipt.id,{scheduleId:line400.id,amountCents:200000},/exceeds/);
// Confirmed resource bookings cannot overlap, even for different owners.
const startsAt=new Date(Date.now()+86400000).toISOString(),endsAt=new Date(Date.now()+90000000).toISOString();
const visit=invoke('sales','appointment.create',undefined,{projectId:'cedar-quay',title:'QA viewing 1',startsAt,endsAt,resource:'QA sales suite'});
invoke('sales','appointment.confirm',visit);
const otherVisit=invoke('manager','appointment.create',undefined,{projectId:'cedar-quay',title:'QA viewing 2',startsAt,endsAt,resource:'QA sales suite'});
fail('manager','appointment.confirm',otherVisit,{},/confirmed appointment/);
console.log('PASS organization isolation; atomic item set; exclusive hold conflict; evidence/payment distinction; exact 4k+6k; reservation/signature/binding gates; readiness/key gates; 500k completion; handover; repair verification; two-person refund; post-completion 2k balance; appointment collision.');
fs.rmSync(temp,{recursive:true,force:true});
