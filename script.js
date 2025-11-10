const canvas = document.getElementById('canvas');
const svg = document.getElementById('connections');
const areaSelect = document.getElementById('area');
const addCardBtn = document.getElementById('addCard');
const saveBtn = document.getElementById('saveLayout');
const resetBtn = document.getElementById('reset');
const toggleFocusBtn = document.getElementById('toggleFocus');

// Minimap
const mini = document.getElementById('minimap');
const miniSvg = document.getElementById('mini-svg');
const miniViewport = document.getElementById('mini-viewport');

// State
let scale = 1, originX = 0, originY = 0, isPanning = false, startX, startY;
let nextId = 1;
let connections = []; // {fromId, toId, relation, lineEl, labelEl, cls}
let focusMode = false;
let focusedId = null;

// Canvas size (match CSS)
const CANVAS_W = 6000, CANVAS_H = 4000;
// Minimap scale
const MINI_W = 220, MINI_H = 160;
const miniScaleX = MINI_W / CANVAS_W;
const miniScaleY = MINI_H / CANVAS_H;

// ---------- Pan & Zoom ----------
document.body.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  scale *= factor;
  updateTransform();
  updateMiniViewport();
});
document.body.addEventListener('mousedown', e => {
  if (e.target === canvas) {
    isPanning = true;
    startX = e.clientX - originX;
    startY = e.clientY - originY;
  }
});
document.body.addEventListener('mouseup', () => isPanning = false);
document.body.addEventListener('mousemove', e => {
  if (!isPanning) return;
  originX = e.clientX - startX;
  originY = e.clientY - startY;
  updateTransform();
  updateMiniViewport();
});

function updateTransform() {
  const t = `translate(${originX}px, ${originY}px) scale(${scale})`;
  canvas.style.transform = t;
  svg.style.transform = t;
}

// ---------- Minimap ----------
function drawMini() {
  // clear
  miniSvg.innerHTML = "";
  // draw cards as rectangles
  document.querySelectorAll('.card').forEach(card => {
    const x = card.offsetLeft * miniScaleX;
    const y = card.offsetTop * miniScaleY;
    const w = card.offsetWidth * miniScaleX;
    const h = card.offsetHeight * miniScaleY;
    const rect = document.createElementNS("http://www.w3.org/2000/svg","rect");
    rect.setAttribute("x", x); rect.setAttribute("y", y);
    rect.setAttribute("width", w); rect.setAttribute("height", h);
    rect.setAttribute("fill", "rgba(50,100,200,0.35)");
    rect.setAttribute("stroke", "rgba(20,40,120,0.6)");
    rect.setAttribute("stroke-width", "1");
    miniSvg.appendChild(rect);
  });
  // draw lines (simplified)
  connections.forEach(edge => {
    const parent = getCardById(edge.fromId), child = getCardById(edge.toId);
    if (!parent || !child) return;
    const px = (parent.offsetLeft + parent.offsetWidth/2) * miniScaleX;
    const py = (parent.offsetTop + parent.offsetHeight/2) * miniScaleY;
    const cx = (child.offsetLeft + child.offsetWidth/2) * miniScaleX;
    const cy = (child.offsetTop + child.offsetHeight/2) * miniScaleY;
    const line = document.createElementNS("http://www.w3.org/2000/svg","line");
    line.setAttribute("x1", px); line.setAttribute("y1", py);
    line.setAttribute("x2", cx); line.setAttribute("y2", cy);
    line.setAttribute("stroke", "rgba(60,60,150,0.5)");
    line.setAttribute("stroke-width", "1");
    miniSvg.appendChild(line);
  });
  updateMiniViewport();
}

function updateMiniViewport() {
  // viewport in canvas coords: what portion of canvas is visible in window?
  const vw = window.innerWidth, vh = window.innerHeight;
  // convert window size back to canvas space: size / scale
  const cw = vw / scale, ch = vh / scale;
  // originX/originY is translation applied to canvas in screen pixels.
  // canvas top-left in screen is at originX,originY; we want the inverse transform to get top-left in canvas coords.
  const canvasVisibleX = -originX / scale;
  const canvasVisibleY = -originY / scale;
  miniViewport.style.width  = (cw * miniScaleX) + "px";
  miniViewport.style.height = (ch * miniScaleY) + "px";
  miniViewport.style.transform = `translate(${canvasVisibleX * miniScaleX + mini.offsetLeft}px, ${canvasVisibleY * miniScaleY + mini.offsetTop}px)`;
}

