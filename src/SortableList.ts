import { Swapper } from "./Swapper";
import { getDefaultOptions } from "./defaults";
import { TouchListener } from "./TouchListener";
import { DataEntry, SortableListState, SortableOptions } from "./types";
import { SwapperModel } from "./Swapper.model";

export class SortableList<T> {

    private listState: SortableListState;
    selectedIds: number[];
    dataEntries: Map<number, DataEntry<T>>;
    ghostsParent: HTMLElement | undefined;
    originalHeight = -1;
    pivotId = -1;
    targetId = -1;
    swapper?: Swapper;
    model: SwapperModel;

    onSwapCompleteInternal: (() => void) | undefined;

    constructor(
        private rootElement: HTMLElement,
        private dataList: T[],
        private options: SortableOptions<T> = getDefaultOptions<T>(),
    ) {
        this.selectedIds = [];
        this.dataEntries = new Map();
        this.listState = 'idle';
        this.dataList.forEach((data, index) => this.initEntry(data, index));
        this.model = new SwapperModel(dataList.map((_, id) => id));
    }

    private initEntry(data: T, index: number) {
        // Create list item
        const element = this.createElement(data, index);
        const wrapper = this.createWrapper(index);
        wrapper.appendChild(element);
        this.rootElement.appendChild(wrapper);

        // Add logic
        const id = index;
        this.dataEntries.set(id, { data, wrapper, element });
        const { onScroll } = this.options;
        new TouchListener(wrapper, {
            onTap: (event) => this.onTap(index, event),
            onHold: (event) => this.onHold(index, event),
            onHoldRelease: (event) => this.onHoldRelease(event),
            onDragStart: (event) => this.onDragStart(index, event),
            onDrag: (event) => this.onDrag(event),
            onDragEnd: () => this.onDragEnd(),
            onScroll,
        });
    }

    private onDragStart(sourceElementId: number, event: TouchEvent) {
        this.listState = 'dragging';

        // Remember source element
        const currentId = sourceElementId;
        this.pivotId = currentId;
        this.originalHeight = this.dataEntries.get(currentId)!.wrapper.getBoundingClientRect().height;

        // Create ghostsParent at original item position
        const { wrapper } = this.dataEntries.get(currentId)!;
        const { x, y } = wrapper.getBoundingClientRect();

        this.ghostsParent = this.createGhostsParent(x, y);
        const { clientX, clientY } = event.touches[0];
        this.ghostsParent.style.left = `${clientX}px`;
        this.ghostsParent.style.top = `${clientY}px`;
        document.body.appendChild(this.ghostsParent);

        this.selectedIds.forEach(id => {
            // Create ghost as child of ghostsParent
            const dataEntry = this.dataEntries.get(id)!;
            const { wrapper } = dataEntry;
            const { x, y, height } = wrapper.getBoundingClientRect();
            const ghost = this.createGhostFromWrapper(wrapper, x, y);
            dataEntry.ghost = ghost;

            // Prepare list item to be hidden
            wrapper.style.maxHeight = `${height}px`;

            setTimeout(() => {
                // Visually exclude all list items from the list except for the one where the drag was initiated
                if (id !== currentId) {
                    wrapper.style.maxHeight = '0';
                }
                // Let each ghost fly to ghostsParent
                ghost.style.top = '0';
                ghost.style.left = '0';
            }, 10);
        });

        // Delegate event
        const { onDragStart } = this.options;
        onDragStart && onDragStart(event);
    }

