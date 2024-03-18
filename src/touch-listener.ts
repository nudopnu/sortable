
const defaultOptions = {
    minTimeHold: 300,
    minDistance: 10,
};

export class TouchListener {

    private lastTouch: Touch | undefined;
    private touchState: 'idle' | 'touch' | 'hold' | 'drag' | 'scroll' = 'idle';

    constructor(element: HTMLElement, private options: {
        minTimeToHold?: number,
        onTap?: (event: TouchEvent) => void,
        onHold?: (event: TouchEvent) => void,
        onDragStart?: (event: TouchEvent) => void,
        onDrag?: (event: TouchEvent) => void,
        onDragEnd?: (event: TouchEvent) => void,
        onScroll?: (event: TouchEvent) => void,
        onHoldRelease?: (event: TouchEvent) => void,
    } = {}) {
        this.options = {
            ...defaultOptions,
            ...options,
        };
        element.style.userSelect = 'none';
        element.addEventListener('touchmove', (event) => this.onTouchMove(event), false);
        element.addEventListener('touchstart', (event) => this.onTouchStart(event));
        element.addEventListener('touchend', (event) => this.onTouchend(event));
    }

    private onTouchend(event: TouchEvent) {
        const { onTap, onHoldRelease, onDragEnd } = this.options;
        if (this.touchState === 'touch') {
            onTap && onTap(event);
        } else if (this.touchState === 'hold') {
            onHoldRelease && onHoldRelease(event);
        } else if (this.touchState === 'drag') {
            onDragEnd && onDragEnd(event);
        }
        this.touchState = 'idle';
    }

    private onTouchStart(event: TouchEvent) {
        const { onHold, minTimeToHold: minTimeHold } = this.options;
        const { touches } = event;
        if (touches.length !== 1) return;
        this.lastTouch = event.touches[0];
        this.touchState = 'touch';
        setTimeout(() => {
            if (this.touchState === 'touch') {
                this.touchState = 'hold';
                onHold && onHold(event);
            }
        }, minTimeHold);
    }

    private onTouchMove(event: TouchEvent) {
        const { onScroll, onDragStart, onDrag } = this.options;
        if (this.touchState === 'touch') {
            event.preventDefault();
            this.touchState = 'scroll';
            onScroll && onScroll(event);
        } else if (this.touchState === 'hold') {
            event.preventDefault();
            this.touchState = 'drag';
            onDragStart && onDragStart(event);
        } else if (this.touchState === 'drag') {
            event.preventDefault();
            onDrag && onDrag(event);
        }
    }
}