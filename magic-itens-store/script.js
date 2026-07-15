// script.js
//
// The Questionable Magic Items Shop — storefront.
// Fetches items from the API, renders them as cards, and lets visitors
// build a "cart" by clicking cards (items land on the counter), then
// checkout with a single Buy button that deletes each cart item via the API.

const API_URL = 'https://tools-n8n.cpcp6o.easypanel.host/webhook/items';

// ---------------------------------------------------------------------------
// ORC DIALOGUE — add or edit lines here. Each category is just an array of
// strings; one is picked at random whenever that event happens.
// `onSelect` is keyed by rarity so the orc reacts differently per item tier.
// ---------------------------------------------------------------------------
const DIALOGUE = {
  idle: [
    "We restock every hour. Don't get greedy.",
    "All sales are cursed. No refunds.",
    "Careful with that one... actually, careful with all of them.",
    "Prices are fair. Consequences are not.",
  ],
  onSelect: {
    Common: ["Eh, decent pick.", "A classic. Mostly safe."],
    Rare: ["Ooh, good eye.", "Now we're talking."],
    Legendary: ["Now THAT'S quality... probably.", "A fine choice, adventurer."],
    Cursed: ["...are you sure about that one?", "Bold. Very bold."],
  },
  onDeselect: [
    "Changed your mind, huh?",
    "Back on the shelf it goes.",
  ],
  onBuy: [
    "Sold! No refunds, no complaints.",
    "Pleasure doing business.",
    "May the side effects be mild.",
  ],
  onBuyError: [
    "Hmm. Something's wrong with the till.",
    "...try that again?",
  ],
  onPause: [
    "Ooohh... I likes the music! =/",
  ],
  onResume: [
    "Aaah, that's the stuff.",
    "Much better.",
  ],
};

const IDLE_INTERVAL_MS = 25000;
const CONTEXTUAL_LINE_DURATION_MS = 4500;

const RARITY_META = {
  Common: { symbol: '\u25CF', label: 'Common' },
  Rare: { symbol: '\u2726', label: 'Rare' },
  Legendary: { symbol: '\u2605', label: 'Legendary' },
  Cursed: { symbol: '\u2620', label: 'Cursed' },
};

const RARITY_ORDER = ['Common', 'Rare', 'Legendary', 'Cursed'];

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------
let items = [];
let cart = []; // array of item objects currently on the counter
let sortMode = 'default';

// ---------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------
const shelf = document.getElementById('shelf');
const status = document.getElementById('status');
const speechText = document.getElementById('speech-text');
const counterItems = document.getElementById('counter-items');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');
const buyBtn = document.getElementById('buy-btn');
const sortSelect = document.getElementById('sort-select');
const musicToggle = document.getElementById('music-toggle');
const musicIcon = document.getElementById('music-icon');
const bgm = document.getElementById('bgm');

// ---------------------------------------------------------------------------
// ORC SPEECH BUBBLE
// ---------------------------------------------------------------------------
let speechLockUntil = 0;

function pickLine(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function say(text, { lockMs = CONTEXTUAL_LINE_DURATION_MS } = {}) {
  speechText.textContent = text;
  speechLockUntil = Date.now() + lockMs;
}

function sayIdle() {
  if (Date.now() < speechLockUntil) return;
  say(pickLine(DIALOGUE.idle), { lockMs: IDLE_INTERVAL_MS });
}

setInterval(sayIdle, IDLE_INTERVAL_MS);
say(pickLine(DIALOGUE.idle), { lockMs: IDLE_INTERVAL_MS });

// ---------------------------------------------------------------------------
// FETCH + RENDER
// ---------------------------------------------------------------------------
async function loadItems() {
  status.textContent = 'Opening the shop...';
  shelf.innerHTML = '';

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      status.textContent = 'The shelves are empty. Check back later.';
      return;
    }

    items = data;
    status.textContent = '';
    renderShelf();
  } catch (err) {
    status.textContent = `Could not open the shop right now (${err.message}).`;
  }
}

