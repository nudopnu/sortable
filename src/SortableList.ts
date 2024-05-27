import { Swapper } from "./Swapper";
import { SwapperModel } from "./Swapper.model";
import { TouchListener } from "./TouchListener";
import { getDefaultOptions } from "./defaults";
import { AbstractStateEvent } from "./state-machine/StateEvent";
import { StateMachine } from "./state-machine/StateMachine";
import { DataEntry, SortableOptions } from "./types";

namespace SL {
    export type States = 'Idle' | 'Selecting' | 'Dragging' | 'Swapping';
    export class TapEvent extends AbstractStateEvent<{ index: number, touchEvent: TouchEvent }> { readonly name = "onTap" };
    export class HoldEvent extends AbstractStateEvent<{ index: number, touchEvent: TouchEvent }> { readonly name = "onHold" };
    export class HoldReleaseEvent extends AbstractStateEvent<{ index: number, touchEvent: TouchEvent }> { readonly name = "onHoldRelease" };
    export class DragStartEvent extends AbstractStateEvent<{ index: number, touchEvent: TouchEvent }> { readonly name = "onDragStart" };
    export class DragEvent extends AbstractStateEvent<{ index: number, touchEvent: TouchEvent }> { readonly name = "onDrag" };
    export class DragEndEvent extends AbstractStateEvent<{ index: number, touchEvent: TouchEvent }> { readonly name = "onDragEnd" };
    export class SwapStartEvent extends AbstractStateEvent<{ swapper: Swapper, swapperModel: SwapperModel, pivotId: number, targetId: number }> { readonly name = "onSwapStart" };
    export class SwapEndEvent extends AbstractStateEvent<{ swapperModel: SwapperModel }> { readonly name = "onSwapEnd" };
    export class ScrollEvent extends AbstractStateEvent<{ index: number, touchEvent: TouchEvent }> { readonly name = "onScroll" };
    export type Events =
        | TapEvent
        | HoldEvent
        | HoldReleaseEvent
        | DragStartEvent
        | DragEvent
        | DragEndEvent
        | SwapStartEvent
        | SwapEndEvent
        | ScrollEvent
        ;
}

export class SortableList<T> {

    stateMachine: StateMachine<SL.States, SL.Events>;
    selectedIds: number[];
    dataEntries: Map<number, DataEntry<T>>;
    swapData?: {
        pivotId: number;
        originalHeightOfPivot: number;
        ghostsParent: HTMLElement;
    }
    animationFrameRequest: number | undefined;

    constructor(
        private rootElement: HTMLElement,
        private dataList: T[],
        private options: SortableOptions<T> = getDefaultOptions<T>(),
    ) {
        this.selectedIds = [];
        this.dataEntries = new Map();
        this.dataList.forEach((data, index) => this.initEntry(data, index));
        this.stateMachine = new StateMachine<SL.States, SL.Events>({
            entryState: "Idle",
            states: {
                Idle: {
                    onTap: ({ index, touchEvent }) => { this.tap(index, touchEvent); },
                    onHold: ({ index, touchEvent }) => { this.startSelecting(index, touchEvent); return "Selecting"; },
                    onDragStart: ({ index, touchEvent }) => { this.startDragging(index, touchEvent); return "Dragging"; },
                },
                Selecting: {
                    onTap: ({ index, touchEvent }) => { this.toggleSelection(index, touchEvent); if (this.selectedIds.length === 0) return "Idle"; },
                    onDragStart: ({ index, touchEvent }) => { this.startDragging(index, touchEvent); return "Dragging"; },
                },
                Dragging: {
                    onDrag: ({ touchEvent }) => { this.drag(touchEvent) },
                    onSwapStart: ({ swapper, swapperModel, pivotId, targetId }) => { this.startSwap(swapper, swapperModel, pivotId, targetId); return "Swapping" },
                    onDragEnd: () => { this.endDrag(); return "Idle" }
                },
                Swapping: {
                    onSwapEnd: () => { this.endSwap(); return "Dragging" },
                    onDragEnd: () => { this.endDrag(); return "Idle" }
                },
            }
        });
    }

