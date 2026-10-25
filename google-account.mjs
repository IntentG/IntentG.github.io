// No client secret, service credential, email lookup or client-selected deletion owner.
export const PROJECT='82eb61d2-3a97-405b-9881-d29f31387d7b';
export const ENV='e753ede7-577f-41df-b248-fa293f462770';
export const CLIENT='578003966737-rpmv525s4ilk6vpke6vh02otk3n6ejov.apps.googleusercontent.com';
const AUTH='https://player-auth.services.api.unity.com/v1/';
const CODE='https://cloud-code.services.api.unity.com/v1/projects/'+PROJECT+'/scripts/';
const base={'Content-Type':'application/json',ProjectId:PROJECT,UnityEnvironment:'development'};
export function createClient({transport=fetch,store=localStorage,random=crypto}={}) {
 let access=null,owner=null,freshUntil=0;
 const key='riven-deletion217';
 const hex=n=>Array.from(random.getRandomValues(new Uint8Array(n)),b=>b.toString(16).padStart(2,'0')).join('');
 async function request(url,body,token){
  const r=await transport(url,{method:'POST',headers:{...base,...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw Error('HTTP_'+r.status);
  return r.json();
 }
 async function call(operation,token=access){
  if(!token)throw Error('SIGN_IN_REQUIRED');
  return (await request(CODE+'RivenAccountDeletion182',{params:{request:JSON.stringify(operation)}},token)).output;
 }
 function pending(){const s=store.getItem(key);if(!s)return null;const p=JSON.parse(s);if(p.schema!==1||!/^[A-Za-z0-9]{20,40}$/.test(p.owner)||!/^[a-f0-9]{32}$/.test(p.requestId)||!/^[a-f0-9]{64}$/.test(p.recoverySecret))throw Error('INVALID_RECEIPT');return p;}
 function receipt(p,r){if(r?.schema!==1||r.owner!==p.owner||r.requestId!==p.requestId||r.environmentId!==ENV||!['frozen','auth-deleted','service-data-erased','complete'].includes(r.phase)||r.state!==(r.phase==='complete'?'complete':'pending'))throw Error('RECEIPT_MISMATCH');return r;}
 async function advance(p,first){
  let r=receipt(p,first),helper=null;
  try {
   // The account token can be revoked midway. An unprivileged temporary identity
   // transports the restricted recovery capability; it never selects another owner.
   if(r.state!=='complete')helper=await request(AUTH+'authentication/anonymous',{});
   for(let n=0;r.state!=='complete'&&n<3;n++)r=receipt(p,await call({operation:'advance',owner:p.owner,requestId:p.requestId,recoverySecret:p.recoverySecret},helper.idToken));
   if(r.state==='complete'){store.removeItem(key);access=null;owner=null;}
   return r.state;
  } finally {
   if(helper?.idToken)await transport(AUTH+'users/'+encodeURIComponent(helper.userId),{method:'DELETE',headers:{...base,Authorization:'Bearer '+helper.idToken},credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)}).catch(()=>{});
  }
 }
 return {
  pending:()=>!!pending(),
  signOut(){access=null;owner=null;freshUntil=0;},
  async signIn(credential){
   access=null;owner=null;freshUntil=0;
   const r=await request(AUTH+'authentication/external-token/google',{idProvider:'google',token:credential,signInOnly:true});
   if(!r.idToken||r.userId!==r.user?.id||!r.user.externalIds?.some(x=>x.providerId==='google'&&x.externalId))throw Error('IDENTITY_MISMATCH');
   access=r.idToken;owner=r.userId;freshUntil=Date.now()+300000;
   const existing=pending();if(existing&&existing.owner!==owner){this.signOut();throw Error('OTHER_PENDING_ACCOUNT');}
   const result=await call({operation:'inspect'});
   if(result?.schema!==1||result.eligible!==true){this.signOut();throw Error('SUPPORT_REQUIRED');}
   return true;
  },
  async remove(confirmed){
   if(confirmed!=='DELETE_RIVENSHIFTERS_GAME_ACCOUNT'||!access||Date.now()>=freshUntil)throw Error('FRESH_CONFIRMATION_REQUIRED');
   let p=pending();if(p&&p.owner!==owner)throw Error('OTHER_PENDING_ACCOUNT');
   if(!p){p={schema:1,owner,requestId:hex(16),recoverySecret:hex(32)};store.setItem(key,JSON.stringify(p));if(store.getItem(key)!==JSON.stringify(p))throw Error('STORAGE_REQUIRED');}
   const r=await call({operation:'begin',requestId:p.requestId,recoverySecret:p.recoverySecret,confirmation:confirmed});
   return advance(p,r);
  },
  async resume(){
   const p=pending();if(!p)throw Error('NO_PENDING_REQUEST');
   const helper=await request(AUTH+'authentication/anonymous',{});
   try {return await advance(p,await call({operation:'recover',owner:p.owner,requestId:p.requestId,recoverySecret:p.recoverySecret},helper.idToken));}
   finally {await transport(AUTH+'users/'+encodeURIComponent(helper.userId),{method:'DELETE',headers:{...base,Authorization:'Bearer '+helper.idToken},credentials:'omit',signal:AbortSignal.timeout(15000)}).catch(()=>{});}
  }
 };
}
