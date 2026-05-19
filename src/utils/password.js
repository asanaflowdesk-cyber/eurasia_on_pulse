export function generatePassword(length=16){
  const lower='abcdefghijkmnopqrstuvwxyz', upper='ABCDEFGHJKLMNPQRSTUVWXYZ', nums='23456789', spec='!@#$%*_-+=';
  const all=lower+upper+nums+spec;
  const bytes=new Uint32Array(length); crypto.getRandomValues(bytes);
  const chars=[lower[bytes[0]%lower.length], upper[bytes[1]%upper.length], nums[bytes[2]%nums.length], spec[bytes[3]%spec.length]];
  for(let i=4;i<length;i++) chars.push(all[bytes[i]%all.length]);
  for(let i=chars.length-1;i>0;i--){ const j=bytes[i]%(i+1); [chars[i],chars[j]]=[chars[j],chars[i]]; }
  return chars.join('');
}
export async function copyText(text){
  try{ await navigator.clipboard.writeText(text); return true; }
  catch(_){ prompt('Скопируй вручную:', text); return false; }
}
