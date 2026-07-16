const API_URL = 'https://tools-n8n.cpcp6o.easypanel.host/webhook/items';
const DELAY_BETWEEN_REQUESTS_MS = 300;

// ---------------------------------------------------------------------------
// GOBLIN DIALOGUE — add or edit lines here, same pattern as the shop's orc.
// ---------------------------------------------------------------------------
const DIALOGUE = {
  idle: [
    "Are you gonna load this wagon or what?",
    "I don't have all day, you know.",
    "This cart won't fill itself.",
    "Tick tock. The shop's waiting.",
  ],
  onFileLoaded: [
    "Finally, some cargo!",
    "About time. Let's get moving.",
  ],
  onPreview: [
    "Just looking? Fine, I'll wait. Again.",
  ],
  onDeliverComplete: [
    "Finally!!!",
    "About time! Delivery complete.",
    "Finally! My arms were getting tired just watching.",
  ],
  onDeliverError: [
    "Ugh. Not again.",
    "Something's stuck. Typical.",
  ],
};

const IDLE_INTERVAL_MS = 22000;
const CONTEXTUAL_LINE_DURATION_MS = 4500;

const goblinSpeech = document.getElementById('goblin-speech-text');
let speechLockUntil = 0;

function pickLine(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function say(text, { lockMs = CONTEXTUAL_LINE_DURATION_MS } = {}) {
  if (!goblinSpeech) return;
  goblinSpeech.textContent = text;
  speechLockUntil = Date.now() + lockMs;
}

function sayIdle() {
  if (Date.now() < speechLockUntil) return;
  say(pickLine(DIALOGUE.idle), { lockMs: IDLE_INTERVAL_MS });
}

setInterval(sayIdle, IDLE_INTERVAL_MS);
say(pickLine(DIALOGUE.idle), { lockMs: IDLE_INTERVAL_MS });

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
  say(pickLine(DIALOGUE.onFileLoaded));
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
    say(pickLine(DIALOGUE.onPreview));
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

  if (!dryRun) {
    say(pickLine(failed === 0 ? DIALOGUE.onDeliverComplete : DIALOGUE.onDeliverError));
  }
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
