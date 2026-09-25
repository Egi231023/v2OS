import {DomainError,parseCents} from './domain';
export function parseCSV(source:string):string[][]{
 if(source.length>1000000)throw new DomainError('CSV must be under 1 MB.');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;source=source.replace(/^\uFEFF/,'');
 for(let i=0;i<source.length;i++){const ch=source[i];if(ch==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++}else if(quoted||cell==='')quoted=!quoted;else throw new DomainError('Invalid CSV quotes.')}else if(ch===','&&!quoted){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&source[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}else cell+=ch}
 if(quoted)throw new DomainError('Unclosed quoted field.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);if(rows.length<2||rows.length>501)throw new DomainError('Include a header and 1–500 data rows.');return rows;
}
export const csvFields=['externalId','code','type','price','floor','bedrooms','area','orientation'] as const;
export function mapInventory(rows:string[][],mapping:Record<string,number>,currency:string){
 const errors:string[]=[],items:Record<string,unknown>[]=[];const seen=new Set<string>();
 for(const [i,cells] of rows.slice(1).entries()){try{const read=(key:string)=>(cells[mapping[key]]||'').trim();const externalId=read('externalId'),code=read('code'),type=read('type');if(!externalId||!code)throw new Error('External ID and code are required.');if(seen.has(externalId))throw new Error('Duplicate external ID.');seen.add(externalId);if(!['home','parking','storage'].includes(type))throw new Error('Type must be home, parking or storage.');const priceCents=parseCents(read('price'));if(priceCents<=0)throw new Error('Price must be positive.');const area=Number(read('area')),floor=Number(read('floor')),bedrooms=Number(read('bedrooms'));if(!Number.isFinite(area)||area<0||type==='home'&&area===0||!Number.isInteger(floor)||floor<0||!Number.isInteger(bedrooms)||bedrooms<0)throw new Error('Invalid area, floor or bedrooms.');items.push({externalId,code,type,priceCents,area,floor,bedrooms,currency,orientation:read('orientation')})}catch(e){errors.push('Row '+(i+2)+': '+(e instanceof Error?e.message:'Invalid data.'))}}
 return {items,errors};
}
