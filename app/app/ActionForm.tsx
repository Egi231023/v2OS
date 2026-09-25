'use client';
import {useState,useRef,FormEvent} from 'react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {RecordItem,parseCents} from '@/lib/projectos/domain';
import {setupFields} from './setup-fields';
type Field={name:string;label:string;type?:string;options?:{value:string;label:string}[];required?:boolean;full?:boolean;placeholder?:string};
const spec:Record<string,Field[]>={
 ...setupFields,
 'lead.create':[{name:'name',label:'Full name',required:true},{name:'email',label:'Email',type:'email',required:true},{name:'source',label:'Source',placeholder:'Phone, website, referral'},{name:'unitId',label:'Interested home',type:'inventory'},{name:'marketingConsent',label:'Separate marketing consent',type:'checkbox'}],
 'lead.stage':[{name:'status',label:'Stage',type:'select',options:['contacted','qualified','viewing','negotiating','lost'].map(x=>({value:x,label:x}))},{name:'reason',label:'Reason (required if lost)'}],
 'offer.approve':[],
 'hold.create':[],
 'hold.extend':[{name:'expiresAt',label:'New expiry',type:'datetime-local',required:true},{name:'reason',label:'Reason',required:true}],
 'hold.release':[{name:'reason',label:'Reason and evidence',required:true}],
 'hold.review':[{name:'reason',label:'Legal or Finance conclusion',required:true}],
 'document.create':[{name:'title',label:'Document title',required:true},{name:'type',label:'Document type',type:'select',options:['reservation_agreement','sale_agreement','evidence','technical','completion'].map(x=>({value:x,label:x.replaceAll('_',' ')}))},{name:'audience',label:'Who may see it?',type:'select',options:['internal','buyer','agent','all_parties','finance','legal','contractor'].map(x=>({value:x,label:x.replaceAll('_',' ')}))},{name:'file',label:'PDF or photo, maximum 5 MB',type:'file',required:true,full:true}],
 'document.review':[], 'document.approve':[], 'document.signing':[],
 'document.signature':[{name:'signerId',label:'Verified signer',type:'actor',required:true},{name:'signedAt',label:'Date signed',type:'datetime-local',required:true},{name:'evidenceId',label:'Uploaded signature evidence',type:'document',required:true}],
 'document.cancel_signing':[{name:'reason',label:'Cancellation evidence',required:true}],
 'payment.record':[{name:'amountCents',label:'Amount (CAD)',type:'money',required:true},{name:'reference',label:'Bank reference',required:true},{name:'receivedAt',label:'Date received or submitted',type:'datetime-local',required:true},{name:'evidence',label:'Bank evidence description',required:true,full:true}],
 'payment.confirm':[{name:'reason',label:'Bank verification evidence',required:true,full:true}],
 'payment.reject':[{name:'reason',label:'Reason',required:true}],
 'payment.allocate':[{name:'scheduleId',label:'Instalment',type:'schedule',required:true},{name:'amountCents',label:'Amount to allocate (CAD)',type:'money',required:true}],
 'payment.unallocate':[{name:'reason',label:'Correction reason',required:true}],
 'schedule.due':[{name:'dueAt',label:'Confirmed milestone due date',type:'datetime-local',required:true}],
 'reservation.confirm':[],
 'deal.binding':[{name:'reason',label:'Binding conditions reviewed',required:true,full:true}],
 'termination.request':[{name:'reason',label:'Why is this deal ending?',required:true,full:true}],
 'termination.review':[{name:'reason',label:'Review evidence',required:true}],
 'termination.release':[{name:'reason',label:'Evidence that claim ended',required:true}],
 'milestone.publish':[{name:'reason',label:'Completion evidence',required:true}],
 'change.create':[{name:'title',label:'Change title',required:true},{name:'description',label:'Requested change',required:true,full:true}],
 'change.price':[{name:'amountCents',label:'Additional amount (CAD)',type:'money',required:true},{name:'reason',label:'Feasibility and price evidence',required:true}],
 'change.accept':[], 'change.approve':[],
 'inspection.create':[{name:'rooms',label:'Rooms inspected',required:true},{name:'checks',label:'Checklist and observed defects',required:true,full:true},{name:'criticalDefects',label:'Critical defect blocks readiness',type:'checkbox'}],
 'deal.ready':[{name:'reason',label:'Technical readiness evidence',required:true}],
 'deal.finance_approve':[{name:'reason',label:'Financial clearance evidence',required:true}],
 'deal.legal_approve':[{name:'reason',label:'Legal completion evidence',required:true}],
 'deal.complete':[],
 'handover.create':[{name:'scheduledAt',label:'Appointment',type:'datetime-local',required:true},{name:'participants',label:'Participants',required:true}],
 'handover.confirm':[],
 'handover.complete':[{name:'outcome',label:'Outcome',type:'select',options:['accepted','accepted_with_defects','refused'].map(x=>({value:x,label:x.replaceAll('_',' ')}))},{name:'meters',label:'Meter readings with units',required:true},{name:'keys',label:'Keys and access',required:true},{name:'reason',label:'Signed protocol evidence',required:true,full:true}],
 'service.create':[{name:'title',label:'Issue title',required:true},{name:'location',label:'Room or shared area',required:true},{name:'description',label:'What happened?',required:true,full:true},{name:'priority',label:'Priority',type:'select',options:[{value:'normal',label:'Normal'},{value:'critical',label:'Critical'}]}],
 'service.review':[{name:'reason',label:'Reason if reopening'}],
 'service.decide':[{name:'status',label:'Decision',type:'select',options:['approved','declined','needs_information'].map(x=>({value:x,label:x.replaceAll('_',' ')}))},{name:'reason',label:'Decision and coverage reason',required:true,full:true}],
 'service.assign':[{name:'contractorId',label:'Contractor',type:'contractor',required:true},{name:'scope',label:'Work scope and evidence required',required:true,full:true}],
 'job.accept':[], 'job.decline':[{name:'reason',label:'Reason',required:true}],
 'job.schedule':[{name:'scheduledAt',label:'Agreed appointment',type:'datetime-local',required:true},{name:'accessConfirmed',label:'Resident confirmed access',type:'checkbox'},{name:'reason',label:'How access was agreed',required:true}],
 'job.start':[],
 'job.submit':[{name:'reason',label:'Work completed',required:true,full:true},{name:'evidenceId',label:'Photo uploaded to this job',type:'document',required:true}],
 'service.owner_response':[{name:'response',label:'Repair result',type:'select',options:[{value:'confirmed',label:'Confirmed'},{value:'disputed',label:'Needs further work'}]},{name:'reason',label:'Your feedback',required:true}],
 'service.close':[{name:'reason',label:'How the repair was verified',required:true},{name:'contactAttempts',label:'Contact attempts if owner did not respond'},{name:'followupInspection',label:'Documented follow-up inspection'}],
 'task.complete':[],
 'message.send':[{name:'body',label:'Message',required:true,full:true},{name:'audience',label:'Audience',type:'select',options:['internal','buyer','agent','all_parties'].map(x=>({value:x,label:x.replaceAll('_',' ')}))}],
 'website.save':[{name:'content',label:'Public project description',required:true,full:true}], 'website.publish':[],
 'inventory.price':[{name:'priceCents',label:'New published price (CAD)',type:'money',required:true}],
 'inventory.release':[{name:'status',label:'Release mode',type:'select',options:['released','unreleased','withdrawn'].map(x=>({value:x,label:x}))}],
 'refund.request':[{name:'amountCents',label:'Refund amount (CAD)',type:'money',required:true},{name:'reason',label:'Reason',required:true}],
 'refund.approve':[],
 'refund.execute':[{name:'reference',label:'Executed refund bank reference',required:true},{name:'reason',label:'Evidence from the bank (no money is sent here)',required:true,full:true}],
 'commission.approve':[],
 'commission.pay':[{name:'amountCents',label:'Amount paid (CAD)',type:'money',required:true},{name:'reference',label:'Bank reference',required:true},{name:'reason',label:'Evidence of external payment',required:true}],
 'appointment.create':[{name:'title',label:'Appointment title',required:true},{name:'startsAt',label:'Start (your local time)',type:'datetime-local',required:true},{name:'endsAt',label:'End (your local time)',type:'datetime-local',required:true},{name:'resource',label:'Room / shared resource',required:true}],
 'appointment.confirm':[],
 'appointment.finish':[{name:'status',label:'Outcome',type:'select',options:['completed','cancelled','no_show'].map(x=>({value:x,label:x.replaceAll('_',' ')}))},{name:'reason',label:'Outcome note',required:true}],
 'notification.read':[],
 'grant.revoke':[]
};
export type ActionContext={id?:string;version?:number;projectId?:string;dealId?:string;parentId?:string};
export function ActionButton({label,action,context,records,actors,onComplete,variant='secondary'}:{label:string;action:string;context:ActionContext;records:RecordItem[];actors:{id:string;name:string;role:string;active:boolean}[];onComplete:()=>Promise<void>;variant?:'primary'|'secondary'}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef<{fingerprint:string;command:Record<string,unknown>}|null>(null);
 const uploaded=useRef<{fingerprint:string;data:Record<string,unknown>}|null>(null);
 const available=(kind:string)=>records.filter(e=>e.kind===kind&&(kind==='organization'||!context.projectId||e.projectId===context.projectId)&&(!context.dealId||e.dealId===context.dealId||kind==='inventory')&&(!context.parentId||kind!=='document'||e.parentId===context.parentId));
 async function submit(ev:FormEvent<HTMLFormElement>){ev.preventDefault();setBusy(true);setError('');try{const form=new FormData(ev.currentTarget),data:Record<string,any>={projectId:context.projectId,dealId:context.dealId,parentId:context.parentId,currency:records.find(x=>x.id===context.projectId&&x.kind==='project')?.data.currency||'CAD'};
 for(const f of spec[action]||[]){const value=form.get(f.name);if(f.type==='file')continue;if(['buyers','accessories'].includes(f.type||'')){data[f.name]=form.getAll(f.name).map(String);continue;}if(f.type==='checkbox')data[f.name]=value==='on';else if(f.type==='money')data[f.name]=parseCents(String(value||''));else if(f.type==='datetime-local')data[f.name]=value?new Date(String(value)).toISOString():undefined;else data[f.name]=String(value||'')}
 if(action==='document.create'){const file=form.get('file');if(!(file instanceof File)||!file.size)throw new Error('Choose a file.');const fingerprint=[file.name,file.size,file.lastModified,context.parentId,context.dealId].join(':');if(uploaded.current?.fingerprint!==fingerprint){const upload=new FormData();upload.set('file',file);upload.set('parentId',context.parentId||context.dealId||'');const res=await fetch('/api/os/upload',{method:'POST',body:upload}),out:any=await res.json();if(!res.ok)throw new Error(out.error);uploaded.current={fingerprint,data:out}}Object.assign(data,uploaded.current.data)}
 const fingerprint=JSON.stringify({action,id:context.id,data});
 if(pending.current?.fingerprint!==fingerprint)pending.current={fingerprint,command:{action,id:context.id,expectedVersion:context.version,data,key:crypto.randomUUID()}};
 const command=pending.current.command;const res=await fetch('/api/os',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'command',command})});const out:any=await res.json();if(!res.ok){if(res.status===409){pending.current=null;await onComplete()}throw new Error(out.error||'Could not save. Retry safely with the same details.')}pending.current=null;uploaded.current=null;setOpen(false);await onComplete();
 }catch(e){setError(e instanceof Error?e.message:'Could not save.')}finally{setBusy(false)}}
 return <><button className={'btn '+(variant==='primary'?'primary':'')} onClick={()=>{setOpen(true);setError('')}}>{label}</button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]"><DialogHeader><DialogTitle>{label}</DialogTitle><DialogDescription>Changes are saved to this fictional workspace after validation.</DialogDescription></DialogHeader><form className="column" onSubmit={submit}><div className="form-grid">{(spec[action]||[]).map(f=><div className={'field '+(f.full?'wide':'')} key={f.name}><label htmlFor={action+'-'+f.name}>{f.label.replace('(CAD)','('+String(records.find(x=>x.id===context.projectId)?.data.currency||'CAD')+')')}</label>{['buyers','accessories'].includes(f.type||'')?<select id={action+'-'+f.name} name={f.name} multiple required={f.required} size={4}>{(f.type==='buyers'?actors.filter(x=>x.active&&x.role==='buyer').map(x=>({value:x.id,label:x.name})):available('inventory').filter(x=>x.data.type!=='home').map(x=>({value:x.id,label:x.title}))).map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select>:f.type==='checkbox'?<input id={action+'-'+f.name} type="checkbox" name={f.name} style={{width:20,height:20}}/>:f.type==='select'||['actor','contractor','document','schedule','inventory','home','lead','organization'].includes(f.type||'')?<select id={action+'-'+f.name} name={f.name} required={f.required}><option value="">Choose…</option>{(f.options||(f.type==='actor'?actors.filter(x=>x.active||action==='grant.restore').map(x=>({value:x.id,label:x.name+' · '+x.role})):f.type==='contractor'?actors.filter(x=>x.active&&x.role==='contractor').map(x=>({value:x.id,label:x.name})):available(f.type==='home'?'inventory':f.type||'').filter(x=>f.type!=='home'||x.data.type==='home').map(x=>({value:x.id,label:x.title+(x.kind==='schedule'?' · '+(x.data.amountCents/100).toLocaleString('en-CA')+' '+x.data.currency:'')})))).map(x=><option value={x.value} key={x.value}>{x.label}</option>)}</select>:f.full&&f.type!=='file'?<textarea id={action+'-'+f.name} name={f.name} required={f.required} placeholder={f.placeholder}/>:<input id={action+'-'+f.name} type={f.type==='money'?'text':f.type||'text'} inputMode={f.type==='money'?'decimal':undefined} name={f.name} required={f.required} placeholder={f.placeholder}/>}</div>)}</div>{error&&<p role="alert" className="error">{error}</p>}<div className="row between"><button className="btn" type="button" onClick={()=>setOpen(false)}>Cancel</button><button disabled={busy} type="submit" className="btn primary">{busy?'Saving…':'Confirm '+label.toLowerCase()}</button></div></form></DialogContent></Dialog></>}
