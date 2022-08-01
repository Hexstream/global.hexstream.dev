"use strict";

window.RufflePlayer = window.RufflePlayer || {};
window.RufflePlayer.config = {
    "letterbox": "on"
};

if (document.documentElement.classList.contains("autoplay")) {
    window.RufflePlayer.config.autoplay = "on";
    window.RufflePlayer.config.unmuteOverlay = "hidden";
}
