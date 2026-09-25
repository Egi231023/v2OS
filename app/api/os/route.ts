import {NextRequest,NextResponse} from 'next/server';
import {projection,Command,DomainError} from '@/lib/projectos/domain';
import {gateway,readRoot,resolveActor} from '@/lib/projectos/server';
import {run} from '@/lib/projectos/engine';
export const dynamic='force-dynamic';
const json=(x:unknown,status=200)=>NextResponse.json(x,{status,headers:{'Cache-Control':'no-store'}});
async function view(req:NextRequest){const {subject,root,state,requester}=await readRoot();
 const actor=resolveActor(state,root,req.cookies.get('os_demo_actor')?.value);return {subject,root,state,actor,requester};}
export async function GET(req:NextRequest){try{const v=await view(req);const result=projection(v.state,v.actor,v.root.revision,v.root.updatedAt);if(v.root.allowedActors)result.demoActors=result.demoActors.filter(x=>v.root.allowedActors.includes(x.id));return json({...result,shared:!!v.root.allowedActors})}catch(error){return json({error:error instanceof Error?error.message:'Data unavailable.'},error instanceof DomainError?error.status:503)}}
export async function POST(req:NextRequest){try{const body=await req.json() as {action:string;actorId?:string;command?:Command};const v=await view(req);
 if(body.action==='switch'){const next=v.state.actors.find((x:{id:string;active:boolean})=>x.id===body.actorId&&x.active);if(!next||v.root.allowedActors&&!v.root.allowedActors.includes(next.id))throw new DomainError('Demo person unavailable.',404);const res=json({actorId:next.id});res.cookies.set('os_demo_actor',next.id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:60*60*24*7});return res}
 if(body.action!=='command'||!body.command||typeof body.command.action!=='string'||typeof body.command.key!=='string'||!/^[a-f0-9-]{36}$/.test(body.command.key))throw new DomainError('Invalid request.');
 const command=body.command;const bytes=new TextEncoder().encode(JSON.stringify({action:command.action,id:command.id,expectedVersion:command.expectedVersion,data:command.data}));const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const existing=await gateway({action:'lookup',subject:v.subject,actor:v.actor.id,operation:command.action,key:command.key,hash});if(existing)return json(existing);
 if(v.root.allowedActors&&['refund.approve','bank.approve'].includes(command.action)){const proposed=v.state.entities.find(x=>x.id===command.id);if(proposed?.data.proposedSubject===v.requester)throw new DomainError('A different signed-in person must approve this proposal.',403)}
 const output=run(v.state,v.actor,command);if(v.root.allowedActors&&['refund.request','bank.propose'].includes(command.action)){const proposed=output.state.entities.find(x=>x.id===output.id);if(proposed)proposed.data.proposedSubject=v.requester}
 const committed=await gateway({action:'commit',subject:v.subject,expected:v.root.revision,state:output.state,actor:v.actor.id,operation:command.action,key:command.key,hash,result:{id:output.id,message:output.message},reason:typeof command.data?.reason==='string'?command.data.reason:'',entity:output.id});return json(committed)
 }catch(error){return json({error:error instanceof Error?error.message:'Could not save.'},error instanceof DomainError?error.status:503)}}
