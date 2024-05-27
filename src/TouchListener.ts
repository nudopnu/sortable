import { DEFAULT_TOUCH_LISTENER_OPTIONS } from "./defaults";
import { AbstractStateEvent } from "./state-machine/StateEvent";
import { StateMachine } from "./state-machine/StateMachine";
import { TouchListenerOptions } from "./types";

namespace TouchListenerNamespace {
    export class TouchMoveEvent extends AbstractStateEvent<TouchEvent> { readonly name = "onTouchMove" }
    export class TouchStartEvent extends AbstractStateEvent<TouchEvent> { readonly name = "onTouchStart" }
    export class TouchHoldEvent extends AbstractStateEvent<TouchEvent> { readonly name = "onTouchHold" }
    export class TouchEndEvent extends AbstractStateEvent<TouchEvent> { readonly name = "onTouchEnd" }
    export type Events =
        | TouchMoveEvent
        | TouchStartEvent
        | TouchHoldEvent
        | TouchEndEvent
        ;
}

type TouchStates = 'Idle' | 'Touch' | 'Hold' | 'Drag' | 'Scroll';

export class TouchListener {

    stateMachine: StateMachine<TouchStates, TouchListenerNamespace.Events>;
    private touchHoldTimeoutId?: number;

    constructor(element: HTMLElement, private options: TouchListenerOptions = {}) {
        this.options = {
            ...DEFAULT_TOUCH_LISTENER_OPTIONS,
            ...options,
        };
        this.stateMachine = this.initStateMachine();
        this.setupListeners(element);
        element.style.userSelect = 'none';
    }

    private initStateMachine() {
        return new StateMachine<TouchStates, TouchListenerNamespace.Events>({
            entryState: "Idle",
            states: {
                Idle: {
                    onTouchStart: (touchEvent) => { this.startTouch(touchEvent); return "Touch"; },
                },
                Touch: {
                    onTouchHold: (touchEvent) => { this.startHold(touchEvent); return "Hold"; },
                    onTouchEnd: (touchEvent) => { this.tap(touchEvent); return "Idle"; },
                    onTouchMove: (touchEvent) => { this.scroll(touchEvent); return "Scroll"; },
                },
                Hold: {
                    onTouchEnd: (touchEvent) => { this.endHold(touchEvent); return "Idle"; },
                    onTouchMove: (touchEvent) => { this.startDrag(touchEvent); return "Drag"; },
                },
                Drag: {
                    onTouchEnd: (touchEvent) => { this.endDrag(touchEvent); return "Idle"; },
                    onTouchMove: (touchEvent) => { this.drag(touchEvent); },
                },
                Scroll: {
                    onTouchEnd: () => "Idle",
                },
            }
        });
    }

    private setupListeners(element: HTMLElement) {
        element.addEventListener('touchmove', (event) => this.stateMachine.submit(new TouchListenerNamespace.TouchMoveEvent(event)), false);
        element.addEventListener('touchstart', (event) => this.stateMachine.submit(new TouchListenerNamespace.TouchStartEvent(event)));
        element.addEventListener('touchend', (event) => this.stateMachine.submit(new TouchListenerNamespace.TouchEndEvent(event)));
    }

    private startTouch(event: TouchEvent) {
        const { minTimeToHold } = this.options;
        const { touches } = event;
        if (touches.length !== 1) return;
        this.touchHoldTimeoutId = setTimeout(() => {
            this.stateMachine.submit(new TouchListenerNamespace.TouchHoldEvent(event));
        }, minTimeToHold);
    }

    private tap(event: TouchEvent) {
        const { onTap } = this.options;
        clearTimeout(this.touchHoldTimeoutId);
        onTap && onTap(event);
    }

    private startHold(event: TouchEvent) {
        const { onHold } = this.options;
        onHold && onHold(event);
    }

    private endHold(event: TouchEvent) {
        const { onHoldRelease } = this.options;
        onHoldRelease && onHoldRelease(event);
    }

    private startDrag(event: TouchEvent) {
        const { onDragStart } = this.options;
        event.preventDefault();
        onDragStart && onDragStart(event);
    }

    private drag(event: TouchEvent) {
        const { onDrag } = this.options;
        event.preventDefault();
        onDrag && onDrag(event);
    }

    private endDrag(event: TouchEvent) {
        const { onDragEnd } = this.options;
        onDragEnd && onDragEnd(event);
    }

    private scroll(event: TouchEvent) {
        const { onScroll } = this.options;
        event.preventDefault();
        onScroll && onScroll(event);
    }

}