NG Store — Tienda lista para usar
Autor: Angel MTA

Instrucciones rápidas:

1) Copia esta carpeta al servidor o VPS. (Heroku, Render, OVH, DigitalOcean, etc.)
2) Coloca tus archivos .rar dentro de la carpeta ./downloads
   - Asegúrate que el nombre del archivo coincida con el campo "file" en public/products.json
3) Configura variables de entorno (ver .env.example):
   - PAYPAL_CLIENT_ID y PAYPAL_SECRET (desde tu cuenta PayPal REST apps)
   - DOMAIN (ej: https://tienda.tudominio.com)
   - DISCORD_WEBHOOK_URL (el webhook del canal privado donde recibirás notificaciones)
4) Instala dependencias y ejecuta:
   npm install
   npm start
5) Prueba una compra en modo sandbox (crea credenciales de sandbox en PayPal).
6) Al aprobar y completar el pago, el usuario será redirigido a /success.html y recibirá un link temporal de descarga (24h).

Seguridad:
- No publiques la carpeta /downloads sin protección; el servidor entrega archivos solo si el token es válido.
- Revisa los logs y prueba en sandbox antes de pasar a producción.

Si quieres, puedo generar el ZIP ahora con todo listo para descargar y desplegar.