// click on minimap to jump
mini.addEventListener('click', e => {
  const rect = mini.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  // center the viewport around clicked point
  const targetCanvasX = (mx / miniScaleX) - (window.innerWidth / (2*scale));
  const targetCanvasY = (my / miniScaleY) - (window.innerHeight / (2*scale));
  originX = -targetCanvasX * scale;
  originY = -targetCanvasY * scale;
  updateTransform();
  updateMiniViewport();
});

// ---------- Init ----------
window.addEventListener('DOMContentLoaded', () => {
  // Load from JSON if exists
  fetch('data/projects.json').then(r => r.json()).then(data => {
    const items = data.cards || data; // backward compatibility
    items.forEach(c => {
      const card = addCard(c.text, c.x, c.y, c.area, c.link, c.progress || 0, c.cover);
      card.dataset.id = c.id || (nextId++).toString();
      nextId = Math.max(nextId, parseInt(card.dataset.id,10)+1);
    });
    const edges = data.connections || [];
    edges.forEach(edge => {
      const p = getCardById(edge.fromId);
      const ch = getCardById(edge.toId);
      if (p && ch) createConnection(p, ch, edge.relation, false);
    });
    drawMini();
    updateMiniViewport();
  }).catch(() => {
    console.log('Sem projects.json — iniciando vazio.');
    drawMini();
    updateMiniViewport();
  });
});

// ---------- UI Buttons ----------
addCardBtn.onclick = () => {
  const card = addCard("Novo projeto", 200, 200, areaSelect.value, "", 0, "assets/default-cover.jpg");
  card.dataset.id = (nextId++).toString();
  drawMini();
};
saveBtn.onclick = async () => {
  const cards = [...document.querySelectorAll('.card')].map(card => ({
    id: card.dataset.id,
    text: card.querySelector('textarea').value,
    link: card.querySelector('.link-input').value,
    progress: parseInt(card.querySelector('.progress-input')?.value || 0),
    area: card.dataset.area,
    cover: card.querySelector('img')?.getAttribute('src') || "",
    x: card.offsetLeft, y: card.offsetTop
  }));
  const edges = connections.map(c => ({
    fromId: c.fromId, toId: c.toId, relation: c.relation
  }));
  localStorage.setItem('canvasLayoutV6_1', JSON.stringify({ cards, connections: edges }));
  try {
    await saveToGitHub({ cards, connections: edges });
    alert("Salvo localmente e sincronizado com GitHub!");
  } catch (e) {
    console.warn("Sync GitHub falhou (verifique token).", e);
    alert("Salvo localmente. (Sync GitHub não configurado)");
  }
};
resetBtn.onclick = () => {
  if (confirm("Limpar tudo?")) {
    localStorage.clear();
    canvas.innerHTML = "";
    svg.innerHTML = "";
    connections = [];
    drawMini();
    updateMiniViewport();
  }
};
toggleFocusBtn.onclick = () => {
  focusMode = !focusMode;
  toggleFocusBtn.textContent = `🎯 Modo Foco: ${focusMode ? "ON" : "OFF"}`;
  if (!focusMode) clearFocus();
};

