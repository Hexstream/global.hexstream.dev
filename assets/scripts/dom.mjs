export {
    forEachAddedNode
};

function forEachAddedNode (mutationRecords, callback) {
    Array.prototype.forEach.call(mutationRecords, function (record) {
        const addedNodes = record.addedNodes;
        if (addedNodes)
            Array.prototype.forEach.call(addedNodes, function (addedNode) {
                callback(addedNode);
                if (addedNode.nodeType === Node.ELEMENT_NODE)
                    Array.prototype.forEach.call(addedNode.querySelectorAll("*"), callback);
            });
    });
};
