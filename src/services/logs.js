import { TABLES } from '../config/tables.js';
import { state } from '../state/store.js';
export async function logEvent(action, entity=null, entityId=null, details={}){
  try{
    if(!state.sb||!state.user) return;
    await state.sb.from(TABLES.logs).insert({user_id:state.user.id,email:state.user.email,action,entity,entity_id:entityId,details,path:location.pathname,user_agent:navigator.userAgent});
  }catch(_){/* log must never break UI */}
}
export async function logError(error, where='unknown'){
  console.error(error);
  await logEvent('error','system',null,{where,message:error?.message||String(error),stack:error?.stack||''});
}
