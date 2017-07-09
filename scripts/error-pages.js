"use strict";

function enhance_breadcrumbs_callback (mutation_records, observer) {
    Array.prototype.forEach.call(mutation_records, function (record) {
        var added_nodes = record.addedNodes;
        if (added_nodes)
            Array.prototype.forEach.call(added_nodes, function (added_node) {
                if (added_node.tagName === "NAV" && added_node.classList.contains("breadcrumbs"))
                {
                    observer.disconnect();
                    //"file:" protocol special case to ease local debugging.
                    var baseURIURL = HexstreamSoft.misc.baseURIURL;
                    var path = baseURIURL.protocol === "file:" ? baseURIURL.hash.slice(1) : baseURIURL.pathname;
                    var most_specific_breadcrumbs = added_node;
                    var longest_match = -1;
                    Array.prototype.forEach.call(document.querySelectorAll("template[data-path]"),
                                                 function (template) {
                                                     var data_path = template.dataset.path;
                                                     if (data_path.length > longest_match
                                                         && String.prototype.indexOf.call(path, data_path) === 0)
                                                     {

                                                         most_specific_breadcrumbs = template.content;
                                                         longest_match = data_path.length;
                                                     }
                                                 });
                    if (most_specific_breadcrumbs !== added_node)
                        added_node.parentElement.replaceChild(most_specific_breadcrumbs.cloneNode(true),
                                                              added_node);
                }
            });
    });
}

var enhance_breadcrumbs_observer;

enhance_breadcrumbs_observer = new MutationObserver(enhance_breadcrumbs_callback);
enhance_breadcrumbs_observer.observe(document.documentElement, {childList: true, subtree: true});
