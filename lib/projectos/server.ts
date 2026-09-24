import 'server-only';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {DomainError,seed,State} from './domain';
export async function subject(){const user=await getChatGPTUser();if(user)return 'site:'+user.userId;if(process.env.NODE_ENV==='development')return 'site:local-preview-test';throw new DomainError('Please sign in to continue.',401)}
export async function gateway(body:Record<string,unknown>):Promise<any>{const key=process.env.PROJECTOS_INTERNAL_KEY,url=process.env.SUPABASE_PROJECT_URL;if(!key||!url)throw new DomainError('Data service is not configured.',503);const response=await fetch(url+'/functions/v1/projectos-gateway',{method:'POST',headers:{'Content-Type':'application/json','x-projectos-key':key},body:JSON.stringify(body),cache:'no-store'});const payload:any=await response.json().catch(()=>({error:'Data service unavailable.'}));if(!response.ok)throw new DomainError(response.status===409?'Data changed. Refresh and retry.':payload.error||'Data service unavailable.',response.status);return payload}
export async function readRoot(){const who=await subject(),root=await gateway({action:'read',subject:who,seed:seed()});return {subject:who,root,state:root.state}}
