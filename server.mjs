import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.VNBX_DATA_DIR||path.join(root,'data');
const storeFile=path.join(dataDir,'store.json');
const authFile=path.join(dataDir,'admin.json');
const port=Number(process.env.PORT||4173);
const supabaseUrl=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const supabaseKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_KEY||process.env.SUPABASE_PUBLISHABLE_KEY||'');
const sessions=new Map();
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const defaults={settings:{storeName:'VNBX STORE',heroEyebrow:'VNBX STORE · MAYORISTA Y MINORISTA',heroTitle:'Elegí lo que te gusta. Pedilo fácil.',heroText:'Productos seleccionados, ofertas reales y atención directa por WhatsApp.',footerText:'Productos para todos los días, atención directa y compra simple.',deliveryText:'Retiro por Aberastain E 849 · Envíos a todo el país',whatsapp:'',instagram:'',facebook:'',benefits:[['📦','Envíos a todo el país','Coordinamos tu entrega'],['✦','Ofertas reales','Precios claros y actualizados'],['⌁','Atención directa','Te respondemos por WhatsApp']]},categories:[{id:'perfumeria',name:'Perfumería',icon:'✦',order:1},{id:'moda',name:'Ropa y gorras',icon:'◇',order:2},{id:'accesorios',name:'Joyas y accesorios',icon:'◈',order:3},{id:'tecnologia',name:'Tecnología',icon:'▣',order:4}],products:[],orders:[]};
async function readJson(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'))}catch{return fallback}}
async function writeJson(file,value){await fs.mkdir(dataDir,{recursive:true});await fs.writeFile(file,JSON.stringify(value,null,2),'utf8')}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>12_000_000)reject(new Error('Payload too large'))});req.on('end',()=>{try{resolve(JSON.parse(raw||'{}'))}catch(e){reject(e)}});req.on('error',reject)})}
function json(res,status,value,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(value))}
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i).trim(),decodeURIComponent(x.slice(i+1))]}))}
function hash(password,salt=crypto.randomBytes(16).toString('hex')){return {salt,hash:crypto.scryptSync(password,salt,64).toString('hex')}}
function valid(password,record){if(!record?.salt||!record?.hash)return false;return crypto.timingSafeEqual(Buffer.from(hash(password,record.salt).hash,'hex'),Buffer.from(record.hash,'hex'))}
function token(req){return String(req.headers.authorization||'').startsWith('Bearer ')?String(req.headers.authorization).slice(7):cookies(req).vnbx_session}
function authed(req){const t=token(req);return !!t&&sessions.has(t)}
async function supabaseRead(id){if(!supabaseUrl||!supabaseKey)return null;const r=await fetch(`${supabaseUrl}/rest/v1/store_state?id=eq.${id}&select=data`,{headers:{apikey:supabaseKey,Authorization:`Bearer ${supabaseKey}`}});if(!r.ok)throw new Error(`Supabase GET ${r.status}`);const rows=await r.json();return rows[0]?.data||null}
async function supabaseWrite(id,value){if(!supabaseUrl||!supabaseKey)return false;const r=await fetch(`${supabaseUrl}/rest/v1/store_state?on_conflict=id`,{method:'POST',headers:{apikey:supabaseKey,Authorization:`Bearer ${supabaseKey}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id,data:value,updated_at:new Date().toISOString()})});if(!r.ok)throw new Error(`Supabase PUT ${r.status}`);return true}
async function readStore(){return await supabaseRead('main')||await readJson(storeFile,defaults)}
async function writeStore(value){if(supabaseUrl&&!supabaseKey)throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en Render');await supabaseWrite('main',value);await writeJson(storeFile,value)}
async function readAuth(){return await supabaseRead('admin')||await readJson(authFile,null)}
async function writeAuth(value){if(supabaseUrl&&!supabaseKey)throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en Render');await supabaseWrite('admin',value);await writeJson(authFile,value)}
function publicStore(value){return {...value,orders:[],products:(value.products||[]).map(p=>{const copy={...p};delete copy.cost;delete copy.supplier;return copy})}}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`),p=url.pathname;
  if(p==='/api/auth/status'&&req.method==='GET'){const record=await readAuth();return json(res,200,{configured:!!record})}
  if(p==='/api/auth/setup'&&req.method==='POST'){const input=await body(req),existing=await readAuth();if(existing)return json(res,409,{error:'El acceso ya está configurado'});if(String(input.password||'').length<4)return json(res,400,{error:'La contraseña debe tener al menos 4 caracteres'});await writeAuth(hash(String(input.password)));const t=crypto.randomBytes(32).toString('hex');sessions.set(t,Date.now());return json(res,200,{ok:true},{'Set-Cookie':`vnbx_session=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`})}
  if(p==='/api/auth/login'&&req.method==='POST'){const input=await body(req),password=String(input.password||''),record=await readAuth(),env=String(process.env.ADMIN_PASSWORD||'');if(!password||(!valid(password,record)&&password!==env))return json(res,401,{error:'Contraseña incorrecta'});if(!record&&env)await writeAuth(hash(password));const t=crypto.randomBytes(32).toString('hex');sessions.set(t,Date.now());return json(res,200,{ok:true},{'Set-Cookie':`vnbx_session=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`})}
  if(p==='/api/auth/logout'&&req.method==='POST'){sessions.delete(token(req));return json(res,200,{ok:true},{'Set-Cookie':'vnbx_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'})}
  if(p==='/api/store'&&req.method==='GET'){const value=await readStore();return json(res,200,authed(req)?value:publicStore(value))}
  if(p==='/api/store'&&req.method==='PUT'){if(!authed(req))return json(res,401,{error:'No autorizado'});const value=await body(req);await writeStore({...defaults,...value});return json(res,200,{ok:true})}
  const requested=p==='/'?'/tienda.html':p, file=path.resolve(root,'.'+requested);if(!file.startsWith(root)||file===root)return res.writeHead(403).end('Forbidden');const content=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});res.end(content);
}catch(error){console.error(error);json(res,500,{error:'Error interno del servidor'})}});
server.listen(port,'0.0.0.0',()=>console.log(`VNBX STORE server listening on ${port}`));
