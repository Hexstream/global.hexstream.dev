import {
    DefinitionTree
} from "https://global.hexstream.dev/scripts/definition-tree.mjs";

import {
    KeyToValues
} from "https://global.hexstream.dev/scripts/key-to-values.mjs";

export {
    bind,
    bindings,

    Binding,
    BindingGroup,
    types,

    Selector,
    DocumentSelector
};

const window = globalThis.window;

window.addEventListener("storage", function (event) {
    window.dispatchEvent(new CustomEvent("HexstreamSoft.storage",
                                         {
                                             cancelable: false,
                                             bubbles: false,
                                             detail: {
                                                 storage: event.storageArea,
                                                 key: event.key,
                                                 oldValue: event.oldValue,
                                                 newValue: event.newValue
                                             }
                                         }));
});

class Binding {
    constructor (parent) {
        this.parent = parent ?? null;
        parent?.addChild(this);
    }

    sync () {
    }
}

class BindingGroup extends Binding {
    constructor (parent) {
        super(parent);
        this.children = [];
    }

    sync () {
        super.sync();
        for (const child of this.children) {
            child.sync();
        }
    }

    addChild (child) {
        this.children.push(child);
        return child;
    }
}

class TypeDefinitionTree extends DefinitionTree {
    define (labels, definition) {
        super.define(labels, definition);
        definition.subtypes = labels;
    }
}

const types = new TypeDefinitionTree();

types.define(
    ["key", "key"],
    class Binding_KeyToKey extends Binding {
        constructor (parent, from, to) {
            super(parent);
            this.from = from;
            this.to = to;
        }

        sync () {
            super.sync();
            const value = this.from.object[this.from.key];
            if (value !== undefined)
                this.to.object[this.to.key] = value;
        }
    });

types.define(
    ["storage", "storage"],
    class Binding_StorageToStorage extends BindingGroup {
        constructor (parent, from, to) {
            super(parent);
            const sourceStorage = from.storage;
            const keys = from.keys;
            const destinationStorage = to.storage;
            const binding = this;
            binding.sourceStorage = sourceStorage;
            binding.destinationStorage = destinationStorage;
            binding.keys = keys;
            const keyToBinding = {};
            binding.keyToBinding = keyToBinding;
            const keyToKey = types.find(["key", "key"]);
            for (const key of keys) {
                const child = new keyToKey(binding,
                                           {
                                               object: sourceStorage,
                                               key: key
                                           },
                                           {
                                               object: destinationStorage,
                                               key: key
                                           });
                keyToBinding[key] = child;
                binding.addChild(child);
            }
            binding.listener = function (event) {
                if (event.detail.storage === sourceStorage)
                    keyToBinding[event.detail.key]?.sync();

            };
            window.addEventListener("HexstreamSoft.storage", binding.listener);
        }

    });

types.define(
    ["storage", "node"],
    class Binding_StorageToNode extends Binding {
        constructor (parent, from, to) {
            super(parent);
            this.from = from;
            this.to = to;
        }

        sync () {
            const storage = this.from.storage;
            const key = this.from.key;
            const node = this.to.node;
            const value = storage[key];
            if (node.matches("input")) {
                node.disabled = storage.isRelevant ? !storage.isRelevant(key) : false;
                if (value !== undefined)
                    node.checked = value === node.dataset.stateValue;
            }
            else
                if (value !== undefined)
                    node.textContent = value;
        }

    });

function nodeStateDomainName (node) {
    return node.closest("[data-state-domain]")?.dataset.stateDomain;
}

class Selector {}

class DocumentSelector extends Selector {
    subtypes = ["document"];
    constructor (document, stateDomainName) {
        super();
        this.document = document;
        this.stateDomainName = stateDomainName;
    }
}

