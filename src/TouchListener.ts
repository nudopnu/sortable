import { DEFAULT_TOUCH_LISTENER_OPTIONS } from "./defaults";
import { AbstractStateEvent } from "./state-machine/StateEvent";
import { StateMachine } from "./state-machine/StateMachine";
import { TouchListenerOptions } from "./types";

class TouchMoveEvent extends AbstractStateEvent<TouchEvent> { name = "onTouchMove" }
class TouchStartEvent extends AbstractStateEvent<TouchEvent> { name = "onTouchStart" }
class TouchHoldEvent extends AbstractStateEvent<TouchEvent> { name = "onTouchHold" }
class TouchEndEvent extends AbstractStateEvent<TouchEvent> { name = "onTouchEnd" }

type TouchStates = 'Idle' | 'Touch' | 'Hold' | 'Drag' | 'Scroll';
type TouchStateEvents =
    | TouchMoveEvent
    | TouchStartEvent
    | TouchHoldEvent
    | TouchEndEvent
    ;

export class TouchListener {

    private stateMachine: StateMachine<TouchStates, TouchStateEvents>;
    private touchHoldTimeoutId?: number;

    constructor(element: HTMLElement, private options: TouchListenerOptions = {}) {
        this.options = {
            ...DEFAULT_TOUCH_LISTENER_OPTIONS,
            ...options,
        };
        this.stateMachine = this.initStateMachine();
        element.style.userSelect = 'none';
        element.addEventListener('touchmove', (event) => this.stateMachine.submit(new TouchMoveEvent(event)), false);
        element.addEventListener('touchstart', (event) => this.stateMachine.submit(new TouchStartEvent(event)));
        element.addEventListener('touchend', (event) => this.stateMachine.submit(new TouchEndEvent(event)));
    }

    private initStateMachine() {
        return new StateMachine<TouchStates, TouchStateEvents>({
            entryState: "Idle",
            states: {
                Idle: {
                    onTouchStart: (touchEvent) => { this.onTouchStart(touchEvent); return "Touch"; },
                },
                Touch: {
                    onTouchHold: (touchEvent) => { this.onHoldStart(touchEvent); return "Hold"; },
                    onTouchEnd: (touchEvent) => { this.onTap(touchEvent); return "Idle"; },
                    onTouchMove: (touchEvent) => { this.onScroll(touchEvent); return "Scroll"; },
                },
                Hold: {
                    onTouchEnd: (touchEvent) => { this.onHoldEnd(touchEvent); return "Idle"; },
                    onTouchMove: (touchEvent) => { this.onDragStart(touchEvent); return "Drag"; },
                },
                Drag: {
                    onTouchEnd: (touchEvent) => { this.onDragEnd(touchEvent); return "Idle"; },
                    onTouchMove: (touchEvent) => { this.onDrag(touchEvent); },
                },
                Scroll: {
                    onTouchEnd: () => "Idle",
                },
            }
        });
    }

    private onTouchStart(event: TouchEvent) {
        const { minTimeToHold } = this.options;
        const { touches } = event;
        if (touches.length !== 1) return;
        this.touchHoldTimeoutId = setTimeout(() => {
            this.stateMachine.submit(new TouchHoldEvent(event));
        }, minTimeToHold);
    }

    private onTap(event: TouchEvent) {
        const { onTap } = this.options;
        clearTimeout(this.touchHoldTimeoutId);
        onTap && onTap(event);
    }

    private onHoldStart(event: TouchEvent) {
        const { onHold } = this.options;
        onHold && onHold(event);
    }

    private onHoldEnd(event: TouchEvent) {
        const { onHoldRelease } = this.options;
        onHoldRelease && onHoldRelease(event);
    }

    private onDragStart(event: TouchEvent) {
        const { onDragStart } = this.options;
        event.preventDefault();
        onDragStart && onDragStart(event);
    }

    private onDrag(event: TouchEvent) {
        const { onDrag } = this.options;
        event.preventDefault();
        onDrag && onDrag(event);
    }

    private onDragEnd(event: TouchEvent) {
        const { onDragEnd } = this.options;
        onDragEnd && onDragEnd(event);
    }

    private onScroll(event: TouchEvent) {
        const { onScroll } = this.options;
        event.preventDefault();
        onScroll && onScroll(event);
    }

}