const GITHUB_USER = "henriqueafneves";
const REPO = "canvas-projects";
const FILE_PATH = "data/projects.json";
const TOKEN = "SEU_TOKEN_AQUI"; // substitua aqui

async function saveToGitHub(cards) {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(cards, null, 2))));
  const url = `https://api.github.com/repos/${GITHUB_USER}/${REPO}/contents/${FILE_PATH}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  const data = await response.json();
  const sha = data.sha;

  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Atualizar painel de projetos",
      content,
      sha
    })
  });
}
