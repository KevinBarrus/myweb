const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

function element() {
  return {
    children: [],
    append(...items) { this.children.push(...items); },
    replaceChildren() { this.children = []; },
    addEventListener(type, listener) { this.listeners ||= {}; this.listeners[type] = listener; },
    setAttribute() {},
  };
}

const filter = element();
const yearNav = element();
const articleList = element();
const search = { value: "", addEventListener() {} };
const yearTarget = { scrollIntoView(options) { this.options = options; } };
const context = vm.createContext({
  document: {
    querySelector(selector) {
      return { "#tag-filter": filter, "#year-nav": yearNav, "#article-list": articleList, "#article-search": search, "#year-2025": yearTarget }[selector] || null;
    },
    createElement: element,
  },
  fetch: () => new Promise(() => {}),
  localizedUrl: () => "#",
  siteLanguage: "zh",
  siteTags: [],
  tagLabel: (tag) => tag,
  t: (key) => key,
  window: { location: {} },
});

vm.runInContext(fs.readFileSync("script.js", "utf8"), context);
vm.runInContext("articles = [{ title: '旧文章', date: '2025-12-31', createdAt: '2025-12-31 23:59', tags: [] }, { title: '新文章', date: '2026-01-01', createdAt: '2026-01-01 00:01', tags: [] }]; renderArticles()", context);

assert.deepStrictEqual(yearNav.children.map((item) => item.textContent), ["2026", "·", "2025"]);
assert.strictEqual(articleList.children[0].id, "year-2026");
assert.strictEqual(articleList.children[1].id, "year-2025");
yearNav.children[2].listeners.click();
assert.strictEqual(yearTarget.options.behavior, "smooth");
assert.strictEqual(yearTarget.options.block, "start");
console.log("year navigation checks passed");
