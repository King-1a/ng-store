// NG Store — Backend (Node.js + Express)
// Requisitos: node >= 16
// Variables de entorno a configurar:
// PAYPAL_CLIENT_ID, PAYPAL_SECRET, DOMAIN (https://tu-dominio), DISCORD_WEBHOOK_URL (opcional), PORT
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs').promises;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const DBFILE = path.join(__dirname, 'store.db');
let db;

// Init DB
(async ()=>{
  db = await open({ filename: DBFILE, driver: sqlite3.Database });
  await db.exec(`CREATE TABLE IF NOT EXISTS downloads (token TEXT PRIMARY KEY, file TEXT, expires INTEGER, orderId TEXT)`);
})();

// Serve static frontend
app.use('/', express.static(path.join(__dirname, 'public')));

// Helper: PayPal basic auth token
async function getPayPalToken(){
  const client = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if(!client || !secret) throw new Error('PayPal credentials not set');
  const res = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method:'POST',
    headers: { 'Authorization': 'Basic ' + Buffer.from(client+':'+secret).toString('base64'), 'Content-Type':'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if(!res.ok) {
    throw new Error('PayPal token error: ' + res.status);
  }
  const j = await res.json();
  return j.access_token;
}

// Create order endpoint
app.post('/create-order', async (req,res)=>{
  try{
    const { productId } = req.body;
    const products = JSON.parse(await fs.readFile(path.join(__dirname,'public','products.json'),'utf8'));
    const p = products.find(x=>x.id===productId);
    if(!p) return res.status(404).json({error:'Producto no encontrado'});
    const token = await getPayPalToken();
    const domain = process.env.DOMAIN || 'http://localhost:3000';
    const body = {
      intent: 'CAPTURE',
      purchase_units: [{ amount:{ currency_code:'USD', value: p.price.toFixed(2) }, description: p.title }],
      application_context: {
        return_url: domain + '/success.html?product=' + encodeURIComponent(productId),
        cancel_url: domain + '/cancel.html'
      }
    };
    const resp = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + token }, body: JSON.stringify(body)
    });
    const j = await resp.json();
    const approve = j.links && j.links.find(l=>l.rel==='approve');
    return res.json({ order: j, approvalUrl: approve ? approve.href : null });
  }catch(e){
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

// Capture order (called from success.html)
app.post('/capture-order', async (req,res)=>{
  try{
    const { orderId, productId } = req.body;
    if(!orderId) return res.status(400).json({ error:'orderId missing' });
    const token = await getPayPalToken();
    // Capture order
    const resp = await fetch('https://api-m.paypal.com/v2/checkout/orders/' + orderId + '/capture', {
      method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + token }
    });
    const j = await resp.json();
    if(resp.status !== 201 && resp.status !== 200) {
      return res.status(400).json({ ok:false, error: j });
    }
    // Verify purchase status
    const status = j.status || (j.purchase_units && j.purchase_units[0].payments && j.purchase_units[0].payments.captures && j.purchase_units[0].payments.captures[0].status);
    if(status !== 'COMPLETED' && status !== 'COMPLETED') {
      return res.status(400).json({ ok:false, error:'Pago no completado' });
    }
    // create temporary download token valid 24 hours
    const tokenStr = crypto.randomBytes(20).toString('hex');
    const expires = Date.now() + (24*60*60*1000);
    const products = JSON.parse(await fs.readFile(path.join(__dirname,'public','products.json'),'utf8'));
    const p = products.find(x=>x.id===productId);
    if(!p) return res.status(404).json({ ok:false, error:'Producto no encontrado' });
    const file = p.file;
    await db.run('INSERT INTO downloads (token, file, expires, orderId) VALUES (?,?,?,?)', [tokenStr, file, expires, orderId]);
    // Send Discord notification if configured
    if(process.env.DISCORD_WEBHOOK_URL){
      try{
        // Extract payer email/name from capture response if available
        let payerInfo = 'Desconocido';
        try{
          const payer = j.payer || {};
          payerInfo = (payer.email_address ? payer.email_address : '') + (payer.name && payer.name.given_name ? (' ' + payer.name.given_name) : '');
        }catch(e) {}
        const content = `✅ **Pago exitoso**\n**Producto:** ${p.title}\n**OrderID:** ${orderId}\n**Payer:** ${payerInfo}\n**Monto:** ${p.price} USD\n**Fecha:** ${new Date().toLocaleString()}`;
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ content })
        });
      }catch(e){ console.warn('Discord webhook failed', e); }
    }
    const domain = process.env.DOMAIN || 'http://localhost:3000';
    const downloadUrl = domain + '/download/' + tokenStr;
    return res.json({ ok:true, downloadUrl });
  }catch(e){
    console.error(e);
    return res.status(500).json({ ok:false, error: e.message });
  }
});

// Serve download if token valid
app.get('/download/:token', async (req,res)=>{
  try{
    const t = req.params.token;
    const row = await db.get('SELECT * FROM downloads WHERE token = ?', [t]);
    if(!row) return res.status(404).send('Link inválido o expirado');
    if(row.expires < Date.now()) return res.status(410).send('Link expirado');
    const filePath = path.join(__dirname, 'downloads', path.basename(row.file));
    return res.download(filePath);
  }catch(e){
    console.error(e);
    res.status(500).send('Error interno');
  }
});

// Ticket endpoint forwards to Discord webhook if set
app.post('/ticket', async (req,res)=>{
  try{
    const { name, email, subject, message } = req.body;
    if(process.env.DISCORD_WEBHOOK_URL){
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ content: `**Ticket**\\n**Nombre:** ${name}\\n**Email:** ${email}\\n**Asunto:** ${subject}\\n**Mensaje:** ${message}` })
      });
    }
    res.json({ ok:true });
  }catch(e){
    console.error(e);
    res.status(500).json({ ok:false });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server running on', PORT));
