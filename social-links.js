const socialLinks = [
  { name: "GitHub", icon: "github", url: "https://github.com/KevinBarrus" },
  { name: "X", icon: "x", url: "https://x.com/htt_keyboarder" },
  { name: "知乎", icon: "zhihu", url: "https://www.zhihu.com/people/tian-kai-wen-24" },
  { name: "哔哩哔哩", icon: "bilibili", url: "" },
  { name: "抖音", icon: "tiktok", url: "" },
  { name: "微信公众号", icon: "wechat", url: "" },
  { name: "YouTube", icon: "youtube", url: "" },
  { name: "小红书", icon: "xiaohongshu", url: "" },
  // 留空的平台不会展示；填入 url 后会自动出现在所有页面的右上角。
  { name: "CSDN", icon: "csdn", url: "" },
];

document.querySelectorAll(".socials").forEach((container) => {
  socialLinks.filter((link) => link.url).forEach((link) => {
    const anchor = document.createElement("a");
    anchor.className = "social-icon";
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.setAttribute("aria-label", link.name);

    const image = document.createElement("img");
    image.src = `https://cdn.simpleicons.org/${link.icon}`;
    image.alt = "";
    anchor.append(image);
    container.append(anchor);
  });
});
