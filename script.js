const canvas = document.getElementById('canvas');
const areaSelect = document.getElementById('area');
const addCardBtn = document.getElementById('addCard');
const saveBtn = document.getElementById('saveLayout');
const resetBtn = document.getElementById('reset');

let scale = 1, originX = 0, originY = 0, isPanning = false, startX, startY;

document.body.addEventListener('wheel', e => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  scale *= delta;
  canvas.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
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
  canvas.style.transform = `translate(${originX}px, ${originY}px) scale(${scale})`;
});

async function loadData() {
  try {
    const data = await fetch('data/projects.json');
    const cards = await data.json();
    cards.forEach(c => addCard(c.text, c.x, c.y, c.area, c.link, c.progress || 0, c.cover));
  } catch {
    console.log("Sem dados anteriores — iniciando vazio");
  }
}

addCardBtn.onclick = () => addCard("Novo projeto", 200, 200, areaSelect.value, "", 0, "assets/default-cover.jpg");

saveBtn.onclick = async () => {
  const cards = [...document.querySelectorAll('.card')].map(card => ({
    text: card.querySelector('textarea').value,
    link: card.querySelector('.link-input').value,
    progress: parseInt(card.querySelector('.progress-input')?.value || 0),
    area: card.dataset.area,
    cover: card.querySelector('img')?.src || "",
    x: card.offsetLeft,
    y: card.offsetTop
  }));

  localStorage.setItem('canvasLayoutV5', JSON.stringify(cards));
  await saveToGitHub(cards);
  alert("Layout salvo e sincronizado!");
};

resetBtn.onclick = () => {
  if (confirm("Tem certeza que deseja limpar tudo?")) {
    localStorage.clear();
    location.reload();
  }
};

function addCard(text, x, y, area, link, progress, cover) {
  const card = document.createElement('div');
  card.className = `card ${area}`;
  card.dataset.area = area;
  card.style.left = x + 'px';
  card.style.top = y + 'px';

  card.innerHTML = `
    ${area === "area-leitura" ? `<img src="${cover || "assets/default-cover.jpg"}" alt="Capa">` : ""}
    <div class="card-header">
      <strong>${area === "area-leitura" ? "📚 Leitura" : "📌 Projeto"}</strong>
      <select class="area-select">
        <option value="area-pesquisa" ${area==="area-pesquisa"?"selected":""}>🔬</option>
        <option value="area-evento" ${area==="area-evento"?"selected":""}>🎤</option>
        <option value="area-app" ${area==="area-app"?"selected":""}>💻</option>
        <option value="area-mentoria" ${area==="area-mentoria"?"selected":""}>🧠</option>
        <option value="area-pessoal" ${area==="area-pessoal"?"selected":""}>🌿</option>
        <option value="area-leitura" ${area==="area-leitura"?"selected":""}>📚</option>
      </select>
    </div>
    <textarea>${text}</textarea>
    <input class="link-input" value="${link}" placeholder="Link (GitHub, Docs, etc.)">
    ${area === "area-leitura" ?
      `<div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
       <div style="margin-top:4px;font-size:13px;">Progresso:
       <input class="progress-input" type="number" min="0" max="100" value="${progress}">%</div>`
      : ""}
  `;

  makeDraggable(card);
  attachCardEvents(card);
  canvas.appendChild(card);
}

function attachCardEvents(card) {
  const select = card.querySelector('.area-select');
  select.addEventListener('change', e => {
    const newArea = e.target.value;
    card.className = `card ${newArea}`;
    card.dataset.area = newArea;
  });

  const progressInput = card.querySelector('.progress-input');
  const progressFill = card.querySelector('.progress-fill');
  if (progressInput && progressFill) {
    progressInput.addEventListener('input', () => {
      let val = Math.max(0, Math.min(100, progressInput.value));
      progressFill.style.width = val + "%";
    });
  }
}

function makeDraggable(el) {
  let offsetX, offsetY;
  el.onmousedown = e => {
    if (["TEXTAREA","SELECT","INPUT","IMG"].includes(e.target.tagName)) return;
    offsetX = e.clientX - el.offsetLeft;
    offsetY = e.clientY - el.offsetTop;
    document.onmousemove = e => {
      el.style.left = (e.clientX - offsetX) + 'px';
      el.style.top = (e.clientY - offsetY) + 'px';
    };
    document.onmouseup = () => document.onmousemove = null;
  };
}

loadData();
