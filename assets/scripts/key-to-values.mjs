export {
    KeyToValues
};

class KeyToValues {
    map = {};

    addValue (key, value) {
        const map = this.map;
        let values = map[key];
        if (!values) {
            values = [];
            map[key] = values;
        }
        values.push(value);
        return value;
    }

    values (key) {
        return this.map[key];
    }
}