    private initEntry(data: T, index: number) {
        // Create list item
        const element = this.createElement(data, index);
        const wrapper = this.createWrapper(index);
        wrapper.appendChild(element);
        this.rootElement.appendChild(wrapper);

        // Add listeners
        const id = index;
        this.dataEntries.set(id, { data, wrapper, element });
        const { onScroll } = this.options;
        new TouchListener(wrapper, {
            onTap: (touchEvent) => this.stateMachine.submit(new SL.TapEvent({ index, touchEvent })),
            onHold: (touchEvent) => this.stateMachine.submit(new SL.HoldEvent({ index, touchEvent })),
            onHoldRelease: (touchEvent) => this.stateMachine.submit(new SL.HoldReleaseEvent({ index, touchEvent })),
            onDragStart: (touchEvent) => this.stateMachine.submit(new SL.DragStartEvent({ index, touchEvent })),
            onDrag: (touchEvent) => this.stateMachine.submit(new SL.DragEvent({ index, touchEvent })),
            onDragEnd: (touchEvent) => this.stateMachine.submit(new SL.DragEndEvent({ index, touchEvent })),
            onScroll,
        });
    }

    private tap(id: number, event: TouchEvent) {
        const { onTap } = this.options;
        onTap && onTap(event);
    }

    private toggleSelection(id: number, event: TouchEvent) {
        const isSelected = this.selectedIds.indexOf(id) !== -1;
        if (isSelected) {
            this.deselect(id);
        } else {
            this.select(id);
        }
        const { onTap } = this.options;
        onTap && onTap(event);
    }

    private startSelecting(index: number, event: TouchEvent) {
        this.select(index);
        const { onHold } = this.options;
        onHold && onHold(event);
    }

    private async startDragging(index: number, touchEvent: TouchEvent) {

        // Remember source element
        const currentId = index;
        const pivotId = currentId;
        const originalHeight = this.dataEntries.get(currentId)!.wrapper.getBoundingClientRect().height;

        // Create ghostsParent at original item position
        const { wrapper } = this.dataEntries.get(currentId)!;
        const { x, y } = wrapper.getBoundingClientRect();

        const ghostsParent = this.createGhostsParent(x, y);
        const { clientX, clientY } = touchEvent.touches[0];
        ghostsParent.style.left = `${clientX}px`;
        ghostsParent.style.top = `${clientY}px`;
        document.body.appendChild(ghostsParent);

        this.swapData = {
            pivotId,
            originalHeightOfPivot: originalHeight,
            ghostsParent,
        };

        await Promise.all(
            this.selectedIds.map(id => new Promise<void>((resolve) => {
                // Create ghost as child of ghostsParent
                const dataEntry = this.dataEntries.get(id)!;
                const { wrapper } = dataEntry;
                const { x, y, height } = wrapper.getBoundingClientRect();
                const ghost = this.createGhostFromWrapper(ghostsParent, wrapper, x, y);
                ghostsParent.appendChild(ghost);
                dataEntry.ghost = ghost;

                // Prepare list item to be hidden
                wrapper.style.maxHeight = `${height}px`;

                let transitionCount = 0;
                let transitionElements = [wrapper, ghost];
                setTimeout(() => {
                    // Let each ghost fly to ghostsParent
                    ghost.addEventListener('transitionend', transitionEnded);
                    ghost.style.top = '0';
                    ghost.style.left = '0';
                    // Visually exclude all list items from the list except for the one where the drag was initiated
                    if (id === currentId) return;
                    wrapper.addEventListener('transitionend', transitionEnded);
                    wrapper.style.maxHeight = '0';
                }, 10);
                function transitionEnded() {
                    transitionCount++; // Increment the count of completed transitions
                    if (transitionCount >= transitionElements.length) {
                        resolve(); // Call the function when all transitions are complete
                    }
                }
            }))
        );

        // Delegate event
        const { onDragStart } = this.options;
        onDragStart && onDragStart(touchEvent);
    }

    private async drag(event: TouchEvent) {
        let element: HTMLElement | undefined;
        if (this.animationFrameRequest) {
            cancelAnimationFrame(this.animationFrameRequest);
        }
        const swapperModel = new SwapperModel(this.dataList.map((_, id) => id));

        this.animationFrameRequest = requestAnimationFrame(() => {

            // shouldn't happen:
            if (!this.swapData) throw new Error("No SwapData found!");

            const { ghostsParent, pivotId } = this.swapData;

            // Update ghostsParent's position
            const { clientX, clientY } = event.touches[0];
            ghostsParent.style.top = `${clientY}px`;
            ghostsParent.style.left = `${clientX}px`;

            // Get hovered element as possible swap target
            const elements = (document.elementsFromPoint(clientX, clientY) as HTMLElement[])
                .filter(element => element.className === 'wrapper');
            if (elements.length !== 1) return;
            element = elements[0];
            const hoverId = parseInt(element.id);
            const targetId = hoverId;

            const placeHolderSrcPosition = swapperModel.getPosition(pivotId);
            const hoverPosition = swapperModel.getPosition(hoverId);

            const otherIds = (placeHolderSrcPosition > hoverPosition ?
                swapperModel.getRange(hoverId, pivotId) :
                swapperModel.getRange(pivotId, hoverId))
                .filter(id => id !== pivotId);

            otherIds.forEach(id => {
                this.dataEntries.get(id)!.wrapper.style.color = 'red';
            });

            const pivot = this.dataEntries.get(pivotId)!;
            const others = otherIds.map(id => this.dataEntries.get(id)!);
            if (hoverPosition === placeHolderSrcPosition) return;
            const swapper = new Swapper(pivot.wrapper, others.map(entry => entry.wrapper));
            this.stateMachine.submit(new SL.SwapStartEvent({ swapper, targetId, pivotId, swapperModel }));
        });
    }

