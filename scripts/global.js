"use strict";

const HexstreamSoft = {};

HexstreamSoft.modules = {};
HexstreamSoft.modules.registeredModules = {};

HexstreamSoft.modules.moduleInfo = function (moduleName, options) {
    const moduleInfo = HexstreamSoft.modules.registeredModules[moduleName];
    if (moduleInfo)
        return moduleInfo;
    else
        if (!options || options.mustExist)
            throw Error("Unknown module name \"" + moduleName + "\".");
};

HexstreamSoft.modules.register = function (moduleName, ensureFunction) {
    const existingModule = HexstreamSoft.modules.moduleInfo(moduleName, {mustExist: false});
    if (existingModule)
        throw Error("Module \"" + moduleName + "\" has already been registered.");
    const moduleInfo = {};
    moduleInfo.ensureFunction = ensureFunction;
    moduleInfo.isInitialized = false;
    HexstreamSoft.modules.registeredModules[moduleName] = moduleInfo;
};

HexstreamSoft.modules.ensure = function () {
    const moduleNames = Array.prototype.slice.call(arguments);
    moduleNames.forEach(function (moduleName) {
        const moduleInfo = HexstreamSoft.modules.moduleInfo(moduleName);
        if (!moduleInfo.isInitialized)
        {
            moduleInfo.ensureFunction();
            moduleInfo.isInitialized = true;
        }
    });
};



HexstreamSoft.modules.register("HexstreamSoft.misc", function () {
    function identity (value) {
        return value;
    }

    function forEachOwnValues (object, callback, thisValue) {
        Object.keys(object).forEach(function (key) {
            callback.call(thisValue, object[key]);
        });
    }

    function forEachOwnKeysAndValues (object, callback, thisValue) {
        Object.keys(object).forEach(function (key) {
            callback.call(thisValue, key, object[key]);
        });
    }

    const upgradeReasonsAlreadyGiven = [];

    function pleaseUpgrade (reason) {
        if (upgradeReasonsAlreadyGiven.indexOf(reason) < 0)
        {
            upgradeReasonsAlreadyGiven.push(reason);
            throw Error("[" + reason + "]" + " Please upgrade to a modern standards-compliant browser such as Google Chrome.");
        }
    }

    HexstreamSoft.misc = {};
    HexstreamSoft.misc.identity = identity;
    HexstreamSoft.misc.forEachOwnValues = forEachOwnValues;
    HexstreamSoft.misc.forEachOwnKeysAndValues = forEachOwnKeysAndValues;
    HexstreamSoft.misc.pleaseUpgrade = pleaseUpgrade;
    HexstreamSoft.misc.baseURIURL = new URL(document.baseURI);
});


HexstreamSoft.modules.register("HexstreamSoft.dom", function () {
    function forEachAddedNode (mutationRecords, callback) {
        Array.prototype.forEach.call(mutationRecords, function (record) {
            const addedNodes = record.addedNodes;
            if (addedNodes)
                Array.prototype.forEach.call(addedNodes, function (addedNode) {
                    if (addedNode.nodeType === Node.ELEMENT_NODE)
                        Array.prototype.forEach.call(addedNode.querySelectorAll("*"), callback);
                    else
                        callback(addedNode);
                });
        });
    };

    function nodeOrAncestorSatisfying (node, test) {
        if (test(node))
            return node;
        else
        {
            const parentElement = node.parentElement;
            if (parentElement)
                return nodeOrAncestorSatisfying(parentElement, test);
            else
                return undefined;
        }
    };

    function parseTokens (tokensString) {
        return tokensString.split(" ").filter(HexstreamSoft.misc.identity);
    }

    function matches (node, selectors) {
        // I'm searching on the specific node instead of pre-computing
        // because I worry the method returned might be different for different node types.
        if (node.nodeType !== Node.ELEMENT_NODE)
            return false;
        const matches = node.matches || node.matchesSelector || node.webkitMatchesSelector || node.msMatchesSelector;
        if (!matches)
            HexstreamSoft.meta.pleaseUpgrade("matches");
        return matches.call(node, selectors);
    };


    const TokenList = (function () {
        function TokenList (node, attributeName) {
            const tokenList = this;
            tokenList.node = node;
            tokenList.attributeName = attributeName;
            tokenList.tokens = parseTokens(node.getAttribute(attributeName) || "");
        };

        TokenList.prototype.contains = function (token) {
            this.tokens.indexOf(token) >= 0;
        };

        TokenList.prototype.add = function (token) {
            if (!this.contains(token))
                this.tokens.push(token);
            syncTokensToAttribute(this);
        };

        TokenList.prototype.remove = function (token) {
            const index = this.tokens.indexOf(token);
            if (index >= 0)
                this.tokens.splice(index, 1);
            syncTokensToAttribute(this);
        };

        TokenList.prototype.forEach = function (callback, thisValue) {
            this.tokens.forEach(callback, thisValue);
        };

        function syncTokensToAttribute (tokenList) {
            if (tokenList.tokens.length > 0)
                tokenList.node.setAttribute(tokenList.attributeName, tokenList.tokens.join(" "));
            else
                tokenList.node.removeAttribute(tokenList.attributeName);
        }
        return TokenList;
    })();


    HexstreamSoft.dom = {};
    HexstreamSoft.dom.forEachAddedNode = forEachAddedNode;
    HexstreamSoft.dom.nodeOrAncestorSatisfying = nodeOrAncestorSatisfying;
    HexstreamSoft.dom.parseTokens = parseTokens;
    HexstreamSoft.dom.matches = matches;
    HexstreamSoft.dom.TokenList = TokenList;
});



