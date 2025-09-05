// NG Store — Autor: Angel MTA
const state = { products: [], filtered: [] };

const money = (n) => new Intl.NumberFormat('es-DO',{style:'currency', currency:'USD'}).format(n);

async function loadProducts(){
  try {
    const res = await fetch('/data/products.json'); // Ajusta ruta según tu estructura
    const data = await res.json();
    state.products = data;
    applySort('pop');
    render();
  } catch(err){
    console.error("Error cargando productos:", err);
  }
}

function render(){
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  for(const p of state.filtered){
    const el = document.createElement('article');
    el.className = 'product';
    el.innerHTML = `
      <img src="${p.image}" alt="${p.title}">
      <div class="p-body">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0">${p.title}</h3>
          <span class="tag">${p.category}</span>
        </div>
        <p style="margin:0;color:#cbbafc">${p.short}</p>
        <div class="price">
          <strong>${money(p.price)}</strong>
          <div>
            <button class="btn small" data-view="${p.id}">Ver</button>
            <button class="btn small primary" data-buy="${p.id}">Comprar</button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(el);
  }
}

function applySort(mode){
  const q = document.getElementById('q')?.value?.toLowerCase() || '';
  let arr = [...state.products].filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.short.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q));
  if(mode==='price-asc') arr.sort((a,b)=>a.price-b.price);
  else if(mode==='price-desc') arr.sort((a,b)=>b.price-a.price);
  else if(mode==='new') arr.sort((a,b)=> new Date(b.updated)-new Date(a.updated));
  else arr.sort((a,b)=>b.pop-a.pop);
  state.filtered = arr;
}

function handleActions(e){
  const id = e.target.dataset.buy || e.target.dataset.view;
  if(!id) return;
  const p = state.products.find(x=>x.id===id);
  if(!p) return;

  if(e.target.dataset.buy){
    openBuyModal(p);
  } else {
    openModal(p);
  }
}

// Modal de descripción
function openModal(p){
  const dlg = document.getElementById('productModal');
  document.getElementById('mImg').src = p.image;
  document.getElementById('mTitle').textContent = p.title;
  document.getElementById('mDesc').textContent = p.description;
  document.getElementById('mVersion').textContent = p.version ? 'v' + p.version : '';
  document.getElementById('mUpdated').textContent = p.updated ? new Date(p.updated).toLocaleDateString() : '';
  document.getElementById('mPrice').textContent = money(p.price);

  const buy = document.getElementById('buyBtn');
  buy.onclick = ()=> openBuyModal(p); // Abrir modal de compra en vez de descargar

  dlg.showModal();
}

// Modal de compra de producto
function openBuyModal(p){
  const dlg = document.getElementById('buyModal');
  document.getElementById('bTitle').textContent = p.title;
  document.getElementById('bPrice').textContent = money(p.price);

  const finish = document.getElementById('finishBtn');
  finish.onclick = async () => {
    const nombre = document.getElementById('bName').value.trim();
    const email = document.getElementById('bEmail').value.trim();
    if(!nombre || !email) return alert("Completa todos los datos");

    // Enviar info a Discord
    try {
      await fetch('/api/compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, producto: p.title, precio: p.price, email, fecha: new Date().toLocaleString() })
      });
      console.log("Compra enviada a Discord");
    } catch(err){
      console.error("Error enviando a Discord", err);
    }

    // Abrir PayPal
    const amount = p.price.toFixed(2);
    const who = 'FLAKOMta338';
    const url = `https://www.paypal.me/${who}/${amount}`;
    window.open(url, '_blank');

    dlg.close();
  };

  dlg.showModal();
}

function setupUI(){
  document.getElementById('year').textContent = new Date().getFullYear();

  const sort = document.getElementById('sort');
  sort.addEventListener('change', e=>{ applySort(e.target.value); render(); });

  document.getElementById('q').addEventListener('input', ()=>{ applySort(sort.value); render(); });

  document.addEventListener('click', handleActions);

  const dlgProduct = document.getElementById('productModal');
  dlgProduct.querySelector('.close').addEventListener('click', ()=> dlgProduct.close());

  const dlgBuy = document.getElementById('buyModal');
  dlgBuy.querySelector('.close').addEventListener('click', ()=> dlgBuy.close());

  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if(navToggle){
    navToggle.addEventListener('click', ()=> navLinks.style.display = navLinks.style.display==='flex' ? 'none':'flex');
  }
}

// Inicializar
loadProducts();
setupUI();