    private async startSwap(swapper: Swapper, swapperModel: SwapperModel, pivotId: number, targetId: number) {
        const { onSwapStart, onSwapEnd } = this.options;
        onSwapStart && onSwapStart();
        await new Promise(resolve => requestAnimationFrame(resolve));
        await swapper.swap();
        await new Promise(resolve => setTimeout(resolve, 300));

        // swap positions
        console.log(`swapping ${this.selectedIds} with ${targetId}`, this.selectedIds);
        swapperModel.swapWithPivot(this.selectedIds, targetId, { pivotId: pivotId });

        this.stateMachine.submit(new SL.SwapEndEvent({ swapperModel }));
    }

    private endSwap() {
        const { onSwapEnd } = this.options;
        onSwapEnd && onSwapEnd();
    }

    private endDrag() {
        if (!this.swapData) throw new Error();
        const { ghostsParent } = this.swapData;
        ghostsParent.remove();
        this.selectedIds.forEach(id => this.deselect(id));
    }

    private onHoldRelease(event: TouchEvent) {
        const { onHoldRelease } = this.options;
        event.preventDefault();
        onHoldRelease && onHoldRelease(event);
    }

    private createElement(data: T, idx: number) {
        const { render, animationDuration } = this.options;
        const element = render(data, idx);
        element.style.transition = `transform ${animationDuration}ms ease`;
        element.style.userSelect = 'none';
        return element
    }

    private createWrapper(id: number) {
        const { animationDuration } = this.options;
        const wrapper = document.createElement('div');
        wrapper.className = 'wrapper';
        wrapper.style.transition = `max-height ${animationDuration}ms ease, background-color ${animationDuration}ms ease`;
        wrapper.style.overflow = 'hidden';
        wrapper.id = `${id}`;
        return wrapper;
    }

    private createGhostsParent(x: number, y: number) {
        const ghostsParent = document.createElement('div');
        ghostsParent.className = 'ghosts-aparent';
        ghostsParent.style.position = 'fixed';
        ghostsParent.style.top = `${y} px`;
        ghostsParent.style.left = `${x} px`;
        ghostsParent.style.transition = 'top 100ms ease, left 100ms ease';

        // ghostsParent.style.backgroundColor = 'red';
        // ghostsParent.style.width = '10px';
        // ghostsParent.style.height = '10px';
        // ghostsParent.style.pointerEvents = 'none';
        // ghostsParent.style.userSelect = 'none';
        // console.log(ghostsParent);

        return ghostsParent;
    }

    private createGhostFromWrapper(ghostsParent: HTMLElement, wrapper: HTMLElement, x: number, y: number) {
        const { animationDuration } = this.options;
        // Calculate relative distance to ghosts parent
        const { x: parentX, y: parentY } = ghostsParent.getBoundingClientRect();
        const deltaY = y - parentY;
        const deltaX = x - parentX;

        // Create ghost as child of ghostsParent
        const ghost = wrapper.cloneNode(true) as HTMLElement;
        ghost.className = 'ghost';
        ghost.style.userSelect = 'none';
        ghost.style.position = 'absolute';
        ghost.style.top = `${deltaY}px`;
        ghost.style.left = `${deltaX}px`;
        ghost.style.transition = `top ${animationDuration}ms ease, left ${animationDuration}ms ease`;
        return ghost;
    }

    select(id: number) {
        const isAlreadySelected = this.selectedIds.includes(id);
        if (isAlreadySelected) return;
        this.selectedIds.push(id);
        this.dataEntries.get(id)!.element.style.transform = 'scale(0.8)';
    }

    deselect(id: number) {
        this.selectedIds = [...this.selectedIds.filter(i => i !== id)];
        this.dataEntries.get(id)!.element.style.transform = 'scale(1)';
    }

}