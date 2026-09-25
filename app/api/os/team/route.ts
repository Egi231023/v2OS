import {NextRequest,NextResponse} from 'next/server';
import {gateway,subject} from '@/lib/projectos/server';
import {DomainError,seed} from '@/lib/projectos/domain';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
async function hash(value:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function GET(){try{return json(await gateway({action:'team',operation:'list',requester:await subject()}))}catch(e){return json({error:e instanceof Error?e.message:'Unavailable'},e instanceof DomainError?e.status:503)}}
export async function POST(req:NextRequest){try{
 const requester=await subject(),body:any=await req.json();const action=body.action,data=body.data||{};
 if(action==='personal'){const res=json({saved:true});res.cookies.delete('os_team');res.cookies.delete('os_demo_actor');return res}
 if(action==='select'){const teams=await gateway({action:'team',operation:'list',requester});const team=teams.find((t:any)=>t.id===data.teamId&&t.status==='active');if(!team)throw new DomainError('Team unavailable.',403);const res=json({saved:true});res.cookies.set('os_team',team.id,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:604800});res.cookies.set('os_demo_actor',team.actorIds[0],{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:604800});return res}
 if(!['list','create','details','invite','join','approve','revoke'].includes(action))throw new DomainError('Invalid operation.');
 let token:string|undefined;
 if(action==='invite'){token=crypto.randomUUID()+crypto.randomUUID();data.tokenHash=await hash(token)}
 if(action==='join'){if(typeof data.token!=='string'||data.token.length!==72)throw new DomainError('Enter the full invitation code.');data.tokenHash=await hash(data.token);delete data.token}
 const result=await gateway({action:'team',operation:action,requester,data,seed:action==='create'?seed():undefined});return json(token?{...result,token}:result);
 }catch(e){return json({error:e instanceof Error?e.message:'Could not save.'},e instanceof DomainError?e.status:503)}}
