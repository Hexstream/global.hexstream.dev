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
                    var anchor = navToUpdate.querySelector(".section-relative-nav > .anchor");
                    navToUpdate.removeChild(anchor);
                    Array.prototype.forEach.call(navToUpdate.querySelectorAll(".section-relative-nav > .generated"),
                                                 navToUpdate.removeChild,
                                                 navToUpdate);
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



HexstreamSoft.modules = {};
HexstreamSoft.modules.registeredModules = {};

HexstreamSoft.modules.moduleInfo = function (moduleName, options) {
    var moduleInfo = HexstreamSoft.modules.registeredModules[moduleName];
    if (moduleInfo)
        return moduleInfo;
    else
        if (!options || options.mustExist)
            throw Error("Unknown module name \"" + moduleName + "\".");
};

HexstreamSoft.modules.register = function (moduleName, ensureFunction) {
    var existingModule = HexstreamSoft.modules.moduleInfo(moduleName, {mustExist: false});
    if (existingModule)
        throw Error("Module \"" + moduleName + "\" has already been registered.");
    var moduleInfo = {};
    moduleInfo.ensureFunction = ensureFunction;
    moduleInfo.isInitialized = false;
    HexstreamSoft.modules.registeredModules[moduleName] = moduleInfo;
};

HexstreamSoft.modules.ensure = function (moduleNames) {
    moduleNames.forEach(function (moduleName) {
        var moduleInfo = HexstreamSoft.modules.moduleInfo(moduleName);
        if (!moduleInfo.isInitialized)
        {
            moduleInfo.ensureFunction();
            moduleInfo.isInitialized = true;
        }
    });
};



HexstreamSoft.modules.register("StateDomain", function () {
    function StateDomainSchema (properties) {
        var schema = this;
        var keys = Object.keys(properties);
        schema.properties = properties;
        schema.keys = keys;
        schema.varyingRelevanceKeys = schema.keys.filter(function (key) {return !schema.isAlwaysRelevant(key)});
    }

    StateDomainSchema.prototype.defaultValue = function (key) {
        var schema = this;
        var defaultValue = schema.properties[key].defaultValue;
        if (defaultValue)
            return defaultValue;
        else
            throw Error("No key named " + key + " in schema " + schema + ".");
    };

    StateDomainSchema.prototype.possibleValues = function (key) {
        var schema = this;
        return schema.properties[key].possibleValues;
    };

    StateDomainSchema.prototype.isAcceptableValue = function (key, value) {
        var schema = this;
        return schema.possibleValues(key).indexOf(value) >= 0;
    };

    StateDomainSchema.prototype.isAlwaysRelevant = function (key) {
        var schema = this;
        return schema.properties[key].computeRelevance ? false : true;
    };


    function StateDomain (schema) {
        var domain = this;
        function propagateRelevance () {
            var varyingRelevanceKeys = schema.varyingRelevanceKeys;
            var propagationProgressed = true;
            var propagatedSomething = false;
            while (propagationProgressed)
            {
                propagationProgressed = false;
                varyingRelevanceKeys.forEach(function (key) {
                    var domainKeyProperties = domain.properties[key];
                    var oldRelevance = domainKeyProperties.relevant;
                    var newRelevance = schema.properties[key].computeRelevance(domain);
                    if (newRelevance !== oldRelevance)
                    {
                        domainKeyProperties.relevant = newRelevance;
                        propagationProgressed = true;
                        propagatedSomething = true;
                    }
                });
            }
            if (propagatedSomething)
                window.dispatchEvent(new CustomEvent("HexstreamSoft.relevance",
                                                     {
                                                         bubbles: false,
                                                         cancelable: false,
                                                         detail: {storage: domain}
                                                     }));
        }
        domain.schema = schema;
        domain.properties = {};
        schema.keys.forEach(function (key) {
            domain.properties[key] = {value: schema.defaultValue(key),
                                      relevant: schema.isAlwaysRelevant(key) ? true : false};
            Object.defineProperty(domain, key,
                                  {
                                      set: function (newValue) {
                                          if (schema.isAcceptableValue(key, newValue))
                                          {
                                              var oldValue = domain.properties[key].value;
                                              if (oldValue !== newValue)
                                              {
                                                  domain.properties[key].value = newValue;
                                                  propagateRelevance();
                                                  window.dispatchEvent(new CustomEvent("HexstreamSoft.storage",
                                                                                       {
                                                                                           cancelable: false,
                                                                                           bubbles: false,
                                                                                           detail:
                                                                                           {
                                                                                               storage: domain,
                                                                                               key: key,
                                                                                               oldValue: oldValue,
                                                                                               newValue: newValue,
                                                                                           }
                                                                                       }));
                                              }
                                          }
                                          else
                                              throw Error("Value \"" + newValue + "\" is not acceptable for key \"" + key
                                                          + "\".\n\nAcceptable values:\n" + schema.possibleValues(key).join("\n"));
                                      },
                                      get: function () {
                                          return domain.properties[key].value;
                                      },
                                      enumerable: true
                                  });
        });
        propagateRelevance();
    }

    StateDomain.prototype.forEach = function (callback, thisArg) {
        var domain = this;
        var keys = domain.schema.keys;
        keys.forEach(function (key) {
            callback.call(thisArg, key, domain[key]);
        });
    }

    StateDomain.prototype.isRelevant = function (key) {
        var domain = this;
        return domain.properties[key].relevant;
    };

    StateDomain.prototype.reset = function (key) {
        var domain = this;
        var schema = domain.schema;
        var defaultValue = schema.defaultValue(key);
        domain[key] = defaultValue;
        return defaultValue;
    };

    StateDomain.prototype.resetAll = function () {
        this.schema.keys.forEach(this.reset, this);
    };

    HexstreamSoft.StateDomainSchema = StateDomainSchema;
    HexstreamSoft.StateDomain = StateDomain;

});


