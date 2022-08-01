export {
    StateDomainSchema,
    StateDomain
};

class StateDomainSchema {

    constructor (properties) {
        const keys = Object.keys(properties);
        this.properties = properties;
        this.keys = keys;
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
        const possibleValues = this.possibleValues(key);
        return possibleValues ? possibleValues.indexOf(value) >= 0 : (this.valueValidator(key))(value);
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
