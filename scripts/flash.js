"use strict";

HexstreamSoft.modules.register("HexstreamSoft.Fullscreen", function () {
    function requestFullscreen (element) {
        const backend = element.requestFullscreen
            || element.webkitRequestFullscreen
            || element.mozRequestFullScreen
            || element.msRequestFullscreen;
        if (backend)
            backend.call(element);
        else
            throw Error("Sorry, your browser does not appear to support Fullscreen through requestFullscreen() or one of its derivatives.");
    }

    HexstreamSoft.Fullscreen = {};
    HexstreamSoft.Fullscreen.requestFullscreen = requestFullscreen;
});

HexstreamSoft.modules.ensure("HexstreamSoft.Fullscreen");

window.addEventListener("DOMContentLoaded", function() {
    const goFullscreen = document.querySelector("#go-fullscreen");
    if (goFullscreen) {
        goFullscreen.disabled = false;
        goFullscreen.addEventListener("click", function () {
            HexstreamSoft.Fullscreen.requestFullscreen(document.querySelector(".flash-embed"));
        });
    }
});

if (document.documentElement.classList.contains("autoplay")) {
    window.RufflePlayer = window.RufflePlayer || {};
    window.RufflePlayer.config = {
        "autoplay": "on",
        "unmuteOverlay": "hidden"
    };
}
