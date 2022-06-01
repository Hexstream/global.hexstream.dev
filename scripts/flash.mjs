export {
    requestFullscreen
}

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

const goFullscreen = document.querySelector("#go-fullscreen");

if (goFullscreen) {
    goFullscreen.disabled = false;
    goFullscreen.addEventListener("click", function () {
        requestFullscreen(document.querySelector(".flash-embed"));
    });
}

const copyButton = document.querySelector(".flash-file-url button");

if (copyButton) {
    copyButton.addEventListener("click", function () {
        navigator.clipboard.writeText(document.querySelector(".flash-file-url code").textContent);
    });
}

window.RufflePlayer = window.RufflePlayer || {};
window.RufflePlayer.config = {
    "letterbox": "on"
};

if (document.documentElement.classList.contains("autoplay")) {
    window.RufflePlayer.config.autoplay = "on";
    window.RufflePlayer.config.unmuteOverlay = "hidden";
}
