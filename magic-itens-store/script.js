// script.js
//
// Consome o GET /items da API feita no n8n e renderiza cada item
// como um card na vitrine.

const API_URL = 'https://tools-n8n.cpcp6o.easypanel.host/webhook/items';

const RARITY_META = {
  Common: { symbol: '●', label: 'Common' },
  Rare: { symbol: '✦', label: 'Rare' },
  Legendary: { symbol: '★', label: 'Legendary' },
  Cursed: { symbol: '☠', label: 'Cursed' },
};

async function loadItems() {
  const shelf = document.getElementById('shelf');
  const status = document.getElementById('status');

  status.textContent = 'Abrindo a loja...';
  shelf.innerHTML = '';

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const items = await res.json();

    if (!Array.isArray(items) || items.length === 0) {
      status.textContent = 'A prateleira está vazia. Volte mais tarde.';
      return;
    }

    status.textContent = '';
    shelf.append(...items.map(renderCard));
  } catch (err) {
    status.textContent = `Não foi possível abrir a loja agora (${err.message}).`;
  }
}

function renderCard(item) {
  const meta = RARITY_META[item.rarity] || { symbol: '?', label: item.rarity ?? '' };

  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
    <span class="seal seal--${String(item.rarity).toLowerCase()}" title="${meta.label}">${meta.symbol}</span>
    <h2 class="card-name">${escapeHtml(item.name)}</h2>
    <p class="card-price">R$ ${Number(item.price).toFixed(2)}</p>
    <p class="card-effect">${escapeHtml(item.side_effect)}</p>
  `;
  return card;
}

// Evita que texto vindo da API vire HTML/script no navegador (XSS básico)
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

loadItems();
