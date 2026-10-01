// ==UserScript==
// @name         X 媒体网格 - 完整显示图片（不裁切）
// @namespace    https://github.com/LiSeafood/x-media-fullview
// @version      7.1
// @description  X/Twitter 个人页媒体网格显示完整图片（不裁切，按原始比例）；无视频作者的媒体页自动跳转照片筛选。纯 CSS + URL 门控方案，免疫 React 重渲染与 SPA 路由；@match 全站以支持从任意页面 SPA 进入媒体页。
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

    // 3) SPA 路由监听：钩子保证即时切换，interval 兜底防漏。
    const listeners = [];
    function onUpdate(fn) { listeners.push(fn); }
    ['pushState', 'replaceState'].forEach(function (name) {
        const orig = history[name];
        if (typeof orig !== 'function') return;
        history[name] = function () {
            const ret = orig.apply(this, arguments);
            listeners.forEach(function (fn) { fn(); });
            return ret;
        };
    });
    window.addEventListener('popstate', () => listeners.forEach(fn => fn()));
    window.addEventListener('hashchange', () => listeners.forEach(fn => fn()));

    // 4) 无视频作者自动跳转照片筛选：
    //    点开"媒体"标签页时 X 默认展示视频；若出现空状态（该作者没有视频），
    //    自动通过 X 自己的筛选菜单（SPA 方式）跳到照片页。
    //    只在 URL 不带 filter 参数时触发——用户显式选了筛选（哪怕选的是视频）绝不干预。
    let lastUrlKey = null;
    let jumpDone = false;
    function maybeAutoJump() {
        if (!/^\/[^/]+\/media$/.test(location.pathname)) return;
        const urlKey = location.pathname + location.search;
        if (urlKey !== lastUrlKey) { lastUrlKey = urlKey; jumpDone = false; }
        if (jumpDone) return;
        if (location.search.indexOf('filter=') !== -1) { jumpDone = true; return; }
        // 空状态出现（X 已确认该作者没有视频）且网格里没有任何瓦片才动手
        if (!document.querySelector('[data-testid="emptyState"]')) return;
        if (document.querySelector('[data-testid="cellInnerDiv"] div[style*="background-image"], [data-testid="cellInnerDiv"] video')) { jumpDone = true; return; }
        jumpToPhotos();
    }
    function jumpToPhotos() {
        jumpDone = true;
        const tabBtn = document.querySelector('[role="tab"][aria-selected="true"][aria-haspopup="menu"]');
        const tabText = tabBtn ? (tabBtn.textContent || '').trim() : '';
        if (!tabBtn) { location.replace(location.pathname + '?filter=photo'); return; }
        tabBtn.click(); // 打开筛选菜单
        setTimeout(function () {
            const items = Array.prototype.slice.call(document.querySelectorAll('[role="menuitem"]'));
            // 菜单恰有两项：当前筛选（与标签同名）与另一项（照片）。取文字不同的那个，兼容多语言。
            const target = items.length === 2
                ? items.find(function (i) { return (i.textContent || '').trim() !== tabText; })
                : null;
            if (!target) { location.replace(location.pathname + '?filter=photo'); return; }
            target.click();
            // 兜底：2 秒后 URL 仍无 filter=photo（SPA 点击没生效）就整页跳转
            setTimeout(function () {
                if (location.search.indexOf('filter=photo') === -1 && /^\/[^/]+\/media$/.test(location.pathname)) {
                    location.replace(location.pathname + '?filter=photo');
                }
            }, 2000);
        }, 350);
    }

    function update() {
        const root = document.documentElement;
        if (!root) return;
        if (isMediaGridPage()) {
            root.setAttribute('data-xmv-fullview', '');
        } else {
            root.removeAttribute('data-xmv-fullview');
        }
        maybeAutoJump();
    }

    setInterval(update, 300);
    update();
})();
