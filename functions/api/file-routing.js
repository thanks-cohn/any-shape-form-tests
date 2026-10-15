// Small, dependency-free file routing convention for R2.
// R2 has object prefixes rather than folders: put() creates the path on first upload.
const allowedId=/^[a-zA-Z0-9_-]{1,64}$/;
const buckets={
 images:new Set(['png','jpg','jpeg','gif','webp','svg','avif','bmp']),
 videos:new Set(['mp4','webm','mov','mkv','avi']),
 audio:new Set(['mp3','wav','ogg','flac','m4a']),
 documents:new Set(['pdf','doc','docx','odt','rtf','xls','xlsx','ppt','pptx']),
 text:new Set(['txt','md','csv','json','xml','html','css','js','ts']),
 archives:new Set(['zip','tar','gz','7z','rar'])
};
export function classifyUpload(name,type=''){
  const ext=String(name).split('.').pop().toLowerCase();
  const mime=String(type).toLowerCase();
  // Prefer recognizable MIME for broad classes, then known extensions.
  if(mime.startsWith('image/'))return 'Images';
  if(mime.startsWith('video/'))return 'Videos';
  if(mime.startsWith('audio/'))return 'Audio';
  if(mime.startsWith('text/'))return 'Text';
  if(mime==='application/pdf'||mime.includes('word')||mime.includes('officedocument')||mime.includes('opendocument'))return 'Documents';
  for(const [key,values] of Object.entries(buckets))if(values.has(ext))return key[0].toUpperCase()+key.slice(1);
  return 'Other';
}
export function fileObjectKey({formId,submissionId,name,type}){
  if(!allowedId.test(formId)||!/^[a-f0-9-]{36}$/i.test(submissionId))throw Error('invalid upload id');
  const category=classifyUpload(name,type);
  const safeName=String(name).replace(/[^a-zA-Z0-9._-]/g,'_').slice(-90)||'attachment';
  return 'Submitted-Files/'+category+'/'+formId+'/'+submissionId+'/'+crypto.randomUUID()+'-'+safeName;
}