HexstreamSoft.modules.register("HexstreamSoft.FixLinks", function () {
    function toRelativeURLString (base, target) {
        if (typeof base === "string")
            base = new URL(base);
        if (typeof target === "string")
            target = new URL(target);
        if (base.origin !== target.origin)
            return target.toString();
        const queryHash = String.prototype.concat.call(target.search || "", target.hash || "");
        base = base.pathname.split("/");
        target = target.pathname.split("/");
        const shortestLength = Math.min(base.length, target.length)
        for (var firstDifferent = 0; firstDifferent < shortestLength; firstDifferent++)
            if (base[firstDifferent] !== target[firstDifferent])
                break;
        const extraBaseComponents = base.length - firstDifferent - 1;
        let relativePath = [];
        for (let i = 0; i < extraBaseComponents; i++)
            relativePath.push("..")
        relativePath = relativePath.concat(target.slice(firstDifferent));
        return relativePath.join("/").concat(queryHash);
    }

    const observer = new MutationObserver(function (records) {
        HexstreamSoft.dom.forEachAddedNode(records, function (addedNode) {
            if (addedNode.tagName === "A")
            {
                const url = new URL(addedNode.getAttribute("href"), document.baseURI);
                if (url.protocol === "file:" && url.pathname.slice(-1) === "/")
                {
                    url.pathname = url.pathname + "index.html";
                    addedNode.setAttribute("href", toRelativeURLString(HexstreamSoft.misc.baseURIURL, url));
                }
            }
        });
    });

    observer.observe(document.documentElement, {childList: true, subtree: true});

    HexstreamSoft.FixLinks = {};
    HexstreamSoft.FixLinks.observer = observer;

});



