// NG Store — Lógica de tienda. Autor: Angel MTA
const state = { products: [], filtered: [] };

const money = (n) => new Intl.NumberFormat('es-DO',{style:'currency', currency:'USD'}).format(n);

async function loadProducts(){
  const res = await fetch('products.json');
  const data = await res.json();
  state.products = data;
  applySort('pop');
  render();
}

function render(){
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  for(const p of state.filtered){
    const el = document.createElement('article');
    el.className = 'product';
    el.innerHTML = \`
      <img src="\${p.image}" alt="\${p.title}">
      <div class="p-body">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0">\${p.title}</h3>
          <span class="tag">\${p.category}</span>
        </div>
        <p style="margin:0;color:#cbbafc">\${p.short}</p>
        <div class="price">
          <strong>\${money(p.price)}</strong>
          <div>
            <button class="btn small" data-view="\${p.id}">Ver</button>
            <button class="btn small primary" data-buy="\${p.id}">Comprar</button>
          </div>
        </div>
      </div>
    \`;
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
    // Construye el link de PayPal.me con monto
    const amount = p.price.toFixed(2);
    const who = 'FLAKOMta338';
    const url = \`https://www.paypal.me/\${who}/\${amount}\`;
    window.open(url, '_blank');
  }else{
    openModal(p);
  }
}

function openModal(p){
  const dlg = document.getElementById('productModal');
  document.getElementById('mImg').src = p.image;
  document.getElementById('mTitle').textContent = p.title;
  document.getElementById('mDesc').textContent = p.description;
  document.getElementById('mVersion').textContent = 'v' + p.version;
  document.getElementById('mUpdated').textContent = new Date(p.updated).toLocaleDateString();
  document.getElementById('mPrice').textContent = money(p.price);
  const buy = document.getElementById('buyBtn');
  buy.onclick = ()=>{
    const amount = p.price.toFixed(2);
    const who = 'FLAKOMta338';
    const url = \`https://www.paypal.me/\${who}/\${amount}\`;
    window.open(url, '_blank');
  };
  dlg.showModal();
}

function setupUI(){
  document.getElementById('year').textContent = new Date().getFullYear();
  const sort = document.getElementById('sort');
  sort.addEventListener('change', e=>{ applySort(e.target.value); render(); });
  document.getElementById('q').addEventListener('input', ()=>{ applySort(sort.value); render(); });
  document.addEventListener('click', handleActions);
  const dlg = document.getElementById('productModal');
  dlg.querySelector('.close').addEventListener('click', ()=> dlg.close());
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if(navToggle){
    navToggle.addEventListener('click', ()=>{
      navLinks.style.display = navLinks.style.display==='flex' ? 'none':'flex';
    });
  }
}

loadProducts().catch(console.error);
setupUI();
