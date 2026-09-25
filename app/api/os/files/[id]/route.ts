import {NextRequest,NextResponse} from 'next/server';
import {readRoot,gateway,resolveActor} from '@/lib/projectos/server';
import {access,find,DomainError} from '@/lib/projectos/domain';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){try{const {id}=await params,{subject,state,root}=await readRoot(),actor=resolveActor(state,root,req.cookies.get('os_demo_actor')?.value),doc=find(state,id);if(!actor||!doc||doc.kind!=='document'||!access(state,actor,doc))throw new DomainError('Document unavailable.',404);
 const info=await gateway({action:'download',subject,actor:actor.id,path:doc.data.fileId}),binary=atob(info.base64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 const filename=String(doc.data.filename||'document').replace(/[^\w. -]/g,'_').slice(0,100);
 return new NextResponse(bytes,{headers:{'Content-Type':doc.data.mime||'application/octet-stream','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'File unavailable.'},{status:error instanceof DomainError?error.status:503})}}
