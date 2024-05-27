export function euclideanTouchDistance(a: Touch, b: Touch) {
    const dx = b.clientX - a.clientX;
    const dy = b.clientY - a.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

export class TwoWayMap<K, V> {

    map: Map<K, V>;
    reverseMap: Map<V, K>;

    constructor() {
        this.map = new Map<K, V>();
        this.reverseMap = new Map<V, K>();
    }

    keys() {
        return this.map.keys();
    }

    values() {
        return this.reverseMap.keys();
    }

    set(key: K, value: V) {
        this.map.set(key, value);
        this.reverseMap.set(value, key);
    }

    get(key: K) {
        return this.map.get(key);
    }

    reverseGet(key: V) {
        return this.reverseMap.get(key);
    }
}

export function createListElement(innerText: string) {
    const element = document.createElement('div');
    element.innerText = innerText;
    element.style.height = "50px";
    element.style.width = "50px";
    element.style.marginBottom = "10px";
    element.style.border = "1px solid grey";
    element.style.textAlign = "center";
    element.style.backgroundColor = "#fffa";
    return element;
}