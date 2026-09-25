const choices=(values:string[])=>values.map(value=>({value,label:value.replaceAll('_',' ')}));
export const setupFields={
 'project.create':[{name:'title',label:'Project name',required:true},{name:'slug',label:'Unique URL slug',required:true},{name:'city',label:'Location',required:true},{name:'currency',label:'Currency',type:'select',required:true,options:choices(['CAD','EUR','USD','GBP'])},{name:'timezone',label:'IANA time zone',required:true,placeholder:'Europe/Bratislava'},{name:'areaUnit',label:'Area unit',type:'select',required:true,options:choices(['m²','sq ft'])}],
 'project.policy':[{name:'holdHours',label:'Hold hours (1–168)',type:'number',required:true},{name:'depositBps',label:'Deposit basis points (200 = 2%)',type:'number',required:true},{name:'milestoneBps',label:'Milestone basis points (1800 = 18%)',type:'number',required:true},{name:'reason',label:'Approval reason',required:true}],
 'deal.create':[{name:'leadId',label:'Lead',type:'lead',required:true},{name:'unitId',label:'Main home',type:'home',required:true},{name:'accessoryIds',label:'Optional accessories (multiple selection)',type:'accessories'},{name:'partyActorIds',label:'Buyers (multiple selection)',type:'buyers',required:true},{name:'sellerSignerId',label:'Seller signer',type:'actor',required:true},{name:'expiresAt',label:'Offer valid until',type:'datetime-local',required:true}],
 'grant.create':[{name:'name',label:'Person name',required:true},{name:'role',label:'Role',type:'select',required:true,options:choices(['admin','manager','sales','agent','buyer','legal','finance','delivery','care','contractor','property_manager'])},{name:'expiresAt',label:'Access expiry (optional)',type:'datetime-local'},{name:'reason',label:'Access purpose',required:true}],
 'grant.restore':[{name:'actorId',label:'Person',type:'actor',required:true},{name:'expiresAt',label:'Access expiry (optional)',type:'datetime-local'},{name:'reason',label:'Access purpose',required:true}],
 'project.billing':[{name:'organizationId',label:'Software billing organization',type:'organization',required:true}],
 'bank.propose':[{name:'title',label:'Account label',required:true},{name:'instructions',label:'Bank instructions',required:true,full:true},{name:'reason',label:'Verification evidence',required:true}],
 'bank.approve':[],
 'change.order':[{name:'reason',label:'Order evidence',required:true}],
 'change.implement':[{name:'reason',label:'Implementation evidence',required:true}],
 'change.verify':[{name:'reason',label:'Verification evidence',required:true}],
 'milestone.create':[{name:'title',label:'Milestone name',required:true},{name:'plannedAt',label:'Planned date',type:'datetime-local',required:true},{name:'description',label:'Description',required:true}],
 'request.review':[{name:'status',label:'Outcome',type:'select',required:true,options:choices(['reviewing','declined'])},{name:'reason',label:'Review reason',required:true}],
 'service.pause':[{name:'reason',label:'Pause reason',required:true},{name:'dueAt',label:'Next review',type:'datetime-local',required:true}],
 'service.resume':[{name:'reason',label:'How the blocker was resolved',required:true}],
};
