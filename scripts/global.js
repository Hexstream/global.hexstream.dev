"use strict";

function toRelativeURLString (base, target) {
    if (typeof base === "string")
        base = new URL(base);
    if (typeof target === "string")
        target = new URL(target);
    if (base.origin !== target.origin)
        return target.toString();
    var relative_path = [];
    var query_hash = String.prototype.concat.call(target.search || "", target.hash || "");
    base = base.pathname.split("/");
    target = target.pathname.split("/");
    var shortest_length = Math.min(base.length, target.length)
    for (var first_different = 0; first_different < shortest_length; first_different++)
        if (base[first_different] !== target[first_different])
            break;
    var extra_base_components = base.length - first_different - 1;
    for (var i = 0; i < extra_base_components; i++)
        relative_path.push("..")
    relative_path = relative_path.concat(target.slice(first_different));
    return relative_path.join("/").concat(query_hash);
}

var baseURIURL = new URL(document.baseURI);

function fix_links_callback (mutation_records) {
    Array.prototype.forEach.call(mutation_records, function (record) {
        var added_nodes = record.addedNodes;
        if (added_nodes)
            Array.prototype.forEach.call(added_nodes, function (added_node) {
                if (added_node.tagName === "A")
                {
                    var url = new URL(added_node.getAttribute("href"), document.baseURI);
                    if (url.protocol === "file:" && url.pathname.slice(-1) === "/")
                    {
                        url.pathname = url.pathname + "index.html";
                        added_node.setAttribute("href", toRelativeURLString(baseURIURL, url));
                    }
                }
            });
    });
}

var fix_links_observer;

if (document.location.protocol === "file:")
{
    fix_links_observer = new MutationObserver(fix_links_callback);
    fix_links_observer.observe(document.documentElement, {childList: true, subtree: true});
}
