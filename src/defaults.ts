import { SortableOptions, TouchListenerOptions } from "./types";

export const DEFAULT_TOUCH_LISTENER_OPTIONS: TouchListenerOptions = {
    minTimeToHold: 300,
};

export function getDefaultOptions<T>(): SortableOptions<T> {
    return {
        animationDuration: 300,
        render: (data) => {
            const element = document.createElement('div');
            element.innerText = JSON.stringify(data);
            element.style.height = "50px";
            element.style.width = "50px";
            element.style.marginBottom = "10px";
            element.style.border = "1px solid grey";
            element.style.textAlign = "center";
            element.style.backgroundColor = "#fffa";
            return element;
        }
    };
};