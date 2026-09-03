const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");

["index.html", "article.html", "tag.html"].forEach((htmlPath) => {
  const html = fs.readFileSync(htmlPath, "utf8");
  const references = html.matchAll(/(?:href|src)="\.\/([^"?]+\.(?:css|js))(?:\?v=([^"&]+))?"/g);
  for (const [, assetPath, version] of references) {
    const expected = crypto.createHash("sha256").update(fs.readFileSync(assetPath)).digest("hex").slice(0, 8);
    assert.strictEqual(version, expected, `${htmlPath} 中 ${assetPath} 的版本指纹需要更新`);
  }
});

console.log("static asset version checks passed");
