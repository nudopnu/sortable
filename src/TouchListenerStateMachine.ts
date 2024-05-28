import { AbstractStateEvent } from "./state-machine/StateEvent";

export namespace TouchListenerStateMachine {
    export class TouchMoveEvent extends AbstractStateEvent<TouchEvent> { readonly name = "onTouchMove"; }
    export class TouchStartEvent extends AbstractStateEvent<TouchEvent> { readonly name = "onTouchStart"; }
    export class TouchHoldEvent extends AbstractStateEvent<TouchEvent> { readonly name = "onTouchHold"; }
    export class TouchEndEvent extends AbstractStateEvent<TouchEvent> { readonly name = "onTouchEnd"; }
    export type Events = TouchMoveEvent |
        TouchStartEvent |
        TouchHoldEvent |
        TouchEndEvent;
    export type States = 'Idle' | 'Touch' | 'Hold' | 'Drag' | 'Scroll';
}
