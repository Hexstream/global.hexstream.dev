"use strict";

function enhanceBreadcrumbsCallback (mutationRecords, observer) {
    Array.prototype.forEach.call(mutationRecords, function (record) {
        const addedNodes = record.addedNodes;
        if (addedNodes)
            Array.prototype.forEach.call(addedNodes, function (addedNode) {
                if (addedNode.tagName === "NAV" && addedNode.classList.contains("breadcrumbs"))
                {
                    observer.disconnect();
                    //"file:" protocol special case to ease local debugging.
                    const baseURIURL = HexstreamSoft.misc.baseURIURL;
                    const path = baseURIURL.protocol === "file:" ? baseURIURL.hash.slice(1) : baseURIURL.pathname;
                    const mostSpecificBreadcrumbs = addedNode;
                    let longestMatch = -1;
                    Array.prototype.forEach.call(document.querySelectorAll("template[data-path]"),
                                                 function (template) {
                                                     var dataPath = template.dataset.path;
                                                     if (dataPath.length > longestMatch
                                                         && String.prototype.indexOf.call(path, dataPath) === 0)
                                                     {

                                                         mostSpecificBreadcrumbs = template.content;
                                                         longestMatch = dataPath.length;
                                                     }
                                                 });
                    if (mostSpecificBreadcrumbs !== addedNode)
                        addedNode.parentElement.replaceChild(mostSpecificBreadcrumbs.cloneNode(true),
                                                              addedNode);
                }
            });
    });
}

const enhanceBreadcrumbsObserver = new MutationObserver(enhanceBreadcrumbsCallback);

enhanceBreadcrumbsObserver.observe(document.documentElement, {childList: true, subtree: true});
