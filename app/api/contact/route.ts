import {NextRequest,NextResponse} from 'next/server';
import {gateway} from '@/lib/projectos/server';
export async function POST(req:NextRequest){
 try{
  const body:any=await req.json();
  if(body.website)return NextResponse.json({received:true});
  const data=await gateway({action:'inquiry',name:body.name,email:body.email,company:body.company,message:body.message});
  return NextResponse.json({received:!!data.received},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not receive your inquiry.'},{status:503})}
}
