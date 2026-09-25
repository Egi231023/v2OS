import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const EXPECTED = "3e595c69292efb68f899e04e861575454702c8c8493a21fdfb82ed7e81e01db5";
const url = Deno.env.get("SUPABASE_URL")!;
const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
const key = keys ? JSON.parse(keys).default : Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const admin = createClient(url, key!, { auth: { persistSession: false, autoRefreshToken: false } });
async function digest(value: string): Promise<string> {
 const bytes = new TextEncoder().encode(value);
 const hash = await crypto.subtle.digest("SHA-256", bytes);
 return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
Deno.serve(async req => {
 if(req.method !== "POST") return new Response("Method not allowed",{status:405});
 const secret = req.headers.get("x-projectos-key") || "";
 if(secret.length!==64 || await digest(secret)!==EXPECTED)return new Response("Unauthorized",{status:401});
 const raw = await req.text();
 if(raw.length>8_000_000)return new Response("Payload too large",{status:413});
 let body: Record<string,unknown>;
 try { body=JSON.parse(raw); } catch {return new Response("Invalid JSON",{status:400});}
 if(body?.action==='team'){
  if(typeof body.requester!=='string'||!body.requester.startsWith('site:'))return Response.json({error:'Sign in required.'},{status:403});
  const {data,error}=await admin.rpc('os_team_manage',{p_requester:body.requester,p_action:body.operation,p_data:body.data||{},p_seed:body.seed||null});
  return error?Response.json({error:error.code==='PT403'?'Team access denied.':error.message},{status:error.code==='PT403'?403:400}):Response.json(data,{headers:{'Cache-Control':'no-store'}});
 }
 if(body?.action==="inquiry") {
   const name=String(body.name||"").trim(),email=String(body.email||"").trim().toLowerCase(),company=String(body.company||"").trim(),message=String(body.message||"").trim();
   if(name.length<2||name.length>120||company.length<2||company.length>120||message.length<10||message.length>1500||email.length>200||!/^\S+@\S+\.\S+$/.test(email))return Response.json({error:"Check the form fields."},{status:400});
   const {error}=await admin.rpc("os_demo_inquiry",{p_name:name,p_email:email,p_company:company,p_message:message});
   if(error?.message.includes("Inquiry rate limit"))return Response.json({error:"Please try again later."},{status:429});
   return error?Response.json({error:"Contact form unavailable."},{status:503}):Response.json({received:true});
 }
 if(!body || !["read","lookup","commit","upload","download"].includes(body.action as string) || typeof body.subject!=="string" || !body.subject.startsWith("site:"))return new Response("Invalid request",{status:400});
 if(body.teamId){
  if(typeof body.requester!=='string'||!body.requester.startsWith('site:'))return Response.json({error:'Sign in required.'},{status:403});
  const {data:root,error}=await admin.rpc('os_team_read',{p_team:body.teamId,p_requester:body.requester});
  if(error||!root)return Response.json({error:'Team access unavailable.'},{status:403});
  body.subject=root.subject;
  if(body.action==='read')return Response.json(root,{headers:{'Cache-Control':'no-store'}});
  if(!root.allowedActors.includes(body.actor))return Response.json({error:'Role not assigned to this account.'},{status:403});
  if(body.action==='commit'){
   const {data,error:commitError}=await admin.rpc('os_team_commit',{p_team:body.teamId,p_requester:body.requester,p_expected:body.expected,p_state:body.state,p_actor:body.actor,p_action:body.operation,p_key:body.key,p_hash:body.hash,p_result:body.result,p_reason:body.reason||'',p_entity:body.entity||null});
   return commitError?Response.json({error:commitError.code==='PT403'?'Team access revoked.':'Data changed or validation failed.',code:commitError.code},{status:commitError.code==='PT403'?403:['PT409','23505','40001'].includes(commitError.code)?409:400}):Response.json(data,{headers:{'Cache-Control':'no-store'}});
  }
 }else if((body.subject as string).startsWith('site:team:'))return Response.json({error:'Team authorization required.'},{status:403});
 if(body.action==="upload" || body.action==="download") {
   const path=body.path;
   if(typeof path!=="string" || !/^demo\/[a-f0-9]{64}\/[a-f0-9-]{36}$/.test(path))return new Response("Invalid file path",{status:400});
   if(!path.startsWith(`demo/${await digest(body.subject as string)}/`))return new Response("File unavailable",{status:404});
   const bucket=admin.storage.from("projectos-demo-private");
   if(body.action==="download") {
     const {data,error}=await bucket.download(path);
     if(error || !data)return new Response("File unavailable",{status:404});
     const bytes=new Uint8Array(await data.arrayBuffer());
     let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.slice(i,i+8192));
     return Response.json({base64:btoa(binary),mime:data.type},{headers:{"Cache-Control":"no-store"}});
   }
   if(typeof body.base64!=="string" || body.base64.length>7_000_000 || !["application/pdf","image/jpeg","image/png","image/webp"].includes(body.mime as string))return new Response("Invalid file",{status:400});
   const bytes=Uint8Array.from(atob(body.base64),c=>c.charCodeAt(0));
   if(bytes.length===0||bytes.length>5242880)return new Response("Invalid file size",{status:413});
   const {error}=await bucket.upload(path,bytes,{contentType:body.mime as string,upsert:false});
   if(error)return new Response("Upload unavailable",{status:503});
   return Response.json({path},{headers:{"Cache-Control":"no-store"}});
 }
 const input = body.action==="read"
  ? {p_subject:body.subject,p_seed:body.seed}
  : body.action==="lookup"
  ? {p_subject:body.subject,p_actor:body.actor,p_action:body.operation,p_key:body.key,p_hash:body.hash}
  : {p_subject:body.subject,p_expected:body.expected,p_state:body.state,p_actor:body.actor,p_action:body.operation,p_key:body.key,p_hash:body.hash,p_result:body.result,p_reason:body.reason||"",p_entity:body.entity||null};
 const {data,error}=await admin.rpc(body.action==="read"?"os_demo_read":body.action==="lookup"?"os_demo_lookup":"os_demo_commit",input);
 if(error) {
   const conflict=error.code==="PT409" || error.code==="40001" || error.code==="23505" || /allocation|stale|overallocat/i.test(error.message);
   return Response.json({error:conflict?"Data changed. Reload before repeating this action.":"The action could not be saved.",code:error.code},{status:conflict?409:500,headers:{"Cache-Control":"no-store"}});
 }
 return Response.json(data,{headers:{"Cache-Control":"no-store"}});
});