types.define(["embed", "storage", "selector", "document"],
            class Binding_StorageToSelector_Document extends BindingGroup {
                constructor(parent) {
                    super(parent);
                    this.from = parent.from;
                    this.to = parent.to;
                    const binding = this;
                    binding.keyToBindings = new KeyToValues();
                    const storage = parent.from.storage;
                    const selector = parent.to.selector;
                    const document = selector.document;
                    const stateDomainName = selector.stateDomainName;
                    const storageToNode = types.find(["storage", "node"]);
                    for (const node of document.querySelectorAll("input[type=radio], input[type=checkbox], var, span, td")) {
                        if (node.dataset.stateKey && nodeStateDomainName(node) === stateDomainName) {
                            const key = node.dataset.stateKey;
                            const value = binding.addChild(new storageToNode(binding,
                                                                             {
                                                                                 storage: storage,
                                                                                 key: key
                                                                             },
                                                                             {
                                                                                 node: node
                                                                             }));
                            binding.keyToBindings.addValue(key, value);
                        }
                    }
                    binding.storageListener = function (event) {
                        if (event.detail.storage === storage)
                            for (const subBinding of binding.keyToBindings.values(event.detail.key) || []) {
                                subBinding.sync();
                            }
                    };
                    binding.relevanceListener = function (event) {
                        if (event.detail.storage === storage)
                            binding.sync();
                    };
                    window.addEventListener("HexstreamSoft.storage", binding.storageListener);
                    window.addEventListener("HexstreamSoft.relevance", binding.relevanceListener);
                }
            });

types.define(
    ["storage", "selector"],
    class Binding_StorageToSelector extends BindingGroup {
        constructor (parent, from, to) {
            super(parent);
            this.from = from;
            this.to = to;
            const innerBindingClass = types.find(["embed"].concat(this.constructor.subtypes, this.to.selector.subtypes));
            this.addChild(new innerBindingClass(this));
        }
    });

types.define(
    ["node", "storage"],
    class Binding_NodeToStorage extends Binding {
        constructor (parent, from, to) {
            super(parent);
            this.from = from;
            this.to = to;
            this.clickListener = (event) => this.sync();
            from.node.addEventListener("click", this.clickListener);
        }

        sync () {
            const node = this.from.node;
            const dataset = node.dataset;
            if (node.checked || dataset.stateAntivalue)
                this.to.storage[this.to.key] = node.checked ? dataset.stateValue : dataset.stateAntivalue;
        }

    });

function maybeAutoValue (node, schema, key) {
    if (!node.matches("[type=checkbox]:not([data-state-value], [data-state-antivalue])"))
        return node;
    const possibleValues = schema.possibleValues(key);
    if (possibleValues.length !== 2)
        throw new Error (`Tried to autovalue for node ${node}, schema ${schema}, key ${key} but there are not exactly 2 possible values. Possible values: ${possibleValues}`);
    node.dataset.stateValue = possibleValues[0];
    node.dataset.stateAntivalue = possibleValues[1];
    return node;
}

types.define(["embed", "selector", "storage", "document"],
            class Binding_SelectorToStorage_Document extends BindingGroup {
                constructor(parent) {
                    super(parent);
                    this.from = parent.from;
                    this.to = parent.to;
                    const binding = this;
                    const selector = parent.from.selector;
                    const document = selector.document;
                    const stateDomainName = selector.stateDomainName;
                    const storage = parent.to.storage;
                    const nodeToStorage = types.find(["node", "storage"]);
                    for (const node of document.querySelectorAll("input[type=radio], input[type=checkbox]")) {
                        if (nodeStateDomainName(node) === stateDomainName) {
                            const key = node.dataset.stateKey;
                            maybeAutoValue(node, storage.schema, key);
                            if (node.dataset.stateValue)
                                binding.addChild(new nodeToStorage(binding,
                                                                   {
                                                                       node: node
                                                                   },
                                                                   {
                                                                       storage: storage,
                                                                       key: key
                                                                   }));
                        }
                    }
                }
            });

types.define(
    ["selector", "storage"],
    class Binding_SelectorToStorage extends BindingGroup {
        constructor (parent, from, to) {
            super(parent);
            this.from = from;
            this.to = to;
            const innerBindingClass = types.find(["embed"].concat(this.constructor.subtypes, this.from.selector.subtypes));
            this.addChild(new innerBindingClass(this));
        }
    });

