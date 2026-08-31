const tags = [
  "Agent开发", "投资", "个人成长", "强化学习", "算法", "后端", "LLM", "项目讲解",
  "健康", "总结与思考", "面试", "动漫", "机器学习", "深度学习", "数学", "英语",
  "AI Infra", "开源贡献", "Linux", "MySQL", "Redis", "计算机网络", "操作系统", "git",
  "AI工具", "后训练", "游戏", "钢琴演奏", "斯诺克比赛解说", "斯诺克游戏集锦",
];

let articles = [];
const filterContainer = document.querySelector("#tag-filter");
const articleList = document.querySelector("#article-list");
const searchInput = document.querySelector("#article-search");
let activeTag = "全部";

function createFilterButton(label, value = label) {
  const button = document.createElement("button");
  button.type = "button";
  if (value === "全部") button.className = "tag-label";
  button.textContent = label;
  button.setAttribute("aria-pressed", value === activeTag);
  button.addEventListener("click", () => {
    activeTag = value;
    renderFilters();
    renderArticles();
  });
  return button;
}

function renderFilters() {
  filterContainer.replaceChildren();
  filterContainer.append(createFilterButton("标签", "全部"));
  [...tags].forEach((tag) => filterContainer.append(createFilterButton(tag)));
}

function renderArticles() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = articles
    .filter((article) => activeTag === "全部" || article.tags.includes(activeTag))
    .filter((article) => `${article.title} ${article.tags.join(" ")}`.toLowerCase().includes(query))
    .sort((a, b) => b.date.localeCompare(a.date));

  articleList.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = query || activeTag !== "全部" ? "没有找到匹配的文章。" : "文章将在这里慢慢生长。";
    articleList.append(empty);
    return;
  }

  const groups = Map.groupBy(visible, (article) => article.date.slice(0, 4));
  groups.forEach((yearArticles, year) => {
    const group = document.createElement("section");
    group.className = "year-group";
    group.innerHTML = `<p class="year-label">${year}</p>`;
    yearArticles.forEach((article) => {
      const row = document.createElement("a");
      row.className = "article-row";
      row.href = `./article.html?slug=${encodeURIComponent(article.slug)}`;
      row.innerHTML = `<time class="article-date" datetime="${article.date}">${article.date.slice(5)}</time><span class="article-title">${article.title}</span><span class="article-tags">${article.tags.map((tag) => `<span class="article-tag">${tag}</span>`).join("")}</span>`;
      group.append(row);
    });
    articleList.append(group);
  });
}

searchInput.addEventListener("input", renderArticles);
renderFilters();
fetch("./articles/index.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Article index failed: ${response.status}`);
    return response.json();
  })
  .then((items) => {
    articles = items;
    renderArticles();
  })
  .catch(() => renderArticles());
