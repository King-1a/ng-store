// server.js
const express = require('express');
const fetch = require('node-fetch'); // npm install node-fetch
const bodyParser = require('body-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// Tu webhook de Discord
const DISCORD_WEBHOOK = "https://discord.com/api/webhooks/1413379395254747267/tTw5jyq0GXzwbwO5r_J8GmxtUyzMhY0-bbu0rmpFxDQTKe1VT5fFyyvNAnCcrzPHxiSR";

app.use(bodyParser.json());
app.use(express.static('public'));

// Ruta para recibir info de compra
app.post('/api/compra', async (req, res) => {
  const { nombre, producto, precio } = req.body;

  if (!nombre || !producto || !precio) return res.status(400).json({ error: 'Datos incompletos' });

  const payload = {
    content: `**Nueva compra en NG Store**\n**Usuario:** ${nombre}\n**Producto:** ${producto}\n**Precio:** $${precio}\n**Fecha:** ${new Date().toLocaleString()}`
  };

  try {
    const resp = await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) throw new Error(`Error Discord: ${resp.statusText}`);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo enviar a Discord' });
  }
});

app.listen(PORT, () => console.log(`Servidor escuchando en http://localhost:${PORT}`));
