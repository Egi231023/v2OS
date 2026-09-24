import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import ts from 'typescript';
if(!process.env.PROJECTOS_INTERNAL_KEY||!process.env.SUPABASE_PROJECT_URL)throw new Error('Configure server-only demo environment values.');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'projectos-integration-'));
for(const name of ['domain','engine']){const source=fs.readFileSync(`lib/projectos/${name}.ts`,'utf8').replace("from './domain'","from './domain.mjs'");fs.writeFileSync(path.join(temp,name+'.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText)}
const {seed}=await import(pathToFileURL(path.join(temp,'domain.mjs'))),{run}=await import(pathToFileURL(path.join(temp,'engine.mjs')));
const subject='site:qa-concurrency-'+randomUUID();
async function request(body){const response=await fetch(process.env.SUPABASE_PROJECT_URL+'/functions/v1/projectos-gateway',{method:'POST',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json','x-projectos-key':process.env.PROJECTOS_INTERNAL_KEY},body:JSON.stringify({subject,...body})});return {status:response.status,data:await response.json()}}
const state=seed(),base=state.entities.find(x=>x.id==='deal-emma'),offer=state.entities.find(x=>x.id==='offer-emma');offer.status='approved';
state.entities.push({...structuredClone(base),id:'deal-rival',dealId:'deal-rival',title:'QA rival buyer'});
state.entities.push({...structuredClone(offer),id:'offer-rival',dealId:'deal-rival'});
const initial=await request({action:'read',seed:state});assert.equal(initial.status,200);
console.log('Gateway initialized; testing concurrent commits.');
const actor=state.actors.find(x=>x.id==='sales');
const commands=['deal-emma','deal-rival'].map(id=>({action:'hold.create',id,key:randomUUID(),data:{}}));
const bodies=commands.map(command=>{const output=run(state,actor,command);return {action:'commit',expected:initial.data.revision,state:output.state,actor:actor.id,operation:command.action,key:command.key,hash:createHash('sha256').update(JSON.stringify(command)).digest('hex'),result:{id:output.id},reason:'Automated fictional concurrency test',entity:output.id}});
const attempts=await Promise.all(bodies.map(request));assert.deepEqual(attempts.map(x=>x.status).sort(),[200,409]);
const winner=attempts.findIndex(x=>x.status===200),replay=await request(bodies[winner]);assert.equal(replay.status,200);assert.deepEqual(replay.data,attempts[winner].data);
const changed=await request({...bodies[winner],hash:'different-content'});assert.equal(changed.status,409);
const fresh=await request({action:'read',seed:state});const active=fresh.data.state.entities.filter(x=>x.kind==='allocation'&&!x.data.endedAt&&['deal-emma','deal-rival'].includes(x.dealId));assert.equal(active.length,3);assert.equal(new Set(active.map(x=>x.dealId)).size,1);
console.log(JSON.stringify({result:'PASS',checks:['two concurrent holds: exactly one succeeds','all three accessories/home allocated together','same-key replay stable','changed-key-content rejected'],workspace:subject}));
fs.rmSync(temp,{recursive:true,force:true});
