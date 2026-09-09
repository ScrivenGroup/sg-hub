export const MATE_INGEST_PATH = "/api/mtg-buylist/mate-ingest";
export const MATE_ALLOWED_ORIGINS = [
  "https://www.mtgmate.com.au",
  "https://mtgmate.com.au",
];

/** Raw JS to paste in the Mate tab's console. Always downloads JSON; POST is bonus if mixed-content allows it. */
export function buildMateHarvestScript(input: {
  hubOrigin: string;
  token: string;
  setCodes: string[];
}): string {
  const payload = JSON.stringify({
    h: input.hubOrigin.replace(/\/$/, ""),
    t: input.token,
    p: MATE_INGEST_PATH,
    s: input.setCodes,
  });
  return `(async()=>{const{h,t,p,s}=${payload};if(!/mtgmate\\.com\\.au$/i.test(location.hostname)){alert("Run this on mtgmate.com.au while logged in.");return}const out={harvestedAt:new Date().toISOString(),sets:{}};let okSets=0;for(const c of s){try{const r=await fetch("/buylist/magic_sets/"+encodeURIComponent(c)+"/data",{credentials:"include",headers:{Accept:"application/json"}});const txt=await r.text();let data;try{data=JSON.parse(txt)}catch{data=txt}out.sets[c]={ok:r.ok,status:r.status,data};if(r.ok)okSets++}catch(e){out.sets[c]={ok:false,error:String(e)}}}const blob=new Blob([JSON.stringify(out)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);const z=new Date(),d=n=>String(n).padStart(2,"0");a.download="mtgmate-buylist-harvest_"+z.getFullYear()+d(z.getMonth()+1)+d(z.getDate())+"_"+d(z.getHours())+d(z.getMinutes())+d(z.getSeconds())+".json";a.click();let posted=false;try{const r=await fetch(h+p,{method:"POST",headers:{"Content-Type":"application/json","X-Harvest-Token":t},body:JSON.stringify(out)});const j=await r.json().catch(()=>({}));posted=Boolean(r.ok&&j.ok)}catch(e){posted=false}alert("MTG Buylist: fetched "+okSets+"/"+s.length+" sets.\\n\\nA dated harvest JSON should have downloaded.\\n\\n"+(posted?"Also posted to the hub — refresh the hub tab.":"Could not POST to "+h+" (normal from HTTPS Mate → HTTP localhost). Upload the downloaded JSON on the hub."))})();`;
}

export function buildMateBookmarklet(input: {
  hubOrigin: string;
  token: string;
  setCodes: string[];
}): string {
  return `javascript:${encodeURIComponent(buildMateHarvestScript(input))}`;
}

export function mateCorsHeaders(origin: string | null): HeadersInit {
  const allowed =
    origin && MATE_ALLOWED_ORIGINS.includes(origin) ? origin : MATE_ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Harvest-Token",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
