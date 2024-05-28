import { Swapper } from "./Swapper";
import { AbstractStateEvent } from "./state-machine/StateEvent";

export namespace SortableListStateMachine {
    export type States = 'Idle' | 'Selecting' | 'Dragging' | 'Swapping';
    export class TapEvent extends AbstractStateEvent<{ index: number; touchEvent: TouchEvent; }> { readonly name = "onTap"; };
    export class HoldEvent extends AbstractStateEvent<{ index: number; touchEvent: TouchEvent; }> { readonly name = "onHold"; };
    export class HoldReleaseEvent extends AbstractStateEvent<{ index: number; touchEvent: TouchEvent; }> { readonly name = "onHoldRelease"; };
    export class DragStartEvent extends AbstractStateEvent<{ index: number; touchEvent: TouchEvent; }> { readonly name = "onDragStart"; };
    export class DragEvent extends AbstractStateEvent<{ index: number; touchEvent: TouchEvent; }> { readonly name = "onDrag"; };
    export class DragEndEvent extends AbstractStateEvent<{ index: number; touchEvent: TouchEvent; }> { readonly name = "onDragEnd"; };
    export class SwapStartEvent extends AbstractStateEvent<{ swapper: Swapper; pivotId: number; targetId: number; touchEvent: TouchEvent; }> { readonly name = "onSwapStart"; };
    export class SwapEndEvent extends AbstractStateEvent<{ index: number; touchEvent: TouchEvent; }> { readonly name = "onSwapEnd"; };
    export class ScrollEvent extends AbstractStateEvent<{ index: number; touchEvent: TouchEvent; }> { readonly name = "onScroll"; };
    export type Events = TapEvent |
        HoldEvent |
        HoldReleaseEvent |
        DragStartEvent |
        DragEvent |
        DragEndEvent |
        SwapStartEvent |
        SwapEndEvent |
        ScrollEvent;
}
