# X Media Full View · X 媒体网格完整显示

Tampermonkey 油猴脚本：让 X（Twitter）个人主页媒体标签页（`https://x.com/<用户名>/media`）的图片缩略图**完整显示**（contain，两侧留黑边），不再被默认的正方形裁切挡住全貌——一眼预览整张图，不用一张张点开。

## 安装

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展；
2. 点击安装：**[安装脚本（点这里）](https://raw.githubusercontent.com/LiSeafood/x-media-fullview/main/x-media-fullview.user.js)** ，Tampermonkey 会自动弹出安装页；
3. 强制刷新一次 X（`Ctrl+F5`）。

> 手动安装：复制 [x-media-fullview.user.js](x-media-fullview.user.js) 全部内容 → Tampermonkey 管理面板 → 「添加新脚本」→ 粘贴并保存。

## 效果与行为

- 网格保持 X 原生的三列正方形排布，每格内图片以 contain 方式完整显示；
- 点击看大图、悬停变暗、滚动无限加载均不受影响；
- 仅在 `/用户名/media` 页面生效（含 `?filter=photo` / 视频筛选），其余页面零改动；
- GIF / 视频缩略图同样完整显示。

## 为什么网上同类脚本"时灵时不灵"？

基于 2026-10 对 X 前端真实 DOM 的实测，发现了两个坑，本脚本针对性解决：

**1. 裁切根本不是 `<img>` 干的。**
媒体网格每个瓦片里叠了两层：上层 `<img>` 是隐形的（`opacity: 0; z-index: -1`），真正可见的是下面带内联 `background-image` 的 div，正方形裁切来自它的 `background-size: cover`。只改 `img` 的 `object-fit` 碰的是看不见的层，白改。

**2. `@match` 写窄导致脚本根本没在运行。**
X 是单页应用（SPA）：如果脚本只 `@match https://x.com/*/media*`，那么只有"标签页第一次加载的网址恰好是媒体页"时脚本才会被注入；从主页或其他页面点进媒体页不会重新加载页面，脚本完全不在场。这就是"有的作者一点就生效、有的怎么都不生效"的真相——和作者无关，和你**从哪里进入**有关。

**本脚本的做法**：`@match` 全站常驻 + URL 门控（检测到 `/用户名/media` 才启用）+ 一段静态 `!important` CSS（背景图层、img、video 三种形态全部压制）。没有 MutationObserver、没有逐元素内联样式——React 重渲染抹不掉，新加载的瓦片自动命中规则。

## 兼容性说明

脚本基于 2026-10 实测的 X 前端 DOM（`data-testid="cellInnerDiv"`、内联 `background-image`、`/photo/` 链接等稳定特征编写，不依赖随版本变化的 `.r-xxxx` 原子类名）。X 改版可能导致失效，欢迎提 [issue](https://github.com/LiSeafood/x-media-fullview/issues)。

## License

[MIT](LICENSE)
