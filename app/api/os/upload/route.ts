import {NextRequest,NextResponse} from 'next/server';
import {readRoot,gateway} from '@/lib/projectos/server';
import {access,find,DomainError} from '@/lib/projectos/domain';
export const dynamic='force-dynamic';
function valid(bytes:Uint8Array,mime:string){const hex=[...bytes.slice(0,12)].map(x=>x.toString(16).padStart(2,'0')).join('');return mime==='application/pdf'&&hex.startsWith('25504446')||mime==='image/jpeg'&&hex.startsWith('ffd8ff')||mime==='image/png'&&hex.startsWith('89504e470d0a1a0a')||mime==='image/webp'&&hex.startsWith('52494646')&&hex.slice(16,24)==='57454250'}
export async function POST(req:NextRequest){try{const {subject,state}=await readRoot(),id=req.cookies.get('os_demo_actor')?.value||'manager',actor=state.actors.find((x:{id:string;active:boolean})=>x.id===id&&x.active);if(!actor)throw new DomainError('Access unavailable.',403);
 const form=await req.formData(),file=form.get('file'),parentId=String(form.get('parentId')||'');if(!(file instanceof File))throw new DomainError('Choose a file.');
 if(file.size<1||file.size>5242880)throw new DomainError('Maximum file size is 5 MB.');
 const parent=find(state,parentId);if(!parent||!access(state,actor,parent)||!['deal','service','work_order'].includes(parent.kind))throw new DomainError('Select an accessible deal or job.',403);
 if(actor.role==='contractor'&&(parent.kind!=='work_order'||parent.ownerId!==actor.id))throw new DomainError('Select your assigned job.',403);
 if(actor.role==='buyer'&&(parent.kind!=='deal'||!parent.data.partyActorIds?.includes(actor.id)))throw new DomainError('Select your deal.',403);
 const bytes=new Uint8Array(await file.arrayBuffer());if(!valid(bytes,file.type))throw new DomainError('Only genuine PDF, JPEG, PNG or WebP files can be uploaded.');
 const hash=async(input:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',Uint8Array.from(input)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const ownerHash=await hash(new TextEncoder().encode(subject)),path=`demo/${ownerHash}/${crypto.randomUUID()}`;
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.slice(i,i+8192));
 const result=await gateway({action:'upload',subject,path,mime:file.type,base64:btoa(binary)});
 return NextResponse.json({fileId:result.path,sha256:await hash(bytes),size:file.size,mime:file.type,filename:file.name.replace(/[^\w. -]/g,'_').slice(0,100),projectId:parent.projectId,dealId:parent.kind==='deal'?parent.id:parent.dealId,parentId:parent.kind==='work_order'?parent.id:undefined},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not upload.'},{status:error instanceof DomainError?error.status:503})}}