function sortedItems() {
  const copy = [...items];
  switch (sortMode) {
    case 'price-asc':
      return copy.sort((a, b) => Number(a.price) - Number(b.price));
    case 'price-desc':
      return copy.sort((a, b) => Number(b.price) - Number(a.price));
    case 'name-asc':
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case 'rarity':
      return copy.sort(
        (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
      );
    default:
      return copy;
  }
}

function renderShelf() {
  shelf.innerHTML = '';
  shelf.append(...sortedItems().map(renderCard));
}

function renderCard(item) {
  const meta = RARITY_META[item.rarity] || { symbol: '?', label: item.rarity ?? '' };
  const inCart = cart.some((c) => c.id === item.id);

  const card = document.createElement('article');
  card.className = 'card' + (inCart ? ' selected' : '');
  card.innerHTML = `
    <span class="seal seal--${String(item.rarity).toLowerCase()}" title="${meta.label}">${meta.symbol}</span>
    <h2 class="card-name">${escapeHtml(item.name)}</h2>
    <p class="card-price">$${Number(item.price).toFixed(2)}</p>
    <p class="card-effect">${escapeHtml(item.side_effect)}</p>
  `;
  card.addEventListener('click', () => toggleCart(item));
  return card;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ---------------------------------------------------------------------------
// CART / COUNTER
// ---------------------------------------------------------------------------
function toggleCart(item) {
  const index = cart.findIndex((c) => c.id === item.id);

  if (index === -1) {
    cart.push(item);
    say(pickLine(DIALOGUE.onSelect[item.rarity] || DIALOGUE.idle));
  } else {
    cart.splice(index, 1);
    say(pickLine(DIALOGUE.onDeselect));
  }

  renderShelf();
  renderCounter();
}

function renderCounter() {
  counterItems.innerHTML = '';

  cart.forEach((item) => {
    const tag = document.createElement('div');
    tag.className = 'counter-tag';
    tag.style.setProperty('--tilt', `${(Math.random() * 6 - 3).toFixed(1)}deg`);
    tag.innerHTML = `${escapeHtml(item.name)} <span class="remove-hint">&times;</span>`;
    tag.addEventListener('click', () => toggleCart(item));
    counterItems.appendChild(tag);
  });

  const total = cart.reduce((sum, item) => sum + Number(item.price), 0);
  cartCount.textContent = cart.length;
  cartTotal.textContent = `$${total.toFixed(2)}`;
  buyBtn.disabled = cart.length === 0;
}

// ---------------------------------------------------------------------------
// CHECKOUT (Buy button -> DELETE each cart item)
// ---------------------------------------------------------------------------
async function deleteItem(item) {
  const url = `${API_URL}?id=${encodeURIComponent(item.id)}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} - ${text}`);
  }
}

async function checkout() {
  buyBtn.disabled = true;
  const toBuy = [...cart];
  let success = 0;
  let failed = 0;

  for (const item of toBuy) {
    try {
      await deleteItem(item);
      items = items.filter((i) => i.id !== item.id);
      success++;
    } catch (err) {
      failed++;
    }
  }

  cart = [];
  renderShelf();
  renderCounter();

  if (failed === 0) {
    say(pickLine(DIALOGUE.onBuy));
  } else {
    say(pickLine(DIALOGUE.onBuyError));
  }

  status.textContent =
    failed === 0
      ? `Purchased ${success} item(s).`
      : `Purchased ${success} item(s), ${failed} failed.`;
}

// ---------------------------------------------------------------------------
// MUSIC
// ---------------------------------------------------------------------------
musicToggle.addEventListener('click', () => {
  if (bgm.paused) {
    bgm.play().catch(() => {});
    musicIcon.innerHTML = '&#10074;&#10074;';
    say(pickLine(DIALOGUE.onResume));
  } else {
    bgm.pause();
    musicIcon.innerHTML = '&#9654;';
    say(pickLine(DIALOGUE.onPause));
  }
});

// ---------------------------------------------------------------------------
// EVENTS + INIT
// ---------------------------------------------------------------------------
sortSelect.addEventListener('change', (e) => {
  sortMode = e.target.value;
  renderShelf();
});

loadItems();
