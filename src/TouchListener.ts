import { TouchListenerOptions, TouchListenerState } from "./types";
import { DEFAULT_TOUCH_LISTENER_OPTIONS } from "./defaults";


export class TouchListener {

    private touchState: TouchListenerState = 'idle';

    constructor(element: HTMLElement, private options: TouchListenerOptions = {}) {
        this.options = {
            ...DEFAULT_TOUCH_LISTENER_OPTIONS,
            ...options,
        };
        element.style.userSelect = 'none';
        element.addEventListener('touchmove', (event) => this.onTouchMove(event), false);
        element.addEventListener('touchstart', (event) => this.onTouchStart(event));
        element.addEventListener('touchend', (event) => this.onTouchend(event));
        // element.addEventListener('pointermove', (event) => console.log);
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