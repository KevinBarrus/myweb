const filterContainer = document.querySelector("#tag-filter");
const articleList = document.querySelector("#article-list");
const searchInput = document.querySelector("#article-search");
let articles = [];

function openTag(tag) {
  window.location.href = `./tag.html?tag=${encodeURIComponent(tag)}`;
}

function createTagButton(tag, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = tag;
  button.addEventListener("click", () => openTag(tag));
  return button;
}

function renderFilters() {
  const label = document.createElement("span");
  label.className = "tag-label";
  label.textContent = "标签";
  filterContainer.append(label);
  siteTags.forEach((tag) => filterContainer.append(createTagButton(tag, "tag-filter-button")));
}

function renderArticles() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = articles
    .filter((article) => `${article.title} ${article.tags.join(" ")}`.toLowerCase().includes(query))
    .sort((a, b) => b.date.localeCompare(a.date));

  articleList.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = query ? "没有找到匹配的文章。" : "文章将在这里慢慢生长。";
    articleList.append(empty);
    return;
  }

  const groups = visible.reduce((result, article) => {
    const year = article.date.slice(0, 4);
    (result[year] ||= []).push(article);
    return result;
  }, {});
  Object.entries(groups).forEach(([year, yearArticles]) => {
    const group = document.createElement("section");
    group.className = "year-group";
    group.innerHTML = `<p class="year-label">${year}</p>`;
    yearArticles.forEach((article) => {
      const row = document.createElement("div");
      row.className = "article-row";
      row.innerHTML = `<time class="article-date" datetime="${article.date}">${article.date.slice(5)}</time><a class="article-title" href="./article.html?slug=${encodeURIComponent(article.slug)}">${article.title}</a>`;
      const articleTags = document.createElement("div");
      articleTags.className = "article-tags";
      article.tags.forEach((tag) => articleTags.append(createTagButton(tag, "article-tag")));
      row.append(articleTags);
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
  .catch(renderArticles);
