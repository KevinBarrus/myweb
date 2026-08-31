const titleElement = document.querySelector("#article-title");
const publishedElement = document.querySelector("#article-published");
const tagsElement = document.querySelector("#article-tags");
const updatedElement = document.querySelector("#article-updated");
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
    const value = field[2].trim();
    currentList = value ? null : [];
    data[field[1]] = value || currentList;
  });
  return { data, body: source.slice(match[0].length) };
}

function showError(error) {
  console.error("Article loading failed", error);
  titleElement.textContent = "文章加载失败";
  const message = window.location.protocol === "file:"
    ? "请通过本地 HTTP 服务访问：python3 -m http.server 8000"
    : `请确认文章索引和 Markdown 文件已部署（${error?.message || "未知错误"}）。`;
  contentElement.textContent = "";
  const errorElement = document.createElement("p");
  errorElement.className = "article-error";
  errorElement.textContent = message;
  contentElement.append(errorElement);
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
    link.addEventListener("click", (event) => {
      event.preventDefault();
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", window.location.pathname + window.location.search);
    });
    tocElement.append(link);
  });

  const headingList = Array.from(headings);
  const links = Array.from(tocElement.querySelectorAll("a"));
  const updateActiveHeading = () => {
    const current = headingList.reduce((active, heading) => {
      return heading.getBoundingClientRect().top <= 132 ? heading : active;
    }, headingList[0]);
    const activeLink = links.find((link) => link.hash === `#${current.id}`);
    links.forEach((link) => link.removeAttribute("aria-current"));
    activeLink?.setAttribute("aria-current", "true");
  };
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateActiveHeading();
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  updateActiveHeading();

}

function addCodeCopyButtons() {
  contentElement.querySelectorAll("pre").forEach((block) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy";
    button.textContent = "复制";
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(block.querySelector("code")?.textContent ?? "");
        button.textContent = "已复制";
      } catch {
        button.textContent = "复制失败";
      }
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

function renderMath() {
  if (typeof renderMathInElement !== "function") return;
  renderMathInElement(contentElement, {
    throwOnError: false,
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "\\[", right: "\\]", display: true },
      { left: "$", right: "$", display: false },
      { left: "\\(", right: "\\)", display: false },
    ],
  });
}

function fetchResource(path) {
  return fetch(new URL(path, document.baseURI)).then((response) => {
    if (!response.ok) throw new Error(`${path} 返回 HTTP ${response.status}`);
    return response;
  });
}

if (!slug) {
  showError(new Error("缺少文章 slug"));
} else {
  fetchResource("./articles/index.json").then((response) => response.json()).then((items) => {
    const item = items.find((article) => article.slug === slug);
    if (!item) throw new Error(`找不到文章：${slug}`);
    return fetchResource(`./${item.source}`).then((response) => response.text()).then((source) => ({ item, source }));
  }).then(({ item, source }) => {
    const parsed = parseFrontmatter(source);
    const tags = Array.isArray(parsed.data.tags) ? parsed.data.tags : item.tags;
    const title = parsed.data.title || item.title;
    const createdAt = parsed.data.createdAt || item.createdAt || item.date;
    const updatedAt = (typeof parsed.data.updatedAt === "string" ? parsed.data.updatedAt : "") || item.updatedAt || "";
    titleElement.textContent = title;
    document.title = `${title} — Kevin864`;
    publishedElement.dateTime = createdAt;
    publishedElement.textContent = createdAt;
    tags.forEach((tag) => {
      const tagElement = document.createElement("span");
      tagElement.className = "article-meta-tag";
      tagElement.textContent = tag;
      tagsElement.append(tagElement);
    });
    if (!window.marked?.parse) throw new Error("Markdown 解析器加载失败");
    contentElement.innerHTML = window.marked.parse(parsed.body, { gfm: true, breaks: false });
    removeDuplicateTitle(title);
    if (window.Prism) Prism.highlightAllUnder(contentElement);
    renderMath();
    addHeadingIdsAndToc();
    addCodeCopyButtons();
    if (updatedAt && updatedAt !== createdAt) {
      updatedElement.textContent = `最新更新时间：${updatedAt}`;
    } else {
      updatedElement.hidden = true;
    }
  }).catch(showError);
}
