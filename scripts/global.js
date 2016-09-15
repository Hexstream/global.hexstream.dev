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
    var directions =
        {
            "⬉":
            {
                className: "prev upwards",
                opposite: "⬊"
            },
            "⬆":
            {
                className: "prev",
                opposite: "⬇",
                downwards: "⬈",
                upwards: "⬉"
            },
            "⬈":
            {
                className: "prev downwards",
                opposite: "⬋"
            },
            "⬋":
            {
                className: "next upwards",
                opposite: "⬈"
            },
            "⬇":
            {
                className: "next",
                opposite: "⬆",
                downwards: "⬊",
                upwards: "⬋"
            },
            "⬊":
            {
                className: "next downwards",
                opposite: "⬉"
            },
        };
    var directionNames = Object.keys(directions);
    function makeLink (direction, target) {
        var link = document.createElement("a");
        link.href = "#" + target;
        link.className = directions[direction].className + " generated";
        link.textContent = direction;
        return link;
    }
    var realNodeToMockNode = {};
    function createMockNode (realNode, parent) {
        var node = {};
        var toUpdate = [realNode];
        realNodeToMockNode[realNode.id] = node;
        node.realNode = realNode;
        node["⬈"] = null;
        node["⬊"] = null;
        if (!parent)
        {
            node["⬉"] = null;
            node["⬋"] = null;
            node["⬆"] = null;
            node["⬇"] = null;
            return toUpdate;
        }
        var siblings = (function () {
            var prev = null;
            var next = parent["⬊"];
            body: while (next)
            {
                if (realNode.compareDocumentPosition(next.realNode) & Node.DOCUMENT_POSITION_FOLLOWING)
                    break body;
                prev = next;
                next = next["⬇"];
            }
            return {prev: prev, next: next};
        })();
        function updateLink (thisNode, otherNode, forward, isReciprocal, whichToUpdate) {
            thisNode[forward] = otherNode;
            if (whichToUpdate === "this")
                toUpdate.push(thisNode.realNode);
            if (otherNode && isReciprocal)
            {
                var backwards = directions[forward].opposite;
                otherNode[backwards] = thisNode;
                if (whichToUpdate === "other")
                    toUpdate.push(otherNode.realNode);
            }
        }
        function updateLinks (sibling, forward) {
            var backwards = directions[forward].opposite;
            var backwardsDownwards = directions[backwards].downwards;
            var backwardsUpwards = directions[backwards].upwards;
            updateLink(node, sibling, forward, true, "other");
            var currentChild = sibling ? sibling[backwardsDownwards] : null;
            while (currentChild)
            {
                var nextChild = currentChild[backwards];
                var currentChildIsLastChild = nextChild === null;
                updateLink(currentChild, node, backwardsUpwards, currentChildIsLastChild, "this");
                currentChild = currentChildIsLastChild ? currentChild[backwardsDownwards] : nextChild;
            }
        }
        var prev = siblings.prev;
        var next = siblings.next;
        updateLink(node, parent, "⬉", prev === null, "other");
        updateLink(node, parent["⬇"], "⬋", next === null, "other");
        updateLinks(prev, "⬆");
        updateLinks(next, "⬇");
        return toUpdate;
    }
    createMockNode(document.documentElement, null);
    var rootMockNode = realNodeToMockNode[""];
    var observer = new MutationObserver(function (records, observer) {
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
                    directionNames.forEach(function (type) {
                        var sibling = mockNode[type];
                        if (sibling)
                            navToUpdate.appendChild(makeLink(type, sibling.realNode.id));
                        if (type === "⬈")
                            navToUpdate.appendChild(anchor);
                    });
                });
            }
        });
    });
    observer.observe(document, {childList: true, subtree: true});
    return observer;
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