types.define(
    ["storage", "token"],
    class Binding_StorageToToken extends Binding {
        constructor (parent, from, to) {
            super(parent);
            this.from = from;
            this.to = to;
            this.token = undefined;
        }

        sync () {
            const key = this.from.key;
            const oldToken = this.token;
            const newToken = this.getToken();
            if (newToken === oldToken)
                return;
            this.token = newToken;
            const tokenlist = this.to.tokenlist;
            if (oldToken !== undefined)
                tokenlist.remove(oldToken);
            if (newToken !== undefined)
                tokenlist.add(newToken);
        }

        getToken () {
            const storage = this.from.storage;
            const key = this.from.key;
            const relevant = storage.isRelevant?.(key) ?? true;
            return relevant ? key + "=" + storage[key] : undefined;
        }

    });

types.define(
    ["storage", "tokenlist"],
    class Binding_StorageToTokenlist extends BindingGroup {
        constructor (parent, from, to) {
            super(parent);
            const storage = from.storage;
            const tokenlist = to.tokenlist;
            const keys = from.keys;
            const binding = this;
            binding.storage = storage;
            binding.tokenlist = tokenlist;
            binding.keys = keys;
            const keyToBinding = {};
            binding.keyToBinding = keyToBinding;
            const storageToToken = types.find(["storage", "token"]);
            for (const key of keys) {
                const child = new storageToToken(binding,
                                                {
                                                    storage: storage,
                                                    key: key
                                                },
                                                {
                                                    tokenlist: tokenlist
                                                });
                keyToBinding[key] = child;
                binding.addChild(child);
            }
            const storageListener = function (event) {
                if (event.detail.storage === storage) {
                    const key = event.detail.key;
                    if (key === null)
                        binding.sync();
                    else
                        keyToBinding[key]?.sync();
                }
            };
            const relevanceListener = function (event) {
                const storage = binding.storage;
                const detail = event.detail;
                if (detail.storage === storage)
                    for (const key of detail.keys) {
                        keyToBinding[key]?.sync();
                    }
            };
            window.addEventListener("HexstreamSoft.storage", storageListener);
            window.addEventListener("HexstreamSoft.relevance", relevanceListener);
        }
    });

function compose (main, both, endpoint) {
    const composed = Object.assign({}, main);
    [both ?? {}, endpoint ?? {}].forEach(function (extra) {
        Object.keys(extra).forEach(function (key) {
            if (composed.hasOwnProperty(key))
                throw Error("Clash for property \"" + key + "\".\n" + {main: main, both: both, endpoint: endpoint});
            else
                composed[key] = extra[key];
        });
    });
    return composed;
};

types.define(
    [">"],
    class Binding_Unibind extends BindingGroup {
        constructor (parent, endpoints, sharedOptions) {
            super(parent);
            sharedOptions = sharedOptions ?? {};
            this.endpoints = endpoints;
            this.sharedOptions = sharedOptions ?? {};
            const typeDefinition = types.find(endpoints.map(endpoint => endpoint.type));
            const combinedFrom = compose(endpoints[0], sharedOptions.both, sharedOptions.source);
            const combinedTo = compose(endpoints[1], sharedOptions.both, sharedOptions.destination);
            this.addChild(new typeDefinition(this, combinedFrom, combinedTo));
        }
    });

const unibind = types.find([">"]);

types.define(
    ["="],
    class Binding_Bidibind extends BindingGroup {
        constructor (parent, endpoints, sharedOptions) {
            super(parent);
            this.endpoints = endpoints;
            this.sharedOptions = sharedOptions ?? {};
            this.addChild(new unibind(this, endpoints, sharedOptions));
            this.addChild(new unibind(this, endpoints.splice(0).reverse(), sharedOptions));
        }
    });

const bindings = new BindingGroup(null);

const typeNameToType = {
    [">"]: unibind,
    ["="]: types.find(["="])
};

function bind (combine, endpoints, sharedOptions) {
    let type = typeNameToType[combine];
    if (type) {
        const binding = new type(bindings, endpoints, sharedOptions);
        binding.sync();
        return binding;
    }
    else
        throw Error("Invalid combination type \"" + combine + "\".");
};
