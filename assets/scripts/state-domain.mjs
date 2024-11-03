export {
    StateDomainSchema,
    StateDomain
};

const trueSpec = {
    possibleValues: ["show", "hide"]
};

const falseSpec = {
    possibleValues: ["show", "hide"],
    defaultValue: "hide"
};

function resolveSpec (spec) {
    if (spec === true)
        return trueSpec;
    else if (spec === false)
        return falseSpec;
    else
        return spec;
}

function makeValueResolver (spec) {
    spec = resolveSpec(spec);
    let base = spec.base;
    if (base !== undefined) {
        const innerResolver = makeValueResolver(base);
        return key => spec[key] ?? innerResolver(key);
    } else {
        return key => spec[key];
    }
}

class StateDomainSchema {

    constructor (propertySpecs) {
        const keys = Object.keys(propertySpecs);
        this.keys = keys;
        const properties = {};
        for (const key of keys) {
            const spec = propertySpecs[key];
            const resolveValue = makeValueResolver(spec);
            const props = {};
            function initHighLevelLowLevel (highLevelKey, lowLevelKey, eitherRequired, highLevelValueToLowLevelValue) {
                const highLevelValue = resolveValue(highLevelKey);
                if (highLevelValue)
                    props[highLevelKey] = highLevelValue;
                const lowLevelValue = resolveValue(lowLevelKey);
                if (lowLevelValue) {
                    if (highLevelValue)
                        throw new Error(`Cannot specify both ${highLevelKey} and ${lowLevelKey}.\nkey: ${key}\nSpec: ${spec}`);
                    else
                        props[lowLevelKey] = lowLevelValue;
                } else {
                    if (highLevelValue)
                        props[lowLevelKey] = highLevelValueToLowLevelValue(highLevelValue);
                    else if (eitherRequired)
                        throw new Error(`Must specify ${highLevelKey} or ${lowLevelKey}.\nkey: ${key}\nSpec: ${spec}`);
                }
                return [highLevelValue, lowLevelValue];
            }
            const [possibleValues] = initHighLevelLowLevel("possibleValues", "valueValidator", true,
                                                           possibleValues => value => possibleValues.indexOf(value) >= 0);
            const defaultValue = resolveValue("defaultValue");
            if (defaultValue !== undefined)
                props.defaultValue = defaultValue;
            else if (possibleValues)
                props.defaultValue = possibleValues[0];
            initHighLevelLowLevel("relevantIf", "computeRelevance", false, function (relevantIf) {
                const entries = Object.entries(relevantIf);
                return domain => entries.every(([key, value]) => domain[key] === value);
            });
            properties[key] = props;
        }
        this.properties = properties;
        this.varyingRelevanceKeys = this.keys.filter(key => !this.isAlwaysRelevant(key));
    }

    defaultValue (key) {
        const defaultValue = this.properties[key].defaultValue;
        if (defaultValue !== undefined)
            return defaultValue;
        else
            throw Error("No key named " + key + " in schema " + this + ".");
    }

    possibleValues (key) {
        return this.properties[key].possibleValues;
    }

    valueValidator (key) {
        return this.properties[key].valueValidator;
    }

    isAcceptableValue (key, value) {
        return (this.valueValidator(key))(value);
    }

    isAlwaysRelevant (key) {
        return !this.properties[key].computeRelevance;
    }
}

class StateDomain {
    constructor (schema) {
        const domain = this;
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
                                                  domain.propagateRelevance();
                                                  window.dispatchEvent(new CustomEvent("HexstreamSoft.storage",
                                                                                       {
                                                                                           cancelable: false,
                                                                                           bubbles: false,
                                                                                           detail:
                                                                                           {
                                                                                               storage: domain,
                                                                                               key: key,
                                                                                               oldValue: oldValue,
                                                                                               newValue: newValue
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
                                      get: () => domain.properties[key].value,
                                      enumerable: true
                                  });
        });
        domain.propagateRelevance();
    }

    // Private.
    propagateRelevance () {
        const domain = this;
        const schema = domain.schema;
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

    forEach (callback, thisArg) {
        this.schema.keys.forEach(key => callback.call(thisArg, key, this[key]));
    }

    isRelevant (key) {
        return this.properties[key].relevant;
    }

    reset (key) {
        const schema = this.schema;
        const defaultValue = schema.defaultValue(key);
        this[key] = defaultValue;
        return defaultValue;
    }

    resetAll () {
        this.schema.keys.forEach(this.reset, this);
    }
}
