const titleElement = document.querySelector("#article-title");
const metaElement = document.querySelector("#article-meta");
const contentElement = document.querySelector("#article-content");
const tocElement = document.querySelector("#toc-list");
const slug = new URLSearchParams(window.location.search).get("slug");

function parseFrontmatter(source) {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { data: {}, body: source };
  const data = {};
  let currentList;
  match[1].split("\n").forEach((line) => {
    const listItem = line.match(/^\s+-\s+(.+)$/);
    if (listItem && currentList) currentList.push(listItem[1].trim());
    const field = line.match(/^([\w-]+):\s*(.*)$/);
    if (!field) return;
    currentList = field[2] ? null : [];
    data[field[1]] = field[2] || currentList;
  });
  return { data, body: source.slice(match[0].length) };
}

function showError() {
  titleElement.textContent = "文章加载失败";
  contentElement.innerHTML = '<p class="article-error">暂时无法读取这篇文章。请确认文章文件已提交，并通过本地 HTTP 服务或部署后的网址访问。</p>';
}

function addHeadingIdsAndToc() {
  tocElement.replaceChildren();
  const headings = contentElement.querySelectorAll("h2, h3, h4");
  if (!headings.length) {
    document.querySelector(".article-toc").hidden = true;
    return;
  }
  document.querySelector(".article-toc").hidden = false;
  const usedIds = new Set();
  headings.forEach((heading, index) => {
    const baseId = heading.textContent.trim().toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "") || `section-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);
    heading.id = id;
    const link = document.createElement("a");
    link.href = `#${id}`;
    link.textContent = heading.textContent;
    link.className = `toc-level-${heading.tagName.slice(1)}`;
    tocElement.append(link);
  });
}

function addCodeCopyButtons() {
  contentElement.querySelectorAll("pre").forEach((block) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy";
    button.textContent = "复制";
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(block.querySelector("code")?.textContent ?? "");
      button.textContent = "已复制";
      window.setTimeout(() => { button.textContent = "复制"; }, 1200);
    });
    block.append(button);
  });
}

function removeDuplicateTitle(title) {
  const firstHeading = contentElement.querySelector("h1, h2");
  if (!firstHeading) return;
  const normalized = firstHeading.textContent.trim().replace(/^\d{4}[./-]\d{1,2}[./-]\d{1,2}\s*/, "");
  if (normalized === title.trim()) firstHeading.remove();
}

if (!slug) {
  showError();
} else {
  Promise.all([
    fetch("./articles/index.json").then((response) => response.json()),
  ]).then(([items]) => {
    const item = items.find((article) => article.slug === slug);
    if (!item) throw new Error("Article not found");
    return fetch(`./${item.source}`).then((response) => response.text()).then((source) => ({ item, source }));
  }).then(({ item, source }) => {
    const parsed = parseFrontmatter(source);
    const tags = Array.isArray(parsed.data.tags) ? parsed.data.tags : item.tags;
    const title = parsed.data.title || item.title;
    const date = parsed.data.date || item.date;
    titleElement.textContent = title;
    document.title = `${title} — Kevin864`;
    const dateElement = document.createElement("time");
    dateElement.dateTime = date;
    dateElement.textContent = date;
    metaElement.append(dateElement);
    const tagsElement = document.createElement("div");
    tagsElement.className = "article-meta-tags";
    tags.forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.className = "article-meta-tag";
      tagElement.textContent = `#${tag}`;
      tagsElement.append(tagElement);
    });
    metaElement.append(tagsElement);
    contentElement.innerHTML = marked.parse(parsed.body, { gfm: true, breaks: false });
    removeDuplicateTitle(title);
    Prism.highlightAllUnder(contentElement);
    addHeadingIdsAndToc();
    addCodeCopyButtons();
  }).catch(showError);
}
