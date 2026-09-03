const filterContainer = document.querySelector("#tag-filter");
const yearNav = document.querySelector("#year-nav");
const articleList = document.querySelector("#article-list");
const searchInput = document.querySelector("#article-search");
let articles = [];

function openTag(tag) {
  window.location.href = localizedUrl("./tag.html", { tag });
}

function createTagButton(tag, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = tagLabel(tag);
  button.addEventListener("click", () => openTag(tag));
  return button;
}

function renderFilters() {
  const label = document.createElement("span");
  label.className = "tag-label";
  label.textContent = t("tags");
  filterContainer.append(label);
  siteTags.forEach((tag) => filterContainer.append(createTagButton(tag, "tag-filter-button")));
}

function renderYearNavigation(years) {
  yearNav.replaceChildren();
  years.forEach((year, index) => {
    if (index) {
      const separator = document.createElement("span");
      separator.textContent = "·";
      separator.setAttribute("aria-hidden", "true");
      yearNav.append(separator);
    }
    const link = document.createElement("button");
    link.type = "button";
    link.textContent = year;
    link.addEventListener("click", () => {
      document.querySelector(`#year-${year}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    yearNav.append(link);
  });
  yearNav.hidden = !years.length;
}

function renderArticles() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = articles
    .filter((article) => siteLanguage === "zh" || article.translations?.en?.source)
    .filter((article) => {
      const title = siteLanguage === "en" ? article.translations.en.title : article.title;
      const labels = article.tags.map(tagLabel).join(" ");
      return `${title} ${labels}`.toLowerCase().includes(query);
    })
    .sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));

  articleList.replaceChildren();
  if (!visible.length) {
    renderYearNavigation([]);
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = query ? t("noMatches") : t("noArticles");
    articleList.append(empty);
    return;
  }

  const groups = visible.reduce((result, article) => {
    const year = article.date.slice(0, 4);
    (result[year] ||= []).push(article);
    return result;
  }, {});
  const years = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  renderYearNavigation(years);
  years.forEach((year) => {
    const yearArticles = groups[year];
    const group = document.createElement("section");
    group.className = "year-group";
    group.id = `year-${year}`;
    group.innerHTML = `<p class="year-label">${year}</p>`;
    yearArticles.forEach((article) => {
      const title = siteLanguage === "en" ? article.translations.en.title : article.title;
      const row = document.createElement("div");
      row.className = "article-row";
      row.innerHTML = `<time class="article-date" datetime="${article.date}">${article.date.slice(5)}</time><a class="article-title" href="${localizedUrl("./article.html", { slug: article.slug })}">${title}</a>`;
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
fetch(`./articles/index.json?lang=${siteLanguage}`, { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`Article index failed: ${response.status}`);
    return response.json();
  })
  .then((items) => {
    articles = items;
    renderArticles();
  })
  .catch(renderArticles);
