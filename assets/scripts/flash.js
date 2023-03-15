"use strict";

const classList = document.documentElement.classList;

window.RufflePlayer = window.RufflePlayer || {};
window.RufflePlayer.config = {
    "letterbox": classList.contains("noletterbox") ? "off" : "on"
};

if (classList.contains("autoplay")) {
    window.RufflePlayer.config.autoplay = "on";
    window.RufflePlayer.config.unmuteOverlay = "hidden";
}
