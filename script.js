const allTags = [
  "健康", "个人成长", "总结与思考", "投资", "面试", "动漫", "后端", "机器学习",
  "深度学习", "强化学习", "Agent", "LLM", "数学", "英语", "AI Infra", "开源贡献",
  "算法", "Linux", "MySQL", "Redis", "计算机网络", "操作系统", "git", "AI工具",
  "后训练", "斯诺克游戏集锦", "项目讲解", "钢琴演奏", "斯诺克比赛解说"
];

const featuredTags = ["Agent开发", "投资", "个人成长", "强化学习", "算法", "后端", "LLM", "项目讲解"];
const featuredContainer = document.querySelector("#featured-tags");
const allTagsContainer = document.querySelector("#all-tags");
const dialog = document.querySelector("#tag-dialog");

function tagLink(tag, extraClass = "") {
  const link = document.createElement("a");
  link.className = `tag-card ${extraClass}`.trim();
  link.href = `./tags/${encodeURIComponent(tag)}.html`;
  link.innerHTML = `<span class="tag-name">${tag}</span><span class="tag-arrow" aria-hidden="true">↗</span>`;
  return link;
}

featuredTags.forEach((tag) => featuredContainer.append(tagLink(tag)));
const more = document.createElement("button");
more.className = "tag-card more-card";
more.type = "button";
more.innerHTML = '<span class="tag-name">查看更多标签</span><span class="tag-arrow" aria-hidden="true">+</span>';
more.addEventListener("click", () => dialog.showModal());
featuredContainer.append(more);

allTags.forEach((tag) => {
  const link = document.createElement("a");
  link.href = `./tags/${encodeURIComponent(tag)}.html`;
  link.textContent = tag;
  allTagsContainer.append(link);
});

document.querySelector("#close-tags").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