HexstreamSoft.modules.register("EventBinding", function () {
    window.addEventListener("storage", function (event) {
        window.dispatchEvent(new CustomEvent("HexstreamSoft.storage",
                                             {
                                                 cancelable: false,
                                                 bubbles: false,
                                                 detail: {
                                                     storage: event.storageArea,
                                                     key: event.key,
                                                     oldValue: event.oldValue,
                                                     newValue: event.newValue,
                                                 }
                                             }));
    });

    var EventBinding = {};

    EventBinding.types = {};

    EventBinding.defineType = function (from, to, definition) {
        var toTable = EventBinding.types[from];
        if (!toTable)
            toTable = EventBinding.types[from] = {};
        if (toTable[to])
            throw Error("Duplicate EventBinding type definition.");
        toTable[to] = definition;
        definition.bindings = [];
    };

    EventBinding.Binding = function (parent) {
        var binding = this;
        binding.parent = parent || null;
        if (parent)
            parent.children.push(binding);
    };

    EventBinding.defineType("storage", "storage", (function () {
        var Binding = function (sourceStorage, destinationStorage, keys) {
            var binding = this;
            binding.sourceStorage = sourceStorage;
            binding.destinationStorage = destinationStorage;
            binding.keys = keys;
            binding.listener = function (event) {
                if (event.detail.storage === sourceStorage)
                    binding.incrementalSync(event.detail.key);
            };
            binding.hookup = function () {
                window.addEventListener("HexstreamSoft.storage", binding.listener);
            };
            binding.initialSync = function () {
                binding.keys.forEach(binding.incrementalSync, binding);
            };
            binding.incrementalSync = function (key) {
                var sourceValue = binding.sourceStorage[key];
                if (sourceValue !== undefined)
                    binding.destinationStorage[key] = sourceValue;
            };
        };
        return {
            bind: function (spec) {
                return [new Binding(spec.sourceStorage, spec.destinationStorage, spec.keys)];
            },
        }
    })());
    EventBinding.defineType("storage", "document", (function () {
        var Binding = function (storage, document, stateDomainName) {
            var binding = this;
            binding.storage = storage;
            binding.document = document;
            binding.stateDomainName = stateDomainName;
            binding.registeredNodes = [];
            binding.keyToNodes = {};
            binding.storageListener = function (event) {
                if (event.detail.storage === storage)
                    binding.incrementalSync(event.detail.key);
            };
            binding.relevanceListener = function (event) {
                if (event.detail.storage === storage)
                    binding.initialSync();
            };
            binding.hookup = function () {
                window.addEventListener("HexstreamSoft.storage", binding.storageListener);
                window.addEventListener("HexstreamSoft.relevance", binding.relevanceListener);
                binding.observer = new MutationObserver(function (records, observer) {
                    HexstreamSoft.forEachAddedNode(records, function (node) {
                        if (node.tagName !== "INPUT")
                            return;
                        var node_type = node.getAttribute("type");
                        if ((node_type === "radio" || node_type === "checkbox")
                            && node.dataset.stateValue
                            && nodeStateDomainName(node) === stateDomainName)
                        {
                            binding.registeredNodes.push(node);
                            var key = node.dataset.stateKey;
                            var keyNodes = binding.keyToNodes[key];
                            if (!keyNodes)
                            {
                                keyNodes = [];
                                binding.keyToNodes[key] = keyNodes;
                            }
                            keyNodes.push(node);
                            binding.incrementalSyncNode(node);
                        }
                    });
                });
                binding.observer.observe(document, {childList: true, subtree: true});
            };
            binding.initialSync = function () {
                binding.registeredNodes.forEach(function (node) {
                    binding.incrementalSyncNode(node);
                });
            };
            binding.incrementalSyncNode = function (node) {
                var key = node.dataset.stateKey;
                node.disabled = storage.isRelevant ? !storage.isRelevant(key) : false;
                var sourceValue = storage[key];
                if (sourceValue !== undefined)
                    node.checked = sourceValue === node.dataset.stateValue;
            };
            binding.incrementalSync = function (key) {
                (binding.keyToNodes[key] || []).forEach(binding.incrementalSyncNode, binding);
            };
        };
        return {
            bind: function (spec) {
                return [new Binding(spec.storage, spec.document, spec.stateDomainName)];
            },
        }
    })());


    function nodeStateDomainName (node) {
        function nodeStateDomain (node) {
            return node.dataset.stateDomain;
        }
        var domain_node = HexstreamSoft.nodeOrAncestorSatisfying(node, nodeStateDomain);
        var value = domain_node ? nodeStateDomain(domain_node) : undefined;
        return value;
    }


    EventBinding.defineType("document", "storage", (function () {
        var Binding = function (document, stateDomainName, storage) {
            var binding = this;
            binding.document = document;
            binding.stateDomainName = stateDomainName;
            binding.storage = storage;
            binding.registeredNodes = [];
            binding.clickListener = function (event) {
                binding.incrementalSync(event.target);
            };
            binding.hookup = function () {
                binding.observer = new MutationObserver(function (records, observer) {
                    HexstreamSoft.forEachAddedNode(records, function (node) {
                        if (node.tagName !== "INPUT")
                            return;
                        var node_type = node.getAttribute("type");
                        if ((node_type === "radio" || node_type === "checkbox")
                            && node.dataset.stateValue
                            && nodeStateDomainName(node) === stateDomainName)
                        {
                            binding.registeredNodes.push(node);
                            binding.incrementalSync(node);
                            node.addEventListener("click", binding.clickListener);
                        }
                    });
                });
                binding.observer.observe(document, {childList: true, subtree: true})
            };
            binding.initialSync = function () {
            };
            binding.incrementalSync = function (node) {
                var dataset = node.dataset;
                var key = dataset.stateKey;
                if (node.checked || dataset.stateAntivalue)
                    storage[key] = node.checked ? dataset.stateValue : dataset.stateAntivalue;
            };
        };
        return {
            bind: function (spec) {
                return [new Binding(spec.document, spec.stateDomainName, spec.storage)];
            },
        }
    })());


    EventBinding.defineType("storage", "classList", (function () {
        var Binding = function (storage, keys, document, nodeSelector) {
            var binding = this;
            binding.storage = storage;
            binding.keys = keys;
            binding.document = document;
            binding.nodeSelector = nodeSelector;
            binding.storageListener = function (event) {
                if (event.detail.storage === storage && window.document.body)
                    binding.incrementalSync(window.document.body);
            };
            binding.hookup = function () {
                window.addEventListener("HexstreamSoft.storage", binding.storageListener);
                binding.observer = new MutationObserver(function (records, observer) {
                    HexstreamSoft.forEachAddedNode(records, function (node) {
                        if (node.tagName && node.tagName.toLowerCase() === binding.nodeSelector)
                        {
                            observer.disconnect();
                            binding.incrementalSync(node);
                        }
                    });
                });
                binding.observer.observe(document, {childList: true, subtree: true})
            };
            binding.initialSync = function () {
                if (window.document.body)
                    binding.incrementalSync(window.document.body);
            };
            binding.incrementalSync = function (node) {
                node.className = "";
                var classes = node.classList;
                keys.forEach(function (key) {
                    if (storage.isRelevant(key))
                        classes.add(key + "=" + storage[key]);
                });
            };
        };
        return {
            bind: function (spec) {
                return [new Binding(spec.storage, spec.keys, spec.document, spec.nodeSelector)];
            },
        }
    })());


    EventBinding.bind = function (from, to, spec) {
        var typeDefinition = EventBinding.types[from][to];
        var bindings = typeDefinition.bindings;
        typeDefinition.bind(spec).forEach(function (newBinding) {
            bindings.push(newBinding);
            if (newBinding.hookup)
                newBinding.hookup();
            if (newBinding.initialSync)
                newBinding.initialSync();
        });
    };

    HexstreamSoft.EventBinding = EventBinding;

});
