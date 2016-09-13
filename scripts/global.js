"use strict";

var HexstreamSoft = {};

HexstreamSoft.forEachAddedNode = function (mutation_records, callback) {
    Array.prototype.forEach.call(mutation_records, function (record) {
        var added_nodes = record.addedNodes;
        if (added_nodes)
            Array.prototype.forEach.call(added_nodes, callback);
    });
};

HexstreamSoft.nodeOrAncestorSatisfying = function (node, test) {
    if (test(node))
        return node;
    else
    {
        var parent_element = node.parentElement;
        if (parent_element)
            return HexstreamSoft.nodeOrAncestorSatisfying(parent_element, test);
        else
            return undefined;
    }
};

HexstreamSoft.arrowsMadnessObserver = (function () {
    var typeToClass =
        {
            "⬉": "prev upwards",
            "⬆": "prev",
            "⬈": "prev downwards",
            "⬋": "next upwards",
            "⬇": "next",
            "⬊": "next downwards",
        };
    var typesArray = Object.keys(typeToClass);
    function makeLink (type, target) {
        var link = document.createElement("a");
        link.href = "#" + target;
        link.className = typeToClass[type] + " generated";
        link.textContent = type;
        return link;
    }
    var realNodeToMockNode = {};
    function createMockNode (realNode, parent) {
        var node = {};
        var toUpdate = [realNode];
        realNodeToMockNode[realNode ? realNode.id : ""] = node;
        node.realNode = realNode;
        node["⬉"] = parent;
        node["⬈"] = null;
        node["⬊"] = null;
        if (!parent)
        {
            node["⬋"] = null;
            node["⬆"] = null;
            node["⬇"] = null;
            return toUpdate;
        }
        var siblings = (function () {
            var prev = null;
            var next = parent["⬊"];
            while (next)
            {
                if (realNode.compareDocumentPosition(next.realNode) & Node.DOCUMENT_POSITION_FOLLOWING)
                    return {prev: prev, next: next};
                prev = next;
                next = next["⬇"];
            }
            if (prev === null)
            {
                parent["⬊"] = node;
                toUpdate.push(parent.realNode);
            }
            return {prev: prev, next: null};
        })();
        var prev = siblings.prev;
        var next = siblings.next;
        node["⬆"] = prev;
        if (prev)
        {
            prev["⬇"] = node;
            toUpdate.push(prev.realNode);
            (function (nodePrev) {
                var prev = null;
                var next = nodePrev["⬊"];
                while (next)
                {
                    next["⬋"] = node;
                    toUpdate.push(next.realNode);
                    prev = next;
                    next = next["⬇"];
                }
                if (prev !== null)
                {
                    node["⬈"] = prev;
                }
            })(prev);
        }
        node["⬇"] = next;
        if (next)
        {
            next["⬆"] = node;
            toUpdate.push(next.realNode);
        }
        node["⬋"] = parent["⬇"];
        return toUpdate;
    }
    createMockNode(document.documentElement, null);
    var rootMockNode = realNodeToMockNode[""];
    return new MutationObserver(function (records, observer) {
        HexstreamSoft.forEachAddedNode(records, function (addedNode) {
            if (addedNode.nodeType === Node.ELEMENT_NODE && addedNode.classList.contains("section-relative-nav"))
            {
                var isSection = function (node) {return node.tagName === "SECTION";};
                var thisSection = HexstreamSoft.nodeOrAncestorSatisfying(addedNode, isSection);
                var parentSection = HexstreamSoft.nodeOrAncestorSatisfying(thisSection.parentNode, isSection);
                var toUpdate = createMockNode(thisSection, parentSection ? realNodeToMockNode[parentSection.id] : rootMockNode);
                toUpdate.forEach(function (sectionToUpdate) {
                    var navToUpdate = sectionToUpdate.querySelector(".section-relative-nav");
                    var mockNode = realNodeToMockNode[sectionToUpdate.id];
                    var anchor = navToUpdate.querySelector(".anchor");
                    Array.prototype.slice.call(navToUpdate.childNodes).forEach(function (child) {
                        navToUpdate.removeChild(child);
                    });
                    typesArray.forEach(function (type) {
                        var sibling = mockNode[type];
                        if (sibling)
                            navToUpdate.appendChild(makeLink(type, sibling.realNode.id));
                        if (type === "⬈")
                            navToUpdate.appendChild(anchor);
                    });
                });
            }
        });
    }).observe(document, {childList: true, subtree: true});
})();


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
