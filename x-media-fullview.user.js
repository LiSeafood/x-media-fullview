// ==UserScript==
// @name         X 媒体网格 - 完整显示图片（不裁切）
// @namespace    https://github.com/LiSeafood/x-media-fullview
// @version      7.0
// @description  X/Twitter 个人页媒体网格默认显示完整图片（contain，留黑边），不再被正方形裁切。纯 CSS + URL 门控方案，免疫 React 重渲染与 SPA 路由；@match 全站以支持从任意页面 SPA 进入媒体页。
// @author       LiSeafood
// @match        https://x.com/*
// @match        https://twitter.com/*
// @grant        none
// @run-at       document-start
// @homepageURL  https://github.com/LiSeafood/x-media-fullview
// @supportURL   https://github.com/LiSeafood/x-media-fullview/issues
// @updateURL    https://raw.githubusercontent.com/LiSeafood/x-media-fullview/main/x-media-fullview.user.js
// @downloadURL  https://raw.githubusercontent.com/LiSeafood/x-media-fullview/main/x-media-fullview.user.js
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // 实测（2026-10）媒体网格瓦片结构：
    //   cellInnerDiv(虚拟滚动单元) > li[id^=verticalGridItem] > a[href*="/photo/"]
    //     > div(overflow:hidden 正方形) > [ 背景div(background-size:cover ← 可见裁切层) + img.css-9pa8cd(opacity:0;z-index:-1 ← 隐藏层) ]
    // 因此两层都强制 contain；URL 门控保证只影响 /媒体 页。
    const CSS = `
html[data-xmv-fullview] [data-testid="cellInnerDiv"] div[style*="background-image"] {
      background-size: contain !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
}
html[data-xmv-fullview] [data-testid="cellInnerDiv"] img {
      object-fit: contain !important;
      width: 100% !important;
      height: 100% !important;
      top: 0 !important;
      left: 0 !important;
      transform: none !important;
}
html[data-xmv-fullview] [data-testid="cellInnerDiv"] video {
      object-fit: contain !important;
}
`;

    // 1) 尽早注入样式。document-start 时 head 可能尚不存在，
    //    挂在 documentElement 上同样全局生效且不会被页面代码移除。
    function injectStyle() {
        if (document.getElementById('x-media-fullview-style')) return;
        const style = document.createElement('style');
        style.id = 'x-media-fullview-style';
        style.textContent = CSS;
        (document.head || document.documentElement).appendChild(style);
    }
    if (document.documentElement) {
        injectStyle();
    } else {
        document.addEventListener('readystatechange', injectStyle, { once: true });
    }

    // 2) URL 门控：仅个人页媒体网格（/任意用户/media）启用，其他页面零影响。
    function isMediaGridPage() {
        return /^\/[^/]+\/media/.test(location.pathname);
    }
    function update() {
        const root = document.documentElement;
        if (!root) return;
        if (isMediaGridPage()) {
            root.setAttribute('data-xmv-fullview', '');
        } else {
            root.removeAttribute('data-xmv-fullview');
        }
    }

    // 3) SPA 路由监听：钩子保证即时切换，interval 兜底防漏。
    ['pushState', 'replaceState'].forEach(function (name) {
        const orig = history[name];
        if (typeof orig !== 'function') return;
        history[name] = function () {
            const ret = orig.apply(this, arguments);
            update();
            return ret;
        };
    });
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    setInterval(update, 300);
    update();
})();
