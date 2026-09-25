'use client';
import {useEffect,useState} from 'react';
import {money} from '@/lib/projectos/domain';
const cards=[['available','Available homes'],['reservations','Active reservations'],['binding','Binding sales'],['receipts','Confirmed receipts']] as const;
export default function ReportMetrics({projectId,revision}:{projectId:string;revision:number}){
 const [data,setData]=useState<Record<string,any>>({});
 useEffect(()=>{const c=new AbortController();setData({});Promise.all(cards.map(async([kind])=>{const r=await fetch('/api/os/reports?'+new URLSearchParams({kind,project:projectId}),{cache:'no-store',signal:c.signal});if(!r.ok)throw Error('Unavailable');return [kind,await r.json()] as const})).then(x=>setData(Object.fromEntries(x))).catch(()=>{});return()=>c.abort()},[projectId,revision]);
 return <div className="metric-grid">{cards.map(([kind,label])=>{const r=data[kind];const value=!r?'Unavailable':r.unavailableAmounts||r.unavailableDates?'Incomplete data':['available','reservations'].includes(kind)?String(r.count):Object.entries(r.totals).map(([currency,t]:[string,any])=>money(kind==='receipts'?t.receiptsCents:t.amountCents,currency)).join(' / ')||'0';return <a className="metric" key={kind} href={'/reports?'+new URLSearchParams({kind,project:projectId})}><span>{label}</span><strong>{value}</strong><small>{r?'View matching records · '+new Date(r.updatedAt).toLocaleTimeString():'Loading or unavailable'}</small></a>})}</div>
}
