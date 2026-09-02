const titleElement = document.querySelector("#article-title");
const publishedElement = document.querySelector("#article-published");
const tagsElement = document.querySelector("#article-tags");
const updatedElement = document.querySelector("#article-updated");
const contentElement = document.querySelector("#article-content");
const tocElement = document.querySelector("#toc-list");
const tocContainer = document.querySelector("#article-toc");
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
  titleElement.textContent = t("articleLoadFailed");
  const message = window.location.protocol === "file:"
    ? t("serveOverHttp")
    : t("articleDeployError", { error: error?.message || t("unknownError") });
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
  const revealActiveLink = (link) => {
    if (tocContainer.scrollHeight <= tocContainer.clientHeight) return;
    const linkBox = link.getBoundingClientRect();
    const containerBox = tocContainer.getBoundingClientRect();
    const target = tocContainer.scrollTop + linkBox.top - containerBox.top - (tocContainer.clientHeight - linkBox.height) / 2;
    tocContainer.scrollTo({ top: target, behavior: "smooth" });
  };
  let activeLink;
  const updateActiveHeading = () => {
    const current = headingList.reduce((active, heading) => {
      return heading.getBoundingClientRect().top <= 132 ? heading : active;
    }, headingList[0]);
    const nextActiveLink = links.find((link) => link.getAttribute("href") === `#${current.id}`);
    if (nextActiveLink === activeLink) return;
    links.forEach((link) => link.removeAttribute("aria-current"));
    activeLink = nextActiveLink;
    activeLink?.setAttribute("aria-current", "true");
    if (activeLink) revealActiveLink(activeLink);
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
  tocContainer.addEventListener("wheel", (event) => {
    const atTop = tocContainer.scrollTop <= 0;
    const atBottom = tocContainer.scrollTop + tocContainer.clientHeight >= tocContainer.scrollHeight - 1;
    if (!tocContainer.scrollHeight || (event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) event.preventDefault();
  }, { passive: false });
  updateActiveHeading();

}

function addCodeCopyButtons() {
  contentElement.querySelectorAll("pre").forEach((block) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy";
    button.textContent = t("copy");
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(block.querySelector("code")?.textContent ?? "");
        button.textContent = t("copied");
      } catch {
        button.textContent = t("copyFailed");
      }
      window.setTimeout(() => { button.textContent = t("copy"); }, 1200);
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

function resolveArticleImagePaths(sourcePath) {
  const sourceDirectory = sourcePath.slice(0, sourcePath.lastIndexOf("/") + 1);
  contentElement.querySelectorAll("img[src]").forEach((image) => {
    const src = image.getAttribute("src");
    if (!src || /^(?:[a-z][a-z\d+.-]*:|\/\/|\/|#)/i.test(src)) return;
    const resolved = new URL(src, `https://article.local/${sourceDirectory}`);
    image.setAttribute("src", `.${resolved.pathname}${resolved.search}${resolved.hash}`);
  });
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
  return fetch(new URL(path, document.baseURI), { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error(t("httpError", { path, status: response.status }));
    return response;
  });
}

if (!slug) {
  showError(new Error(t("missingSlug")));
} else {
  fetchResource(`./articles/index.json?lang=${siteLanguage}`).then((response) => response.json()).then((items) => {
    const item = items.find((article) => article.slug === slug);
    if (!item) throw new Error(t("articleNotFound", { slug }));
    const translation = item.translations?.en;
    if (siteLanguage === "zh" && !translation?.source) {
      const englishHome = new URL("./index.html", window.location.href);
      englishHome.searchParams.set("lang", "en");
      document.querySelector(".language-link").href = englishHome.href;
    }
    if (siteLanguage === "en" && !translation?.source) {
      window.location.replace(localizedUrl("./index.html"));
      return null;
    }
    const sourcePath = siteLanguage === "en" ? translation.source : item.source;
    return fetchResource(`./${sourcePath}`).then((response) => response.text()).then((source) => ({ item, source, translation }));
  }).then((payload) => {
    if (!payload) return;
    const { item, source, translation } = payload;
    const parsed = parseFrontmatter(source);
    const tags = item.tags || [];
    const title = siteLanguage === "en" ? translation.title : parsed.data.title || item.title;
    const createdAt = parsed.data.createdAt || item.createdAt || item.date;
    const updatedAt = (typeof parsed.data.updatedAt === "string" ? parsed.data.updatedAt : "") || item.updatedAt || "";
    titleElement.textContent = title;
    document.title = `${title} — Kevin864`;
    publishedElement.dateTime = createdAt;
    publishedElement.textContent = createdAt;
    tags.forEach((tag) => {
      const tagElement = document.createElement("button");
      tagElement.type = "button";
      tagElement.className = "article-meta-tag";
      tagElement.textContent = tagLabel(tag);
      tagElement.addEventListener("click", () => {
        window.location.href = localizedUrl("./tag.html", { tag });
      });
      tagsElement.append(tagElement);
    });
    if (!window.marked?.parse) throw new Error(t("markdownUnavailable"));
    contentElement.innerHTML = window.marked.parse(parsed.body, { gfm: true, breaks: false });
    resolveArticleImagePaths(sourcePath);
    removeDuplicateTitle(title);
    if (window.Prism) Prism.highlightAllUnder(contentElement);
    renderMath();
    addHeadingIdsAndToc();
    addCodeCopyButtons();
    if (updatedAt && updatedAt !== createdAt) {
      updatedElement.textContent = t("updatedAt", { date: updatedAt });
    } else {
      updatedElement.hidden = true;
    }
  }).catch(showError);
}
