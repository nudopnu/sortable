
export class PlaceHolder {

    element: HTMLElement;

    constructor(
        private targetWidth: number,
        private targetHeight: number,
        public collapsed = false,
        private animationDuration = 300
    ) {
        this.element = document.createElement('div');
        this.element.className = 'placeholder';
        this.element.style.position = 'relative';
        this.element.style.transition = `min-width ${this.animationDuration}ms ease, min-height ${this.animationDuration}ms ease`;
        if (collapsed) return;
        this.uncollapse();
    }

    uncollapse() {
        this.element.style.minWidth = `${this.targetWidth}px`;
        this.element.style.minHeight = `${this.targetHeight}px`;
    }

    collapse() {
        this.element.style.minWidth = '0';
        this.element.style.minHeight = '0';
    }

    destroy() {
        this.element.remove();
    }

}
