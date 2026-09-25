import {NextRequest,NextResponse} from 'next/server';
import {readRoot,resolveActor} from '@/lib/projectos/server';
import {report,reportCSV,ReportKind} from '@/lib/projectos/reports';
import {DomainError} from '@/lib/projectos/domain';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){try{
 const {state,root}=await readRoot(),actor=resolveActor(state,root,req.cookies.get('os_demo_actor')?.value),q=req.nextUrl.searchParams;
 const result=report(state,actor,{kind:(q.get('kind')||'available') as ReportKind,projectId:q.get('project')||'all',from:q.get('from')||undefined,to:q.get('to')||undefined});
 if(q.get('format')==='csv')return new NextResponse(reportCSV(result.rows),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="projectos-${result.kind}.csv"`,'Cache-Control':'no-store'}});
 const page=Math.max(1,Number(q.get('page')||1));if(!Number.isSafeInteger(page))throw new DomainError('Invalid page.');
 return NextResponse.json({...result,rows:result.rows.slice((page-1)*50,page*50),page,pages:Math.max(1,Math.ceil(result.count/50))},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Report unavailable.'},{status:e instanceof DomainError?e.status:503,headers:{'Cache-Control':'no-store'}})}}
