const assert = require("node:assert");
const fs = require("node:fs");
const vm = require("node:vm");

const languageLink = {};
const context = vm.createContext({
  URL,
  URLSearchParams,
  window: { location: { href: "https://example.com/index.html?lang=en", search: "?lang=en" } },
  document: {
    body: { dataset: { page: "home" } },
    documentElement: {},
    querySelector: (selector) => selector === ".language-link" ? languageLink : null,
    querySelectorAll: () => [],
    title: "",
  },
});

vm.runInContext(fs.readFileSync("i18n.js", "utf8"), context);
vm.runInContext(fs.readFileSync("tag-config.js", "utf8"), context);

assert.equal(vm.runInContext("siteLanguage", context), "en");
assert.equal(vm.runInContext('t("articles")', context), "Articles");
assert.equal(vm.runInContext('tagLabel("算法")', context), "Algorithms");
assert.equal(languageLink.textContent, "Chinese");

const articles = JSON.parse(fs.readFileSync("articles/index.json", "utf8"));
articles.flatMap((article) => Object.values(article.translations || {})).forEach((translation) => {
  assert.ok(translation.title);
  assert.ok(translation.source.startsWith("articles/en/"));
  assert.ok(fs.existsSync(translation.source));
});

console.log("i18n checks passed");
