const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const images = [
  { src: "./assets/WSL2安装/winRoptionalfeatures.png" },
  { src: "../assets/example.png?size=2#preview" },
  { src: "https://example.com/image.png" },
];
const content = {
  append() {},
  querySelectorAll(selector) {
    return selector === "img[src]" ? images.map((image) => ({
      getAttribute: () => image.src,
      setAttribute: (_, value) => { image.src = value; },
    })) : [];
  },
};
const element = { append() {}, replaceChildren() {}, querySelectorAll: () => [] };
const context = vm.createContext({
  URL,
  URLSearchParams,
  console: { error() {} },
  t: (key) => key,
  document: {
    querySelector: (selector) => selector === "#article-content" ? content : element,
    createElement: () => element,
  },
  window: { location: { search: "", protocol: "http:" }, addEventListener() {} },
});

vm.runInContext(fs.readFileSync("article.js", "utf8"), context);
vm.runInContext("resolveArticleImagePaths('articles/WSL2安装.md')", context);

assert.strictEqual(images[0].src, "./articles/assets/WSL2%E5%AE%89%E8%A3%85/winRoptionalfeatures.png");
assert.strictEqual(images[1].src, "./assets/example.png?size=2#preview");
assert.strictEqual(images[2].src, "https://example.com/image.png");
console.log("article media path checks passed");