    private async onDrag(event: TouchEvent) {
        let element: HTMLElement | undefined;
        requestAnimationFrame(() => {

            // Only prepare for next swap if state is 'dragging'
            if (this.listState !== 'dragging') return;

            // shouldn't happen:
            if (!this.ghostsParent) throw new Error("No GhostsParent found!");

            // Update ghostsParent's position
            const { clientX, clientY } = event.touches[0];
            this.ghostsParent.style.top = `${clientY}px`;
            this.ghostsParent.style.left = `${clientX}px`;

            // Get hovered element as possible swap target
            const elements = (document.elementsFromPoint(clientX, clientY) as HTMLElement[])
                .filter(element => element.className === 'wrapper');
            if (elements.length !== 1) return;
            element = elements[0];

            const hoverId = parseInt(element.id);
            this.targetId = hoverId;

            const placeHolderSrcPosition = this.model.getPosition(this.pivotId);
            const hoverPosition = this.model.getPosition(hoverId);

            const otherIds = (placeHolderSrcPosition > hoverPosition ?
                this.model.getRange(hoverId, this.pivotId) :
                this.model.getRange(this.pivotId, hoverId))
                .filter(id => id !== this.pivotId);

            otherIds.forEach(id => {
                this.dataEntries.get(id)!.wrapper.style.color = 'red';
            });

            const pivot = this.dataEntries.get(this.pivotId)!;
            const others = otherIds.map(id => this.dataEntries.get(id)!);
            if (hoverPosition > placeHolderSrcPosition) {
                // element.style.backgroundColor = 'blue';
                this.listState = 'swapstart';
                this.swapper = new Swapper(pivot.wrapper, others.map(entry => entry.wrapper));
            } else if (hoverPosition < placeHolderSrcPosition) {
                // element.style.backgroundColor = 'green';
                this.listState = 'swapstart';
                this.swapper = new Swapper(pivot.wrapper, others.map(entry => entry.wrapper));
            } else {
                console.log("Same position");

            }
        });
        if (this.listState === 'swapstart') {
            const { onSwapStart, onSwapEnd } = this.options;
            onSwapStart && onSwapStart();
            this.listState = 'swap';
            await new Promise(resolve => requestAnimationFrame(resolve));
            await this.swapper!.swap();
            await new Promise(resolve => setTimeout(resolve, 300));

            // swap positions
            console.log(`swapping ${this.selectedIds} with ${this.targetId}`, this.selectedIds);
            this.model.swapWithPivot(this.selectedIds, this.targetId, { pivotId: this.pivotId });

            // remember new source id
            this.listState = 'dragging';

            onSwapEnd && onSwapEnd();
            console.log(this.model.ids, this.model.ids.map(id => this.dataEntries.get(id)!.data).join());
        }
    }

    private onDragEnd() {
        this.listState = 'idle';
        this.ghostsParent?.remove();
        this.selectedIds.forEach(id => this.deselect(id));
        const { onSwap } = this.options;
        onSwap && onSwap(this.selectedIds.map(id => this.dataEntries.get(id)!), this.dataEntries.get(this.targetId)!);
    }

    private onHoldRelease(event: TouchEvent) {
        const { onHoldRelease } = this.options;
        event.preventDefault();
        onHoldRelease && onHoldRelease(event);
    }

    private onHold(index: number, event: TouchEvent) {
        console.log(index, (event.target as HTMLElement).parentElement!.id);

        this.listState = 'selecting';
        this.select(index);
        const { onHold } = this.options;
        onHold && onHold(event);
    }

    private onTap(sourceElementId: number, event: TouchEvent) {
        console.log(this.dataEntries.get(sourceElementId));

        const { onTap } = this.options;
        if (this.listState === 'selecting') {
            this.toggleSelection(sourceElementId);
        }
        onTap && onTap(event);
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

    private createGhostFromWrapper(wrapper: HTMLElement, x: number, y: number) {
        const { animationDuration } = this.options;
        // Calculate relative distance to ghosts parent
        const { x: parentX, y: parentY } = this.ghostsParent!.getBoundingClientRect();
        const deltaY = y - parentY;
        const deltaX = x - parentX;

        // Create ghost as child of ghostsParent
        const ghost = wrapper.cloneNode(true) as HTMLElement;
        this.ghostsParent!.appendChild(ghost);
        ghost.className = 'ghost';
        ghost.style.userSelect = 'none';
        ghost.style.position = 'absolute';
        ghost.style.top = `${deltaY}px`;
        ghost.style.left = `${deltaX}px`;
        ghost.style.transition = `top ${animationDuration}ms ease, left ${animationDuration}ms ease`;
        return ghost;
    }

    toggleSelection(id: number) {
        const isSelected = this.selectedIds.indexOf(id) !== -1;
        if (isSelected) {
            this.deselect(id);
        } else {
            this.select(id);
        }
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
        if (this.selectedIds.length !== 0) return;
        this.listState = 'idle';
    }

}