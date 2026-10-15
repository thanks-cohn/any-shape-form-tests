import {fileObjectKey} from './file-routing.js';
// Reference implementation: Cloudflare Pages Functions with optional R2, D1 and webhook.
// Each destination reports its own outcome; HTTP 200 means all enabled effects succeeded.
export async function onRequestPost({ request, env }) {
  let input;
  let attachments=[];
  try {
    if ((request.headers.get("content-type")||"").includes("multipart/form-data")) {
      if (Number(request.headers.get("content-length")||0)>10_000_000) return json({error:"payload_too_large"},413);
      const fd=await request.formData();
      input=JSON.parse(String(fd.get("submission")||"null"));
      attachments=fd.getAll("files").filter(v=>typeof v!=="string" && v.name && v.size);
      if (attachments.length>10 || attachments.some(f=>f.size>5_000_000) || attachments.reduce((n,f)=>n+f.size,0)>10_000_000) return json({error:"attachments_too_large"},413);
    } else {
    if (Number(request.headers.get("content-length") || 0) > 65536) return json({error:"payload_too_large"},413);
    const raw = await request.text();
    if (raw.length > 65536) return json({error:"payload_too_large"},413);
    input = JSON.parse(raw);
    }
  } catch { return json({error:"invalid_json"},400); }
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(input.formId || "") ||
      !input.answers || typeof input.answers !== "object" || Array.isArray(input.answers))
    return json({error:"invalid_submission"},400);
  if(attachments.length && !env.SUBMISSIONS_R2)return json({error:"attachment_storage_not_configured"},503);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const record = {schemaVersion:1,submissionId:id,formId:input.formId,createdAt,answers:input.answers,files:[]};
  for(const file of attachments){
    const fileKey=fileObjectKey({formId:input.formId,submissionId:id,name:file.name,type:file.type});
    try {
      await env.SUBMISSIONS_R2.put(fileKey,await file.arrayBuffer(),{httpMetadata:{contentType:file.type||"application/octet-stream"}});
      record.files.push({name:file.name,type:file.type||"application/octet-stream",size:file.size,r2Key:fileKey});
    } catch {return json({error:"attachment_upload_failed",submissionId:id,uploaded:record.files.length},503);}
  }
  const key = "submissions/" + input.formId + "/submission-" + id + "-" + createdAt.replace(/[:.]/g,"-") + ".json";
  const effects = {};
  const payload = JSON.stringify(record);
  if (env.SUBMISSIONS_R2) {
    try {
      await env.SUBMISSIONS_R2.put(key,payload,{httpMetadata:{contentType:"application/json"}});
      // Small immutable ID index permits an R2-only record URL lookup.
      await env.SUBMISSIONS_R2.put("lookup/"+id+".json",JSON.stringify({key}),{httpMetadata:{contentType:"application/json"}});
      effects.r2 = {status:"accepted",key};
    } catch { effects.r2 = {status:"failed"}; }
  }
  if (env.SUBMISSIONS_DB) {
    try {
      await env.SUBMISSIONS_DB.prepare("INSERT INTO submissions (id, form_id, created_at, payload_json) VALUES (?, ?, ?, ?)")
        .bind(id,input.formId,createdAt,payload).run();
      effects.d1 = {status:"accepted"};
    } catch { effects.d1 = {status:"failed"}; }
  }
  if (env.WEBHOOK_URL) {
    try {
      const url = new URL(env.WEBHOOK_URL);
      if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost","127.0.0.1"].includes(url.hostname))) throw Error("invalid webhook target");
      const response = await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:payload,redirect:"error"});
      effects.webhook = {status:response.ok?"accepted":"failed",httpStatus:response.status};
    } catch { effects.webhook = {status:"failed"}; }
  }
  if (!Object.keys(effects).length) return json({error:"no_destinations_configured"},503);
  const ok = Object.values(effects).every(e=>e.status==="accepted");
  return json({submissionId:id,recordUrl:"/api/submissions/"+id,status:ok?"accepted":"partial_failure",effects},ok?200:207);
}
function json(value,status){return new Response(JSON.stringify(value),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});}
