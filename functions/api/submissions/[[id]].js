// Cloudflare Pages GET: resolve a stable submission ID through D1 or R2.
export async function onRequestGet({params,env}) {
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) return result({error:"invalid_id"},400);
  try {
    if (env.SUBMISSIONS_DB) {
      const row = await env.SUBMISSIONS_DB.prepare("SELECT payload_json FROM submissions WHERE id = ?").bind(id).first();
      if (row) return new Response(row.payload_json,{headers:{"content-type":"application/json","cache-control":"no-store"}});
    }
    if (env.SUBMISSIONS_R2) {
      const index = await env.SUBMISSIONS_R2.get("lookup/"+id+".json");
      if (!index) return result({error:"not_found"},404);
      const {key} = await index.json();
      if (typeof key !== "string" || !key.startsWith("submissions/")) return result({error:"bad_index"},500);
      const object = await env.SUBMISSIONS_R2.get(key);
      if (!object) return result({error:"not_found"},404);
      return new Response(await object.text(),{headers:{"content-type":"application/json","cache-control":"no-store"}});
    }
    return result({error:"no_read_backend"},503);
  } catch { return result({error:"retrieval_failed"},503); }
}
function result(x,s){return new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json"}});}
