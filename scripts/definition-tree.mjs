export {
    DefinitionTree
};

class DefinitionTree {
    definitions = {};

    define (labels, definition) {
        const name = labels;
        labels = labels.slice();
        let table = this.definitions;
        while (labels.length > 1)
        {
            const label = labels.shift();
            const oldTable = table;
            table = table[label];
            if (table === undefined)
                oldTable[label] = table = {};
        }

        const lastLabel = labels[0];

        if (table[lastLabel])
            throw new Error(`Duplicate definition ${name}.`);
        table[lastLabel] = definition;
    }

    find (labels) {
        let value = this.definitions;
        for (const label of labels) {
            value = value[label];
        }
        return value;
    }

}
