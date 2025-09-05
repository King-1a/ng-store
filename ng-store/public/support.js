// Enviar ticket a Discord a través de un endpoint seguro. Autor: Angel MTA
const form = document.getElementById('ticketForm');
const statusEl = document.getElementById('ticketStatus');
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  statusEl.textContent = 'Enviando...';
  const data = Object.fromEntries(new FormData(form).entries());
  try{
    const res = await fetch('/.netlify/functions/discord', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    if(!res.ok) throw new Error('Error al enviar');
    statusEl.textContent = 'Ticket enviado. Te responderemos por correo o Discord.';
    form.reset();
  }catch(err){
    statusEl.textContent = 'No se pudo enviar el ticket. Reintenta más tarde.';
  }
});
