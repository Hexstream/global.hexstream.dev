const window = globalThis.window;
const document = window.document;

function dispatchBeforeHashChangeEvent (event) {
    const cancelled = !window.dispatchEvent(new CustomEvent("beforehashchange", {
        cancelable: event.cancelable,
        detail: {
            event: event,
            oldURL: document.URL,
            newURL: event.target.href
        }
    }));
    if (cancelled)
        event.preventDefault();
}

for (const linkToFragment of document.querySelectorAll("a[href^='#']")) {
    linkToFragment.addEventListener("click", dispatchBeforeHashChangeEvent);
}


const history = window.history;

window.addEventListener("beforehashchange", function (event) {
    function maybeScheduleFixup (link) {
        if (link.matches(".no-skip-history"))
            return;
        const href = link.getAttribute("href");
        const target = href !== "#" && document.querySelector(href);
        if (target && target.matches(".skip-history"))
            window.setTimeout(() => history.replaceState({
                skipHistory: true
            }, ""));
    }
    maybeScheduleFixup(event.detail.event.target);
    if (history.state?.skipHistory) {
        event.preventDefault();
        window.location.replace(event.detail.newURL);
    }
});
