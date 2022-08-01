import {
    forEachAddedNode,
    nodeOrAncestorSatisfying
} from "./dom.mjs";

const directions =
      {
          "⬉":
          {
              className: "prev upwards",
              previousDirection: null,
              nextDirection: "⬆",
              opposite: "⬊"
          },
          "⬆":
          {
              className: "prev",
              previousDirection: "⬉",
              nextDirection: "⬈",
              opposite: "⬇",
              downwards: "⬈",
              upwards: "⬉"
          },
          "⬈":
          {
              className: "prev downwards",
              previousDirection: "⬆",
              nextDirection: "⚓",
              opposite: "⬋"
          },
          "⚓":
          {
              className: "anchor",
              previousDirection: "⬈",
              nextDirection: "⬋"
          },
          "⬋":
          {
              className: "next upwards",
              previousDirection: "⚓",
              nextDirection: "⬇",
              opposite: "⬈"
          },
          "⬇":
          {
              className: "next",
              previousDirection: "⬋",
              nextDirection: "⬊",
              opposite: "⬆",
              downwards: "⬊",
              upwards: "⬋"
          },
          "⬊":
          {
              className: "next downwards",
              previousDirection: "⬇",
              nextDirection: null,
              opposite: "⬉"
          }
      };

const directionNames = Object.keys(directions);

class NavSet {
    constructor (mockNode) {
        this.mockNode = mockNode;
        this.nav = mockNode.realNode.querySelector(".section-relative-nav");
        this.records = {"⚓": {
            targetMockNode: mockNode,
            linkElement: mockNode.realNode.querySelector(".section-relative-nav > .anchor")
        }};
    }

    static makeLink (direction, target) {
        const link = document.createElement("a");
        link.href = "#" + target;
        const className = directions[direction].className;
        if (!className)
            throw Error("Invalid direction \"" + direction + "\".");
        link.className = className + " generated";
        link.textContent = direction;
        return link;
    }

    nextNavLinkElement (direction) {
        direction = directions[direction].nextDirection;
        const records = this.records;
        let record;
        while (direction)
        {
            record = records[direction];
            if (record)
                return record.linkElement;
            else
                direction = directions[direction].nextDirection;
        }
        return null;
    }

    setDirectionTarget (direction, targetMockNode) {
        const navset = this;
        let record = navset.records[direction];
        if (record)
        {
            if (targetMockNode)
            {
                record.targetMockNode = targetMockNode;
                record.linkElement.href = targetMockNode.realNode.id;
            }
            else
            {
                delete navset.records[direction];
                navset.nav.removeChild(record.linkElement);
            }
        }
        else if (targetMockNode)
        {
            const linkElement = NavSet.makeLink(direction, targetMockNode.realNode.id);
            record = {
                targetMockNode: targetMockNode,
                linkElement: linkElement
            };
            navset.records[direction] = record;
            navset.nav.insertBefore(linkElement, navset.nextNavLinkElement(direction));
        }
    }
}

class MockNode {
    constructor (realNode, parent) {
        const mockNode = this;
        mockNode.parent = parent;
        MockNode.realNodeToMockNode[realNode.id] = mockNode;
        mockNode.realNode = realNode;
        mockNode["⬈"] = null;
        mockNode["⬊"] = null;
        if (parent)
        {
            mockNode.navset = new NavSet(mockNode);
            const {prev, next} = mockNode.determineSiblings();
            mockNode.updateLink(parent, "⬉", prev === null);
            mockNode.updateLink(parent["⬇"], "⬋", next === null);
            mockNode.updateLinks(prev, "⬆");
            mockNode.updateLinks(next, "⬇");
        }
        else
        {
            mockNode["⬉"] = null;
            mockNode["⬋"] = null;
            mockNode["⬆"] = null;
            mockNode["⬇"] = null;
        }
    }

    static realNodeToMockNode = {};

    determineSiblings () {
        const realNode = this.realNode;
        const parent = this.parent;
        let prev = null;
        let next = parent["⬊"];
        while (next)
        {
            if (realNode.compareDocumentPosition(next.realNode) & Node.DOCUMENT_POSITION_FOLLOWING)
                break;
            prev = next;
            next = next["⬇"];
        }
        return {prev: prev, next: next};
    }

    updateLink (otherNode, forward, isReciprocal) {
        const thisNode = this;
        if (!otherNode)
            return;
        function doUpdate (thisNode, otherNode, direction) {
            thisNode[direction] = otherNode;
            const navset = thisNode.navset;
            if (navset)
                navset.setDirectionTarget(direction, otherNode);
        }
        doUpdate(thisNode, otherNode, forward);
        if (isReciprocal)
            doUpdate(otherNode, thisNode, directions[forward].opposite);
    }

    updateLinks (sibling, forward) {
        const mockNode = this;
        const backwards = directions[forward].opposite;
        const backwardsDownwards = directions[backwards].downwards;
        const backwardsUpwards = directions[backwards].upwards;
        mockNode.updateLink(sibling, forward, true);
        let currentChild = sibling ? sibling[backwardsDownwards] : null;
        while (currentChild)
        {
            const nextChild = currentChild[backwards];
            if (nextChild)
            {
                currentChild.updateLink(mockNode, backwardsUpwards, false);
                currentChild = nextChild;
            }
            else
            {
                const downwardsChild = currentChild[backwardsDownwards];
                currentChild.updateLink(mockNode, backwardsUpwards, !downwardsChild);
                currentChild = downwardsChild;
            }
        }
    }
}

new MockNode(document.documentElement, null);
const rootMockNode = MockNode.realNodeToMockNode[""];

function process (node) {
    /* node must match ".section-relative-nav" */
    const isSection = node => node.tagName === "SECTION";
    const thisSection = nodeOrAncestorSatisfying(node, isSection);
    if (MockNode.realNodeToMockNode[thisSection.id])
        return null;
    const parentSection = nodeOrAncestorSatisfying(thisSection.parentNode, isSection);
    return new MockNode(thisSection, parentSection ? MockNode.realNodeToMockNode[parentSection.id] : rootMockNode);
}

for (let node of document.querySelectorAll(".section-relative-nav")) {
    process(node);
};

const observer = new MutationObserver(function (records, observer) {
    forEachAddedNode(records, function (addedNode) {
        if (addedNode.nodeType === Node.ELEMENT_NODE && addedNode.classList.contains("section-relative-nav"))
            process(addedNode);
    });
});

observer.observe(document.documentElement, {childList: true, subtree: true});
