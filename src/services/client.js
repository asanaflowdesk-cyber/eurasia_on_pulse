import { state } from '../state/store.js';
export function initSupabase(){
  const cfg=window.PULSE_CONFIG||{};
  if(!cfg.SUPABASE_URL||!cfg.SUPABASE_ANON_KEY) throw new Error('Не заполнен public/runtime-config.js: SUPABASE_URL и SUPABASE_ANON_KEY.');
  state.sb = supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  return state.sb;
}
export function client(){ if(!state.sb) throw new Error('Supabase client is not initialized'); return state.sb; }