HexstreamSoft.modules.register("HexstreamSoft.ArrowsMadness", function () {
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

    function NavSet (mockNode) {
        const navset = this;
        navset.mockNode = mockNode;
        navset.nav = mockNode.realNode.querySelector(".section-relative-nav");
        navset.records = {"⚓": {
            targetMockNode: mockNode,
            linkElement: mockNode.realNode.querySelector(".section-relative-nav > .anchor")
        }};
    }

    NavSet.makeLink = function (direction, target) {
        const link = document.createElement("a");
        link.href = "#" + target;
        const className = directions[direction].className;
        if (!className)
            throw Error("Invalid direction \"" + direction + "\".");
        link.className = className + " generated";
        link.textContent = direction;
        return link;
    }

    NavSet.prototype.nextNavLinkElement = function (direction) {
        direction = directions[direction].nextDirection;
        const navset = this;
        const records = navset.records;
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
    };

    NavSet.prototype.setDirectionTarget = function (direction, targetMockNode) {
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
    };


    function MockNode (realNode, parent) {
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

    MockNode.realNodeToMockNode = {};

    MockNode.prototype.determineSiblings = function () {
        const mockNode = this;
        const realNode = mockNode.realNode;
        const parent = mockNode.parent;
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
    };

    MockNode.prototype.updateLink = function (otherNode, forward, isReciprocal) {
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
    };

    MockNode.prototype.updateLinks = function (sibling, forward) {
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
    };

    new MockNode(document.documentElement, null);
    const rootMockNode = MockNode.realNodeToMockNode[""];

    const observer = new MutationObserver(function (records, observer) {
        HexstreamSoft.dom.forEachAddedNode(records, function (addedNode) {
            if (addedNode.nodeType === Node.ELEMENT_NODE && addedNode.classList.contains("section-relative-nav"))
            {
                const isSection = function (node) {return node.tagName === "SECTION";};
                const thisSection = HexstreamSoft.dom.nodeOrAncestorSatisfying(addedNode, isSection);
                if (MockNode.realNodeToMockNode[thisSection.id])
                    return;
                const parentSection = HexstreamSoft.dom.nodeOrAncestorSatisfying(thisSection.parentNode, isSection);
                new MockNode(thisSection, parentSection ? MockNode.realNodeToMockNode[parentSection.id] : rootMockNode)
            }
        });
    });
    observer.observe(document.documentElement, {childList: true, subtree: true});

    HexstreamSoft.ArrowsMadness = {};
    HexstreamSoft.ArrowsMadness.observer = observer;
});



HexstreamSoft.modules.register("HexstreamSoft.StateDomain", function () {
    function StateDomainSchema (properties) {
        const schema = this;
        const keys = Object.keys(properties);
        schema.properties = properties;
        schema.keys = keys;
        schema.varyingRelevanceKeys = schema.keys.filter(function (key) {return !schema.isAlwaysRelevant(key)});
    }

    StateDomainSchema.prototype.defaultValue = function (key) {
        const schema = this;
        const defaultValue = schema.properties[key].defaultValue;
        if (defaultValue !== undefined)
            return defaultValue;
        else
            throw Error("No key named " + key + " in schema " + schema + ".");
    };

    StateDomainSchema.prototype.possibleValues = function (key) {
        const schema = this;
        return schema.properties[key].possibleValues;
    };

    StateDomainSchema.prototype.valueValidator = function (key) {
        const schema = this;
        return schema.properties[key].valueValidator;
    };

    StateDomainSchema.prototype.isAcceptableValue = function (key, value) {
        const schema = this;
        const possibleValues = schema.possibleValues(key);
        return possibleValues ? possibleValues.indexOf(value) >= 0 : (schema.valueValidator(key))(value);
    };

    StateDomainSchema.prototype.isAlwaysRelevant = function (key) {
        const schema = this;
        return !schema.properties[key].computeRelevance;
    };


    function StateDomain (schema) {
        const domain = this;
        function propagateRelevance () {
            const varyingRelevanceKeys = schema.varyingRelevanceKeys;
            let propagationProgressed = true;
            const changedRelevanceKeys = [];
            while (propagationProgressed)
            {
                propagationProgressed = false;
                varyingRelevanceKeys.forEach(function (key) {
                    const domainKeyProperties = domain.properties[key];
                    const oldRelevance = domainKeyProperties.relevant;
                    const newRelevance = schema.properties[key].computeRelevance(domain);
                    if (newRelevance !== oldRelevance)
                    {
                        domainKeyProperties.relevant = newRelevance;
                        propagationProgressed = true;
                        changedRelevanceKeys.push(key);
                    }
                });
            }
            if (changedRelevanceKeys.length > 0)
                window.dispatchEvent(new CustomEvent("HexstreamSoft.relevance",
                                                     {
                                                         bubbles: false,
                                                         cancelable: false,
                                                         detail: {
                                                             storage: domain,
                                                             keys: changedRelevanceKeys
                                                         }
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
                                              const oldValue = domain.properties[key].value;
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
                                          {
                                              const defaultValue = domain.reset(key);
                                              console.warn("Value \"" + newValue + "\" is not acceptable for key \"" + key + "\"."
                                                           + "\nThe key has been reset to its default value, \"" + defaultValue + "\"."
                                                           + (schema.possibleValues(key)
                                                              ? "\n\nAcceptable values:\n" + schema.possibleValues(key).join("\n")
                                                              : ""));
                                          }
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
        const domain = this;
        const keys = domain.schema.keys;
        keys.forEach(function (key) {
            callback.call(thisArg, key, domain[key]);
        });
    }

    StateDomain.prototype.isRelevant = function (key) {
        const domain = this;
        return domain.properties[key].relevant;
    };

    StateDomain.prototype.reset = function (key) {
        const domain = this;
        const schema = domain.schema;
        const defaultValue = schema.defaultValue(key);
        domain[key] = defaultValue;
        return defaultValue;
    };

    StateDomain.prototype.resetAll = function () {
        this.schema.keys.forEach(this.reset, this);
    };

    HexstreamSoft.StateDomainSchema = StateDomainSchema;
    HexstreamSoft.StateDomain = StateDomain;

});



HexstreamSoft.modules.register("HexstreamSoft.EventBinding", function () {
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

    const EventBinding = {};

    EventBinding.types = {};

    EventBinding.defineType = function (types, definition) {
        types = types.slice();
        let table = EventBinding.types;
        while (types.length > 1)
        {
            const type = types.shift();
            const oldTable = table;
            table = table[type];
            if (table === undefined)
                oldTable[type] = table = {};
        }

        const lastType = types[0];

        if (table[lastType])
            throw Error("Duplicate EventBinding type definition.");
        table[lastType] = definition;
        definition.bindings = [];
    };

    EventBinding.findType = function (types) {
        let value = EventBinding.types;
        types.forEach(function (type) {
            value = value[type];
        });
        return value;
    }

    EventBinding.Binding = function (parent) {
        const binding = this;
        binding.parent = parent || null;
        if (parent)
            parent.children.push(binding);
    };

    EventBinding.defineType(["storage", "storage"], (function () {
        function Binding (sourceStorage, keys, destinationStorage) {
            const binding = this;
            binding.sourceStorage = sourceStorage;
            binding.destinationStorage = destinationStorage;
            binding.keys = keys;
            binding.listener = function (event) {
                if (event.detail.storage === sourceStorage)
                    binding.incrementalSync(event.detail.key);
            };
        }
        Binding.prototype.hookup = function () {
            window.addEventListener("HexstreamSoft.storage", this.listener);
        };
        Binding.prototype.initialSync = function () {
            this.keys.forEach(this.incrementalSync, this);
        };
        Binding.prototype.incrementalSync = function (key) {
            const sourceValue = this.sourceStorage[key];
            if (sourceValue !== undefined)
                this.destinationStorage[key] = sourceValue;
        };
        return {
            bind: function (fromSpec, toSpec) {
                return new Binding(fromSpec.storage, fromSpec.keys, toSpec.storage);
            }
        };
    })());
    EventBinding.defineType(["storage", "document"], (function () {
        const selector = "input[type=radio], input[type=checkbox], var, span, td";
        function isInteresting (knownToMatchSelector, document, node, stateDomainName) {
            return (knownToMatchSelector
                    || HexstreamSoft.dom.matches(node, selector))
                && node.dataset.stateKey
                && nodeStateDomainName(node) === stateDomainName;
        }
        function registerNode (binding, node) {
            binding.registeredNodes.push(node);
            const key = node.dataset.stateKey;
            let keyNodes = binding.keyToNodes[key];
            if (!keyNodes)
            {
                keyNodes = [];
                binding.keyToNodes[key] = keyNodes;
            }
            keyNodes.push(node);
            binding.incrementalSyncNode(node);
        }
        function Binding (storage, document, stateDomainName) {
            const binding = this;
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
        }
        Binding.prototype.hookup = function () {
            const binding = this;
            window.addEventListener("HexstreamSoft.storage", binding.storageListener);
            window.addEventListener("HexstreamSoft.relevance", binding.relevanceListener);
            binding.observer = new MutationObserver(function (records, observer) {
                HexstreamSoft.dom.forEachAddedNode(records, function (node) {
                    if (isInteresting(false, document, node, binding.stateDomainName))
                        registerNode(binding, node);
                });
            });
            binding.observer.observe(document, {childList: true, subtree: true});
        };
        Binding.prototype.initialSync = function () {
            const binding = this;
            Array.prototype.forEach.call(document.querySelectorAll(selector), function (potentiallyInteresting) {
                if (isInteresting(true, document, potentiallyInteresting, binding.stateDomainName))
                    registerNode(binding, potentiallyInteresting)});
            binding.registeredNodes.forEach(function (node) {
                binding.incrementalSyncNode(node);
            });
        };
        Binding.prototype.incrementalSyncNode = function (node) {
            const storage = this.storage;
            const key = node.dataset.stateKey;
            const sourceValue = storage[key];
            if (node.tagName === "INPUT")
            {
                node.disabled = storage.isRelevant ? !storage.isRelevant(key) : false;
                if (sourceValue !== undefined)
                    node.checked = sourceValue === node.dataset.stateValue;
            }
            else
                if (sourceValue !== undefined)
                    node.textContent = sourceValue;

        };
        Binding.prototype.incrementalSync = function (key) {
            (this.keyToNodes[key] || []).forEach(this.incrementalSyncNode, this);
        };
        return {
            bind: function (fromSpec, toSpec) {
                return new Binding(fromSpec.storage, toSpec.document, toSpec.stateDomainName);
            }
        }
    })());


    function nodeStateDomainName (node) {
        function nodeStateDomain (node) {
            return node.dataset.stateDomain;
        }
        const domainNode = HexstreamSoft.dom.nodeOrAncestorSatisfying(node, nodeStateDomain);
        return domainNode ? nodeStateDomain(domainNode) : undefined;
    }


    EventBinding.defineType(["document", "storage"], (function () {
        function Binding (document, stateDomainName, storage) {
            const binding = this;
            binding.document = document;
            binding.stateDomainName = stateDomainName;
            binding.storage = storage;
            binding.registeredNodes = [];
            binding.clickListener = function (event) {
                binding.incrementalSync(event.target);
            };
        }
        Binding.prototype.hookup = function () {
            const binding = this;
            binding.observer = new MutationObserver(function (records, observer) {
                HexstreamSoft.dom.forEachAddedNode(records, function (node) {
                    if (HexstreamSoft.dom.matches(node, "input[type=radio], input[type=checkbox]")
                        && node.dataset.stateValue
                        && nodeStateDomainName(node) === binding.stateDomainName)
                    {
                        binding.registeredNodes.push(node);
                        binding.incrementalSync(node);
                        node.addEventListener("click", binding.clickListener);
                    }
                });
            });
            binding.observer.observe(document, {childList: true, subtree: true});
        };
        Binding.prototype.initialSync = function () {
        };
        Binding.prototype.incrementalSync = function (node) {
            const dataset = node.dataset;
            const key = dataset.stateKey;
            if (node.checked || dataset.stateAntivalue)
                this.storage[key] = node.checked ? dataset.stateValue : dataset.stateAntivalue;
        };
        return {
            bind: function (fromSpec, toSpec) {
                return new Binding(fromSpec.document, fromSpec.stateDomainName, toSpec.storage);
            }
        }
    })());


    EventBinding.defineType(["storage", "classList"], (function () {
        function KeyBinding (parent, key) {
            const keyBinding = this;
            const parentStorage = parent.storage;
            const initialValue = parentStorage[key];
            keyBinding.parent = parent;
            keyBinding.key = key;
            keyBinding.value = initialValue;
            keyBinding.incrementalSyncValue(initialValue);
            if (parentStorage.isRelevant && !parentStorage.isRelevant(key))
                keyBinding.incrementalSyncRelevance(false);
        }
        KeyBinding.prototype.incrementalSyncValue = function (newValue) {
            const keyBinding = this;
            const {key, value} = keyBinding;
            const classes = keyBinding.parent.node.classList;
            classes.remove(key + "=" + value);
            keyBinding.value = newValue;
            classes.add(key + "=" + newValue);
        }
        KeyBinding.prototype.incrementalSyncRelevance = function (newRelevance) {
            const keyBinding = this;
            const {key, value} = keyBinding;
            const classes = keyBinding.parent.node.classList;
            if (newRelevance)
                classes.add(key + "=" + value);
            else
                classes.remove(key + "=" + value);
        }
        function Binding (storage, keys, node) {
            const binding = this;
            binding.storage = storage;
            binding.keys = keys;
            binding.node = node;
            const children = {};
            keys.forEach(function (key) {
                children[key] = new KeyBinding(binding, key);
            });
            binding.children = children;
        }
        Binding.prototype.hookup = function () {
            const binding = this;
            const storageListener = function (event) {
                const storage = binding.storage;
                if (event.detail.storage === storage)
                {
                    const key = event.detail.key;
                    if (key === null)
                    {
                        binding.children.forEach(function (child) {
                            child.incrementalSyncValue(storage[child.key]);
                        });
                    }
                    else
                    {
                        binding.children[key].incrementalSyncValue(event.detail.newValue);
                    }
                }
            };
            window.addEventListener("HexstreamSoft.storage", storageListener);
            const relevanceListener = function (event) {
                const storage = binding.storage;
                if (event.detail.storage === storage)
                {
                    event.detail.keys.forEach(function (key) {
                        const child = binding.children[key];
                        if (child !== undefined)
                            child.incrementalSyncRelevance(storage.isRelevant(key));
                    });


                }
            };
            window.addEventListener("HexstreamSoft.relevance", relevanceListener);
            /*
            binding.observer = new MutationObserver(function (records, observer) {
                HexstreamSoft.dom.forEachAddedNode(records, function (node) {
                    if (node.tagName && node.tagName.toLowerCase() === binding.nodeSelector)
                    {
                        observer.disconnect();
                        binding.incrementalSync(node);
                    }
                });
            });
            binding.observer.observe(binding.document.documentElement, {childList: true, subtree: true});
            */
        };
        return {
            bind: function (fromSpec, toSpec) {
                return new Binding(fromSpec.storage, fromSpec.keys, toSpec.node);
            }
        }
    })());

    function shallowCopy (object) {
        const copy = {};
        Object.keys(object).forEach(function (key) {
            copy[key] = object[key];
        });
        return copy;
    }

    function compose (main, bothSpec, endpointSpec) {
        const composed = shallowCopy(main);
        [bothSpec || {}, endpointSpec || {}].forEach(function (extra) {
            Object.keys(extra).forEach(function (key) {
                if (composed.hasOwnProperty(key))
                    throw Error("Clash for property \"" + key + "\".\n" + {main: main, bothSpec: bothSpec, endpointSpec: endpointSpec});
                else
                    composed[key] = extra[key];
            });
        });
        return composed;
    };

    EventBinding.defineType([">"], (function () {
        function Binding (endpoints, sharedOptions) {
            const binding = this;
            sharedOptions = sharedOptions || {};
            binding.endpoints = endpoints;
            binding.sharedOptions = sharedOptions || {};
            const types = endpoints.map(function (endpoint) {return endpoint.type});
            const specs = endpoints;
            const typeDefinition = EventBinding.findType(types);
            const bindings = typeDefinition.bindings;
            const combinedFromSpec = compose(specs[0], sharedOptions.both, sharedOptions.source);
            const combinedToSpec = compose(specs[1], sharedOptions.both, sharedOptions.destination);
            const newBinding = typeDefinition.bind(combinedFromSpec, combinedToSpec);
            bindings.push(newBinding);
            if (newBinding.hookup)
                newBinding.hookup();
            if (newBinding.initialSync)
                newBinding.initialSync();
            binding.impl = newBinding;
        }
        return {
            bind: function (endpoints, sharedOptions) {
                return new Binding(endpoints, sharedOptions);
            }
        }
    })());

    const unibind = EventBinding.findType([">"]);

    EventBinding.defineType(["="], (function () {
        function Binding (endpoints, sharedOptions) {
            const binding = this;
            binding.endpoints = endpoints;
            binding.sharedOptions = sharedOptions || {};
            binding.impl0 = unibind.bind(endpoints, sharedOptions);
            binding.impl1 = unibind.bind(endpoints.splice(0).reverse(), sharedOptions);
        }
        return {
            bind: function (endpoints, sharedOptions) {
                return new Binding(endpoints, sharedOptions);
            }
        }
    })());

    const bidibind = EventBinding.findType(["="]);

    EventBinding.bind = function (combine, endpoints, sharedOptions) {
        switch (combine)
        {
            case ">":
            return unibind.bind(endpoints, sharedOptions);
            break;

            case "=":
            return bidibind.bind(endpoints, sharedOptions);
            break;

            default:
            throw Error("Invalid combination type \"" + combine + "\".");
        }
    };

    HexstreamSoft.EventBinding = EventBinding;

});



HexstreamSoft.modules.ensure("HexstreamSoft.misc", "HexstreamSoft.dom", "HexstreamSoft.ArrowsMadness");

if (document.location.protocol === "file:")
{
    document.documentElement.classList.add("browsing-locally");

    HexstreamSoft.modules.ensure("HexstreamSoft.FixLinks");

    const canonicalLinkNode = document.querySelector("link[rel=\"canonical\"]");
    if (canonicalLinkNode) {
        document.addEventListener("DOMContentLoaded", function () {
            var metaNav = document.querySelector("#meta-nav > ul");
            if (!metaNav) {
                const topNavMain = document.querySelector("#top-nav > .main");
                if (topNavMain) {
                    topNavMain.insertAdjacentHTML("beforeend", "<nav class=\"tabs\" id=\"meta-nav\"><ul></ul></nav>");
                    metaNav = topNavMain.querySelector("#meta-nav > ul");
                }
            }
            if (metaNav) {
                metaNav.insertAdjacentHTML("beforeend", "<li><a class=\"canonical\"><span>See on the web</span></a></li>");
                metaNav.querySelector(".canonical").href=canonicalLinkNode.getAttribute("href");
            }
        });
    }
}
