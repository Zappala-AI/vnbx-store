import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'digital');
const dataDir = process.env.VNBX_DATA_DIR || path.join(root, 'data');
const storeFile = path.join(dataDir, 'store.json');
const authFile = path.join(dataDir, 'admin.json');
const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseReadKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_KEY || '');
const supabaseWriteKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const port = Number(process.env.PORT || process.env.ZAVIAN_PORT || 8765);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const sessions = new Map();
const defaultStore = {products:[],categories:['Tecnología','Moda','Joyería y accesorios','Perfumería','Otros'],content:{heroTitle:'VNBX_STORE',heroText:'Venta mayorista y minorista para emprendedores. Ofrecemos productos de calidad, seleccionados para acompañar tus proyectos y tu día a día.',aboutText:'',contactText:'Consultanos por disponibilidad, compras mayoristas y opciones para emprendedores.',whatsapp:''}};

async function readJson(file, fallback){try{return JSON.parse(await fsp.readFile(file,'utf8'))}catch{return fallback}}
async function writeJson(file, value){await fsp.mkdir(dataDir,{recursive:true});await fsp.writeFile(file,JSON.stringify(value,null,2),'utf8')}
async function readStore(){
  if(supabaseUrl&&supabaseReadKey){
    const r=await fetch(`${supabaseUrl}/rest/v1/store_state?id=eq.main&select=data`,{headers:{apikey:supabaseReadKey,Authorization:`Bearer ${supabaseReadKey}`}});
    if(!r.ok)throw new Error(`Supabase GET ${r.status}`);
    const rows=await r.json();
    if(rows[0]?.data)return rows[0].data;
  }
  return readJson(storeFile,defaultStore);
}
async function writeStore(value){
  if(supabaseUrl&&supabaseWriteKey){
    const r=await fetch(`${supabaseUrl}/rest/v1/store_state?on_conflict=id`,{method:'POST',headers:{apikey:supabaseWriteKey,Authorization:`Bearer ${supabaseWriteKey}`,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:'main',data:value,updated_at:new Date().toISOString()})});
    if(!r.ok)throw new Error(`Supabase PUT ${r.status}`);
  }else if(supabaseUrl&&!supabaseWriteKey)throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY');
  await writeJson(storeFile,value);
}
function publicStore(value){
  const privateFields=new Set(['cost','supplier','provider','origin','purchasePrice']);
  const publicValue=Object.fromEntries(Object.entries(value).filter(([key])=>!new Set(['management','orders','clients','money','providers']).has(key)));
  return {...publicValue,products:(value.products||[]).map(product=>Object.fromEntries(Object.entries(product).filter(([key])=>!privateFields.has(key))))};
}
function hashPassword(password, salt=crypto.randomBytes(16).toString('hex')){return {salt,hash:crypto.scryptSync(password,salt,64).toString('hex')}}
function validPassword(password, record){return crypto.timingSafeEqual(Buffer.from(hashPassword(password,record.salt).hash,'hex'),Buffer.from(record.hash,'hex'))}
function cookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i).trim(),decodeURIComponent(x.slice(i+1))]}))}
function authenticated(req){const bearer=String(req.headers.authorization||'').startsWith('Bearer ')?String(req.headers.authorization).slice(7):'';const token=bearer||cookies(req).vnbx_session;return token&&sessions.has(token)}
function json(res,status,value,headers={}){const body=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(body)}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>2_000_000)reject(new Error('Payload too large'))});req.on('end',()=>{try{resolve(JSON.parse(raw||'{}'))}catch(e){reject(e)}});req.on('error',reject)})}

function localAddresses(){
  const addresses=[];
  for(const interfaces of Object.values(os.networkInterfaces())) for(const item of interfaces||[]) if(item.family==='IPv4'&&!item.internal) addresses.push(item.address);
  return addresses;
}

