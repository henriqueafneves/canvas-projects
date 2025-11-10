const canvas = document.getElementById('canvas');
const svg = document.getElementById('connections');
const areaSelect = document.getElementById('area');
const addCardBtn = document.getElementById('addCard');
const saveBtn = document.getElementById('saveLayout');
const resetBtn = document.getElementById('reset');

let connections = []; // pai→filhos

// PAN e ZOOM
let scale = 1, originX = 0, originY = 0, isPanning = false, startX, startY;
document.body.addEventListener('wheel', e=>{
  e.preventDefault();
  scale *= e.deltaY > 0 ? 0.9 : 1.1;
  updateTransform();
});
document.body.addEventListener('mousedown', e=>{
  if(e.target===canvas){isPanning=true;startX=e.clientX-originX;startY=e.clientY-originY;}
});
document.body.addEventListener('mouseup', ()=>isPanning=false);
document.body.addEventListener('mousemove', e=>{
  if(!isPanning)return;
  originX=e.clientX-startX;originY=e.clientY-startY;updateTransform();
});
function updateTransform(){
  canvas.style.transform=`translate(${originX}px,${originY}px) scale(${scale})`;
  svg.style.transform=`translate(${originX}px,${originY}px) scale(${scale})`;
}

// CRIAÇÃO e EDIÇÃO
addCardBtn.onclick=()=>addCard("Novo projeto",200,200,areaSelect.value,"",0);
saveBtn.onclick=()=>alert("Salvamento local/JSON desativado nesta versão de exemplo.");

resetBtn.onclick=()=>{
  if(confirm("Deseja limpar tudo?")){canvas.innerHTML="";svg.innerHTML="";connections=[];}
};

function addCard(text,x,y,area,link,progress){
  const card=document.createElement('div');
  card.className=`card ${area}`;
  card.dataset.area=area;
  card.style.left=x+'px';
  card.style.top=y+'px';
  card.innerHTML=`
    <div class="card-header">
      <strong>${area==="area-leitura"?"📚 Leitura":"📌 Projeto"}</strong>
      <div class="card-controls">
        <button class="connect-btn">🌐</button>
        <button class="delete-btn">🗑️</button>
      </div>
    </div>
    <textarea>${text}</textarea>
    <input class="link-input" value="${link}" placeholder="Link (GitHub, Docs, etc.)">
  `;
  canvas.appendChild(card);
  makeDraggable(card);
  attachCardEvents(card);
  return card;
}

function attachCardEvents(card){
  card.querySelector('.delete-btn').onclick=()=>{card.remove();removeConnections(card);};
  card.querySelector('.connect-btn').onclick=()=>createConnection(card);
}

function makeDraggable(el){
  let offsetX,offsetY;
  el.onmousedown=e=>{
    if(["TEXTAREA","INPUT","BUTTON"].includes(e.target.tagName))return;
    offsetX=e.clientX-el.offsetLeft;offsetY=e.clientY-el.offsetTop;
    document.onmousemove=e=>{
      el.style.left=(e.clientX-offsetX)+'px';
      el.style.top=(e.clientY-offsetY)+'px';
      updateLines();
    };
    document.onmouseup=()=>document.onmousemove=null;
  };
}

// CONEXÕES
function createConnection(parent){
  const child=addCard("Novo filho",parent.offsetLeft+300,parent.offsetTop+Math.random()*100,parent.dataset.area,"",0);
  connections.push({from:parent,to:child});
  drawLine(parent,child);
}
function drawLine(parent,child){
  const line=document.createElementNS("http://www.w3.org/2000/svg","line");
  svg.appendChild(line);
  updateLinePosition(line,parent,child);
  line.dataset.parent=parent.dataset.id;
  line.dataset.child=child.dataset.id;
}
function updateLines(){
  const lines=[...svg.querySelectorAll("line")];
  lines.forEach(line=>{
    const parent=connections.find(c=>c.line===line)?.from;
    const child=connections.find(c=>c.line===line)?.to;
    if(parent&&child)updateLinePosition(line,parent,child);
  });
}
function updateLinePosition(line,parent,child){
  const px=parent.offsetLeft+parent.offsetWidth/2;
  const py=parent.offsetTop+parent.offsetHeight/2;
  const cx=child.offsetLeft+child.offsetWidth/2;
  const cy=child.offsetTop+child.offsetHeight/2;
  line.setAttribute("x1",px);
  line.setAttribute("y1",py);
  line.setAttribute("x2",cx);
  line.setAttribute("y2",cy);
}
function removeConnections(card){
  connections=connections.filter(c=>{
    if(c.from===card||c.to===card)return false;
    return true;
  });
  svg.innerHTML="";
  connections.forEach(c=>drawLine(c.from,c.to));
}
