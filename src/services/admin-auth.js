import { state } from '../state/store.js';

export async function invokeAdminFunction(name, payload){
  if(!state.sb) throw new Error('Supabase client is not initialized');

  const { data: sessionData, error: sessionError } = await state.sb.auth.getSession();
  if(sessionError) throw sessionError;
  if(!sessionData?.session?.access_token) throw new Error('Нет активной сессии. Войди заново.');

  const { data, error } = await state.sb.functions.invoke(name, { body: payload || {} });

  if(error){
    const context = error.context || error;
    let message = error.message || `Edge function ${name} failed`;

    try{
      if(context?.json){
        const body = await context.json();
        message = body?.error || body?.message || message;
      }else if(context?.text){
        const text = await context.text();
        if(text){
          try{
            const body = JSON.parse(text);
            message = body?.error || body?.message || text;
          }catch(_){
            message = text;
          }
        }
      }
    }catch(_){}

    if(String(message).toLowerCase().includes('invalid credentials')){
      message = 'Edge Function вернула Invalid credentials. Обычно причина: в Supabase Function Secrets указан неверный PULSE_SERVICE_ROLE_KEY или функция создана не в том проекте Supabase.';
    }

    throw new Error(message);
  }

  return data;
}