const server=http.createServer((req,res)=>{
  try{
    const requestPath=decodeURIComponent(new URL(req.url||'/',`http://${req.headers.host||'localhost'}`).pathname);
    if(requestPath==='/api/auth/status'&&req.method==='GET'){readJson(authFile,null).then(record=>json(res,200,{configured:!!record,environmentConfigured:!!process.env.ADMIN_PASSWORD}));return}
    if(requestPath==='/api/auth/check'&&req.method==='GET'){json(res,200,{authenticated:!!authenticated(req)});return}
    if(requestPath==='/api/auth/setup'&&req.method==='POST'){body(req).then(async input=>{const existing=await readJson(authFile,null);if(existing)return json(res,409,{error:'El acceso ya está configurado'});if(!input.password||String(input.password).length<4)return json(res,400,{error:'La contraseña debe tener al menos 4 caracteres'});await writeJson(authFile,hashPassword(String(input.password)));const token=crypto.randomBytes(32).toString('hex');sessions.set(token,Date.now());json(res,200,{ok:true,token},{'Set-Cookie':`vnbx_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`})}).catch(()=>json(res,400,{error:'Solicitud inválida'}));return}
    if(requestPath==='/api/auth/login'&&req.method==='POST'){body(req).then(async input=>{const record=await readJson(authFile,null),password=String(input.password||''),environmentPassword=String(process.env.ADMIN_PASSWORD||'');const valid=record&&validPassword(password,record),validEnvironment=environmentPassword&&password===environmentPassword;if(!password||(!valid&&!validEnvironment))return json(res,401,{error:'Contraseña incorrecta'});if(validEnvironment&&!valid)await writeJson(authFile,hashPassword(password));const token=crypto.randomBytes(32).toString('hex');sessions.set(token,Date.now());json(res,200,{ok:true,token},{'Set-Cookie':`vnbx_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`})}).catch(()=>json(res,400,{error:'Solicitud inválida'}));return}
    if(requestPath==='/api/auth/logout'&&req.method==='POST'){const token=cookies(req).vnbx_session;sessions.delete(token);json(res,200,{ok:true},{'Set-Cookie':'vnbx_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'});return}
    if(requestPath==='/api/store'&&req.method==='GET'){readStore().then(value=>json(res,200,authenticated(req)?value:publicStore(value))).catch(error=>{console.error('[store] read failed',error);json(res,503,{error:'No se pudo leer la tienda'})});return}
    if(requestPath==='/api/store'&&req.method==='PUT'){if(!authenticated(req)){json(res,401,{error:'No autorizado'});return}body(req).then(async value=>{await writeStore(value);json(res,200,{ok:true})}).catch(error=>{console.error('[store] write failed',error);json(res,503,{error:'No se pudo guardar la tienda'})});return}
    if(requestPath==='/api/orders'&&req.method==='POST'){body(req).then(async input=>{const value=await readStore(),cart=Array.isArray(input.items)?input.items:[];if(!cart.length)return json(res,400,{error:'El carrito está vacío'});const products=value.products||[],items=[];for(const item of cart){const product=products.find(candidate=>candidate.name===item.name);const quantity=Number(item.quantity);if(!product||!Number.isInteger(quantity)||quantity<1)return json(res,400,{error:'Producto o cantidad inválida'});if(product.status==='soldout')return json(res,409,{error:`${product.name} está agotado`});if(product.status==='active'&&Number.isFinite(Number(product.stock))&&Number(product.stock)<quantity)return json(res,409,{error:`No hay stock suficiente de ${product.name}`});items.push({name:product.name,category:product.category||'',quantity,price:product.price===''?'':Number(product.price)||0,image:product.image||''})}const used=new Set((value.orders||[]).map(order=>order.id)),sequence=(value.orders||[]).length+1;let id=`VNBX-${String(sequence).padStart(6,'0')}`;while(used.has(id))id=`VNBX-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;const subtotal=items.reduce((sum,item)=>sum+(Number(item.price)||0)*item.quantity,0),order={id,createdAt:new Date().toISOString(),status:'Pendiente',customer:{name:String(input.customer?.name||''),phone:String(input.customer?.phone||''),zone:String(input.customer?.zone||''),address:String(input.customer?.address||''),reference:String(input.customer?.reference||''),notes:String(input.customer?.notes||'')},delivery:String(input.delivery||'Entrega'),payment:String(input.payment||'Pendiente de confirmar'),shipping:Number(input.shipping)||0,discount:Number(input.discount)||0,items,subtotal,total:subtotal-(Number(input.discount)||0)+(Number(input.shipping)||0)};if(!order.customer.name||!order.customer.phone||!order.customer.zone)return json(res,400,{error:'Faltan datos del cliente'});for(const item of items){const product=products.find(candidate=>candidate.name===item.name);if(product.status==='active'&&Number.isFinite(Number(product.stock))){product.stock=Math.max(0,Number(product.stock)-item.quantity);if(product.stock===0)product.status='soldout'}}value.orders=[...(value.orders||[]),order];await writeStore(value);json(res,201,{ok:true,orderId:id,total:order.total})}).catch(error=>{console.error('[orders] create failed',error);json(res,503,{error:'No se pudo guardar el pedido'})});return}
    if(requestPath==='/gestion.html'&&!authenticated(req)){res.writeHead(302,{Location:'/admin.html?next=%2Fgestion.html'});res.end();return}
    const relative=requestPath==='/'?'tienda.html':requestPath.replace(/^\/+/,''), file=path.resolve(publicDir,relative);
    if(!file.startsWith(path.resolve(publicDir)+path.sep)){res.writeHead(403);res.end('Forbidden');return}
    fs.stat(file,(error,stats)=>{
      if(error||!stats.isFile()){res.writeHead(404);res.end('Not found');return}
      res.writeHead(200,{'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});
      if(path.basename(file)==='admin.html'){
        fs.readFile(file,'utf8',(readError,html)=>{if(readError){res.end();return}res.end(html.replaceAll('showApp();await syncFromServer()','showApp();await syncFromServer();const next=new URLSearchParams(location.search).get(\'next\');if(next)location.href=next'))});
      }else if(path.basename(file)==='tienda.html'){
        fs.readFile(file,'utf8',(readError,html)=>{
          if(readError){res.end();return}
          const fixedHtml=html.replace('<div class="brand">','<div id="brand" class="brand">').replace('rgba(255,255,255,.72)','rgba(255,255,255,.24)').replace('.hero{padding:65px 16px 50px;background:#fff;','.hero{padding:65px 16px 50px;background:rgba(255,255,255,.42);').replace('<footer class="footer">','<footer class="footer">VNBX_STORE · <a href="/admin.html" style="color:inherit">⚙️ Administración</a> · <a href="/gestion.html" style="color:inherit">Gestión del emprendimiento</a> · ').replace("const u=wa(x.n,msg);if(u)location.href=u","const u=wa(x.n,msg);if(u){const payload={items:cart.map(p=>({name:p.name,quantity:p.qty})),customer:{name:v.customerName,phone:v.customerPhone,zone:v.zone,notes:v.notes},delivery:v.delivery};fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(async r=>{const result=await r.json().catch(()=>({}));if(!r.ok)throw new Error(result.error||'No se pudo guardar el pedido');const finalUrl=wa(x.n,msg.replace(/^Pedido [^\\n]+/,'Pedido '+result.orderId));location.href=finalUrl}).catch(error=>alert(error.message))}");
          res.end(fixedHtml);
        });
      }else fs.createReadStream(file).pipe(res);
    });
  }catch(error){res.writeHead(400);res.end('Bad request')}
});

server.listen(port,'0.0.0.0',()=>{
  console.log(`VNBX_STORE disponible en esta PC: http://localhost:${port}`);
  for(const address of localAddresses()) console.log(`ZAVIAN desde el celular (misma Wi-Fi): http://${address}:${port}`);
  console.log('Tienda pública: /  ·  Panel privado: /admin.html');
});
