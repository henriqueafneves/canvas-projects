// github.js
// Para sincronizar com o GitHub, edite TOKEN, USER e REPO.
// Deixe TOKEN vazio para desativar a sincronização.

const GITHUB_USER = "henriqueafneves";
const REPO = "canvas-projects";
const FILE_PATH = "data/projects.json";
const TOKEN = ""; // <— COLOQUE SEU TOKEN AQUI (Fine-grained, Contents: Read/Write)

async function saveToGitHub(payload){
  if(!TOKEN){ throw new Error("TOKEN não configurado"); }
  const url = `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE_PATH}`;
  // primeiro, obter sha atual (se existir)
  const res = await fetch(url, { headers:{ Authorization:`Bearer ${TOKEN}` } });
  const j = await res.json();
  const sha = j && j.sha ? j.sha : undefined;

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));

  const put = await fetch(url, {
    method:"PUT",
    headers:{ Authorization:`Bearer ${TOKEN}`, "Content-Type":"application/json" },
    body: JSON.stringify({
      message: "Atualizar painel de projetos (canvas)",
      content,
      sha
    })
  });
  if(!put.ok){ throw new Error("Falha ao salvar no GitHub"); }
  return true;
}