// ---------- Cards ----------
function addCard(text, x, y, area, link, progress, cover) {
  const card = document.createElement('div');
  card.className = `card ${area}`;
  card.dataset.area = area;
  card.style.left = x + 'px';
  card.style.top = y + 'px';

  const isReading = area === "area-leitura";
  card.innerHTML = `
    ${isReading ? `<img src="${cover || "assets/default-cover.jpg"}" alt="Capa">` : ""}
    <div class="card-header">
      <strong>${isReading ? "📚 Leitura" : "📌 Projeto"}</strong>
      <div class="card-controls">
        <button class="connect-btn" title="Criar conexões">🌐</button>
        <button class="delete-btn" title="Excluir">🗑️</button>
      </div>
    </div>
    <select class="area-select">
      <option value="area-pesquisa" ${area==="area-pesquisa"?"selected":""}>🔬 Pesquisa</option>
      <option value="area-evento" ${area==="area-evento"?"selected":""}>🎤 Evento</option>
      <option value="area-app" ${area==="area-app"?"selected":""}>💻 App</option>
      <option value="area-mentoria" ${area==="area-mentoria"?"selected":""}>🧠 Mentoria</option>
      <option value="area-pessoal" ${area==="area-pessoal"?"selected":""}>🌿 Pessoal</option>
      <option value="area-leitura" ${area==="area-leitura"?"selected":""}>📚 Leitura</option>
    </select>
    <textarea>${text}</textarea>
    <input class="link-input" value="${link || ""}" placeholder="Link (GitHub, Docs, etc.)">
    ${isReading ? `
      <div class="progress-bar"><div class="progress-fill" style="width:${progress||0}%"></div></div>
      <div style="margin-top:4px;font-size:13px;">Progresso:
      <input class="progress-input" type="number" min="0" max="100" value="${progress||0}">%</div>` : ``}
  `;

  canvas.appendChild(card);
  card.dataset.id = card.dataset.id || (nextId++).toString();
  makeDraggable(card);
  attachCardEvents(card);
  return card;
}

function attachCardEvents(card) {
  const del = card.querySelector('.delete-btn');
  const con = card.querySelector('.connect-btn');
  const areaSel = card.querySelector('.area-select');

  del.onclick = () => { removeCard(card); drawMini(); };
  con.onclick = () => { startConnectionFlow(card); };
  areaSel.onchange = (e) => { changeArea(card, e.target.value); drawMini(); };

  card.addEventListener('click', (e) => {
    if (!focusMode) return;
    e.stopPropagation();
    focusedId = card.dataset.id;
    applyFocus();
  });
}

function changeArea(card, newArea) {
  const oldIsReading = card.dataset.area === "area-leitura";
  card.className = `card ${newArea}`;
  card.dataset.area = newArea;
  const nowIsReading = newArea === "area-leitura";

  if (nowIsReading && !oldIsReading) {
    const img = document.createElement('img');
    img.src = "assets/default-cover.jpg";
    img.alt = "Capa";
    card.insertBefore(img, card.firstChild);

    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    bar.innerHTML = `<div class="progress-fill" style="width:0%"></div>`;
    const wrap = document.createElement('div');
    wrap.style.cssText = "margin-top:4px;font-size:13px;";
    wrap.innerHTML = `Progresso: <input class="progress-input" type="number" min="0" max="100" value="0">%`;
    card.appendChild(bar);
    card.appendChild(wrap);

    const progressInput = wrap.querySelector('.progress-input');
    const progressFill = bar.querySelector('.progress-fill');
    progressInput.addEventListener('input', () => {
      let v = Math.max(0, Math.min(100, parseInt(progressInput.value||0)));
      progressFill.style.width = v + "%";
    });
  } else if (!nowIsReading && oldIsReading) {
    const img = card.querySelector('img'); if (img) img.remove();
    card.querySelectorAll('.progress-bar').forEach(e => e.remove());
    card.querySelectorAll('.progress-input').forEach(e => e.parentElement.remove());
  }
}

function removeCard(card) {
  connections = connections.filter(c => {
    if (c.fromId === card.dataset.id || c.toId === card.dataset.id) {
      if (c.lineEl?.parentNode) c.lineEl.parentNode.removeChild(c.lineEl);
      if (c.labelEl?.parentNode) c.labelEl.parentNode.removeChild(c.labelEl);
      return false;
    }
    return true;
  });
  if (card.parentNode) card.parentNode.removeChild(card);
  if (focusMode) applyFocus();
}

// ---------- Connection Flow ----------
function startConnectionFlow(parent) {
  const relation = prompt("Nome da relação (ex.: 'inspira', 'depende de', 'continuação de'):", "inspira");
  const child = addCard("Novo filho", parent.offsetLeft + 320, parent.offsetTop + (Math.random()*120-60),
    parent.dataset.area, "", 0, parent.querySelector('img')?.getAttribute('src'));
  createConnection(parent, child, relation || "conexão", true);
  drawMini();
}

