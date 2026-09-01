const tagTitle = document.querySelector("#tag-title");
const tagArticleList = document.querySelector("#tag-article-list");
const tagFilter = document.querySelector("#tag-page-filter");
const activeTag = new URLSearchParams(window.location.search).get("tag");

function renderTagFilters() {
  const label = document.createElement("span");
  label.className = "tag-label";
  label.textContent = "标签";
  tagFilter.append(label);

  const tags = activeTag && !siteTags.includes(activeTag) ? [activeTag, ...siteTags] : siteTags;
  tags.forEach((tag) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag-filter-button";
    button.textContent = tag;
    if (tag !== activeTag) {
      button.addEventListener("click", () => {
        window.location.href = `./tag.html?tag=${encodeURIComponent(tag)}`;
      });
      tagFilter.append(button);
      return;
    }

    button.classList.add("tag-selected-label");
    button.setAttribute("aria-current", "page");
    tagFilter.append(button);
  });
}

function renderTagArticles(articles) {
  tagArticleList.replaceChildren();
  if (!activeTag) {
    tagTitle.textContent = "未选择标签";
    return;
  }

  tagTitle.textContent = activeTag;
  document.title = `${activeTag} — Kevin864`;
  const visible = articles
    .filter((article) => article.tags.includes(activeTag))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = `“${activeTag}” 下暂时还没有文章。`;
    tagArticleList.append(empty);
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
      const row = document.createElement("a");
      row.className = "article-row tag-article-row";
      row.href = `./article.html?slug=${encodeURIComponent(article.slug)}`;
      row.innerHTML = `<time class="article-date" datetime="${article.date}">${article.date.slice(5)}</time><span class="article-title">${article.title}</span>`;
      group.append(row);
    });
    tagArticleList.append(group);
  });
}

renderTagFilters();
fetch("./articles/index.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Article index failed: ${response.status}`);
    return response.json();
  })
  .then(renderTagArticles)
  .catch(() => renderTagArticles([]));
