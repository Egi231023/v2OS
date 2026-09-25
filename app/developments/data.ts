import {gateway,subject} from '@/lib/projectos/server';
import {seed,State,availability,RecordItem,money} from '@/lib/projectos/domain';
export async function development(slug:string){
 let who:string;try{who=await subject()}catch{who='site:public-demo-preview'}
 const root=await gateway({action:'read',subject:who,seed:seed()});
 const state=root.state as State;
 const project=state.entities.find(x=>x.kind==='project'&&x.data.slug===slug&&x.data.published);
 if(!project)return null;
 const homes=state.entities.filter(x=>x.kind==='inventory'&&x.projectId===project.id&&x.data.type==='home').map(x=>({id:x.id,code:x.title,bedrooms:x.data.bedrooms,area:x.data.area,areaUnit:project.data.areaUnit,floor:x.data.floor,orientation:x.data.orientation,outdoorArea:x.data.outdoorArea,priceCents:x.data.priceCents,currency:x.data.currency,availability:availability(state,x)}));
 return {id:project.id,slug,currency:project.data.currency,areaUnit:project.data.areaUnit,city:project.data.city,name:project.title,description:project.data.websitePublished,completionEstimate:project.data.completionEstimate,homes};
}
export type Development=NonNullable<Awaited<ReturnType<typeof development>>>;