function relationClass(rel) {
  rel = (rel||"").toLowerCase();
  if (rel.includes("inspira")) return "rel-inspira";
  if (rel.includes("depende")) return "rel-depende";
  if (rel.includes("continua") || rel.includes("continuação")) return "rel-continua";
  return "rel-default";
}

function createConnection(parentCard, childCard, relation, withPulse=true) {
  const fromId = parentCard.dataset.id;
  const toId = childCard.dataset.id;

  const line = document.createElementNS("http://www.w3.org/2000/svg","line");
  line.classList.add('connection-line', relationClass(relation));
  if (withPulse) line.classList.add('pulse');
  svg.appendChild(line);

  const label = document.createElementNS("http://www.w3.org/2000/svg","text");
  label.classList.add('connection-label');
  label.textContent = relation || "conexão";
  svg.appendChild(label);

  const edge = { fromId, toId, relation, lineEl: line, labelEl: label, cls: relationClass(relation) };
  connections.push(edge);
  updateEdgePosition(edge);
}

function updateEdgePosition(edge) {
  const parent = getCardById(edge.fromId);
  const child = getCardById(edge.toId);
  if (!parent || !child) return;
  const px = parent.offsetLeft + parent.offsetWidth/2;
  const py = parent.offsetTop + parent.offsetHeight/2;
  const cx = child.offsetLeft + child.offsetWidth/2;
  const cy = child.offsetTop + child.offsetHeight/2;

  edge.lineEl.setAttribute('x1', px);
  edge.lineEl.setAttribute('y1', py);
  edge.lineEl.setAttribute('x2', cx);
  edge.lineEl.setAttribute('y2', cy);

  const mx = (px + cx) / 2;
  const my = (py + cy) / 2 - 6;
  edge.labelEl.setAttribute('x', mx);
  edge.labelEl.setAttribute('y', my);
}

function updateAllEdges() {
  connections.forEach(edge => updateEdgePosition(edge));
}

// ---------- Drag ----------
function makeDraggable(el) {
  let offsetX, offsetY;
  el.addEventListener('mousedown', e => {
    if (["TEXTAREA","INPUT","BUTTON","SELECT","IMG"].includes(e.target.tagName)) return;
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
    function move(ev) {
      el.style.left = (ev.clientX - offsetX) + 'px';
      el.style.top  = (ev.clientY - offsetY) + 'px';
      updateAllEdges();
      drawMini();
      if (focusMode) applyFocus();
    }
    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}

// ---------- Focus Mode ----------
function clearFocus() {
  focusedId = null;
  [...document.querySelectorAll('.card')].forEach(c => c.classList.remove('dimmed','highlight'));
  [...svg.querySelectorAll('.connection-line, .connection-label')].forEach(l => l.classList.remove('dimmed','highlight'));
}

function applyFocus() {
  if (!focusMode || !focusedId) { clearFocus(); return; }
  const neighborIds = new Set([focusedId]);
  connections.forEach(e => {
    if (e.fromId === focusedId) neighborIds.add(e.toId);
    if (e.toId === focusedId) neighborIds.add(e.fromId);
  });

  [...document.querySelectorAll('.card')].forEach(c => {
    if (neighborIds.has(c.dataset.id)) { c.classList.add('highlight'); c.classList.remove('dimmed'); }
    else { c.classList.add('dimmed'); c.classList.remove('highlight'); }
  });

  [...svg.querySelectorAll('.connection-line, .connection-label')].forEach(el => {
    const edge = connections.find(e => e.lineEl === el || e.labelEl === el);
    if (!edge) return;
    if (edge.fromId === focusedId || edge.toId === focusedId) {
      el.classList.add('highlight'); el.classList.remove('dimmed');
    } else {
      el.classList.add('dimmed'); el.classList.remove('highlight');
    }
  });
}

// Click vazio do canvas sai do foco
document.addEventListener('click', e => {
  if (!focusMode) return;
  if (e.target === document.body || e.target === canvas) clearFocus();
});

// ---------- Helpers ----------
function getCardById(id){ return [...document.querySelectorAll('.card')].find(c => c.dataset.id === id); }
