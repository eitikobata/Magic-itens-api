// script.js
//
// Reimplementa a mesma lógica do import-seed.js (Node), só que rodando
// no navegador: lê o arquivo seed.sql selecionado localmente, faz o parse
// e envia cada item via POST para a API do n8n.

const API_URL = 'https://tools-n8n.cpcp6o.easypanel.host/webhook/items';
const DELAY_BETWEEN_REQUESTS_MS = 300;

const fileInput = document.getElementById('seed-file');
const previewBtn = document.getElementById('preview-btn');
const deliverBtn = document.getElementById('deliver-btn');
const parseStatus = document.getElementById('parse-status');
const log = document.getElementById('log');
const summary = document.getElementById('summary');

let parsedItems = [];

fileInput.addEventListener('change', handleFileSelect);
previewBtn.addEventListener('click', () => runDelivery({ dryRun: true }));
deliverBtn.addEventListener('click', () => runDelivery({ dryRun: false }));

async function handleFileSelect() {
  const file = fileInput.files[0];
  if (!file) return;

  const text = await file.text();
  parsedItems = parseSeedSql(text);

  if (parsedItems.length === 0) {
    parseStatus.textContent = 'Could not find any items in this file. Check the INSERT format.';
    previewBtn.disabled = true;
    deliverBtn.disabled = true;
    return;
  }

  parseStatus.textContent = `Found ${parsedItems.length} items in ${file.name}.`;
  previewBtn.disabled = false;
  deliverBtn.disabled = false;
  clearLog();
}

// Espera o mesmo formato usado pelo import-seed.js:
// INSERT INTO items (name, price, rarity, side_effect) VALUES ('...', 12.5, '...', '...'), ...;
function parseSeedSql(sql) {
  const tupleRegex =
    /\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*([\d.]+)\s*,\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)/g;

  const items = [];
  let match;
  while ((match = tupleRegex.exec(sql)) !== null) {
    const [, name, price, rarity, side_effect] = match;
    items.push({
      name: unescapeSql(name),
      price: parseFloat(price),
      rarity: unescapeSql(rarity),
      side_effect: unescapeSql(side_effect),
    });
  }
  return items;
}

function unescapeSql(str) {
  return str.replace(/''/g, "'").replace(/\\'/g, "'");
}

async function postItem(item) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} - ${text}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDelivery({ dryRun }) {
  previewBtn.disabled = true;
  deliverBtn.disabled = true;
  clearLog();

  if (dryRun) {
    appendLog('--- PREVIEW MODE: nothing will be sent ---', null);
  }

  let success = 0;
  let failed = 0;

  for (const [index, item] of parsedItems.entries()) {
    const label = `[${index + 1}/${parsedItems.length}] ${item.name}`;

    if (dryRun) {
      appendLog(`${label} -> would send: ${JSON.stringify(item)}`, null);
      success++;
      continue;
    }

    try {
      await postItem(item);
      appendLog(label, 'ok');
      success++;
    } catch (err) {
      appendLog(`${label} -> ${err.message}`, 'fail');
      failed++;
    }

    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  summary.textContent = `${success} delivered, ${failed} failed`;
  previewBtn.disabled = false;
  deliverBtn.disabled = false;
}

function clearLog() {
  log.innerHTML = '';
  summary.textContent = '';
}

function appendLog(text, status) {
  const line = document.createElement('div');
  if (status === 'ok') line.className = 'log-line-ok';
  if (status === 'fail') line.className = 'log-line-fail';
  line.append(document.createTextNode(text));
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}
