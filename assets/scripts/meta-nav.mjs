const canonicalLinkNode = document.querySelector("link[rel=\"canonical\"]");

if (canonicalLinkNode) {
    document.addEventListener("DOMContentLoaded", function () {
        var metaNav = document.querySelector("#meta-nav > ul");
        if (!metaNav) {
            const topNavMain = document.querySelector("#top-nav > .main");
            if (topNavMain) {
                topNavMain.insertAdjacentHTML("beforeend", "<nav class=\"tabs\" id=\"meta-nav\"><ul></ul></nav>");
                metaNav = topNavMain.querySelector("#meta-nav > ul");
            }
        }
        if (metaNav) {
            metaNav.insertAdjacentHTML("beforeend", "<li><a class=\"canonical\"><span>See on the web</span></a></li>");
            metaNav.querySelector(".canonical").href=canonicalLinkNode.getAttribute("href");
        }
    });
}
