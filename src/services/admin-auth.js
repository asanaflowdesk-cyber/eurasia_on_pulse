import { state } from '../state/store.js';
export async function invokeAdminFunction(name, payload){
  if(!state.sb) throw new Error('Supabase client is not initialized');
  const {data:sessionData,error:sessionError}=await state.sb.auth.getSession();
  if(sessionError) throw sessionError;
  const token=sessionData?.session?.access_token;
  if(!token) throw new Error('Нет активной сессии. Войди заново.');
  const base=(window.PULSE_CONFIG?.SUPABASE_URL||'').replace(/\/$/,'');
  const res=await fetch(`${base}/functions/v1/${name}`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(payload||{})});
  const text=await res.text(); let body={};
  try{ body=text?JSON.parse(text):{}; }catch(_){ body={message:text}; }
  if(!res.ok) throw new Error(body.error||body.message||`Edge function ${name} failed: ${res.status}`);
  return body;
}
