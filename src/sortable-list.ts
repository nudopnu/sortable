import { getDefaultOptions } from "./defaults";
import { TouchListener } from "./touch-listener";
import { DataEntry, SortableListState, SortableOptions } from "./types";
import { TwoWayMap } from "./utils";


export class SortableList<T> {

    private listState: SortableListState;
    selectedIds: number[];
    dataEntries: DataEntry<T>[];
    ghostsParent: HTMLElement | undefined;
    originalHeight = -1;
    placeHolderSrcId = -1;
    placeHolderDstId = -1;
    dstPlacholder: HTMLElement | undefined;

    constructor(
        private rootElement: HTMLElement,
        private dataList: T[],
        private options: SortableOptions<T> = getDefaultOptions<T>(),
    ) {
        this.selectedIds = [];
        this.dataEntries = [];
        this.listState = 'idle';
        dataList.forEach((data, index) => this.initEntry(data, index));
    }

    private initEntry(data: T, index: number) {
        // Create list item
        const element = this.createElement(data, index);
        const wrapper = this.createWrapper(index);
        wrapper.appendChild(element);
        this.rootElement.appendChild(wrapper);

        // Add logic
        const id = index;
        const position = index;
        this.dataEntries.push({ id, data, wrapper, element, position });
        const { onTap, onHold, onHoldRelease, onDragStart, onDrag, onScroll, onSwap } = this.options;
        new TouchListener(wrapper, {
            onTap: (event) => {
                if (this.listState === 'selecting') {
                    this.toggleSelection(index);
                }
                onTap && onTap(event);
            },
            onHold: (event) => {
                this.listState = 'selecting';
                this.select(index);
                onHold && onHold(event);
            },
            onHoldRelease: (event) => {
                event.preventDefault();
                onHoldRelease && onHoldRelease(event);
            },
            onDragStart: (event) => {
                this.listState = 'dragging';

                // Remember source element
                const currentId = index;
                this.placeHolderSrcId = currentId;
                this.originalHeight = this.dataEntries[currentId].wrapper.getBoundingClientRect().height;

                // Create ghostsParent at original item position
                const { wrapper } = this.dataEntries[currentId];
                const { x, y } = wrapper.getBoundingClientRect();
                console.log(x, y);

                this.ghostsParent = this.createGhostsParent(x, y);
                const { clientX, clientY } = event.touches[0];
                this.ghostsParent.style.top = `${clientY}px`;
                this.ghostsParent.style.left = `${clientX}px`;
                document.body.appendChild(this.ghostsParent);

                this.selectedIds.forEach(id => {
                    // Create ghost as child of ghostsParent
                    const { wrapper } = this.dataEntries[id];
                    const { x, y, height } = wrapper.getBoundingClientRect();
                    const ghost = this.createGhostFromWrapper(wrapper, x, y);
                    this.dataEntries[id].ghost = ghost;

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
                onDragStart && onDragStart(event);
            },
            onDrag: (event) => {
                let element: HTMLElement | undefined;
                requestAnimationFrame(() => {

                    // shouldn't happen:
                    if (!this.ghostsParent) throw new Error("No GhostsParent found!");

                    // Update ghostsParent's position
                    const { clientX, clientY } = event.touches[0];
                    this.ghostsParent.style.top = `${clientY}px`;
                    this.ghostsParent.style.left = `${clientX}px`;

                    // Only prepare for next swap if state is 'dragging' or 'swapend'
                    if (this.listState !== 'dragging' && this.listState !== 'swapend') return;

                    // Get hovered element as possible swap target
                    const elements = (document.elementsFromPoint(clientX, clientY) as HTMLElement[])
                        .filter(element => element.className === 'wrapper');
                    if (elements.length !== 1) return;
                    element = elements[0];

                    if (this.listState === 'swapend') {
                        this.listState = 'dragging';
                        this.dstPlacholder!.style.minHeight = '-1px';
                        console.log(this.dstPlacholder);

                    };
                    const hoverId = parseInt(element.id);
                    this.placeHolderDstId = hoverId;
                    const placeHolderSrcPosition = this.dataEntries[this.placeHolderSrcId].position;
                    const hoverPosition = this.dataEntries[hoverId].position;

                    const startPosition = Math.min(placeHolderSrcPosition, hoverPosition);
                    const endPosition = Math.max(placeHolderSrcPosition, hoverPosition);

                    const entriesInBetween = this.dataEntries.filter((entry) => {
                        const { position } = entry;
                        return position >= startPosition && position <= endPosition;
                    });
                    entriesInBetween.forEach(entry => {
                        entry.wrapper.style.color = 'red';
                    });
                    this.dstPlacholder = document.createElement('div');
                    this.dstPlacholder.className = 'dst-placeholder';
                    this.dstPlacholder.style.minHeight = `-1`;
                    this.dstPlacholder.style.transition = 'min-height 300ms ease';
                    const lastEntry = this.dataEntries[hoverId].wrapper;

                    if (hoverPosition > placeHolderSrcPosition) {
                        element.style.backgroundColor = 'blue';
                        this.rootElement.insertBefore(this.dstPlacholder, lastEntry.nextSibling);
                        this.listState = 'swapstart';
                    } else if (hoverPosition < placeHolderSrcPosition) {
                        element.style.backgroundColor = 'green';
                        this.rootElement.insertBefore(this.dstPlacholder, lastEntry);
                        this.listState = 'swapstart';
                    }
                });
                if (this.listState === 'swapstart') {
                    this.listState = 'swap';
                    setTimeout(() => {
                        this.dstPlacholder!.style.minHeight = `${this.originalHeight}px`;
                        wrapper.style.maxHeight = '0px';
                        setTimeout(() => {
                            console.log('dhoens');
                            this.listState = 'swapend';
                        }, 300);

                    }, 100);
                }
            },
            onDragEnd: () => {
                this.listState = 'idle';
                this.dstPlacholder?.replaceWith(...this.selectedIds.map(id => this.dataEntries[id].wrapper));
                [...this.selectedIds].forEach(id => {
                    this.dataEntries[id].wrapper.style.maxHeight = id === this.placeHolderSrcId ? '' : this.dataEntries[id].ghost!.getBoundingClientRect().height + 'px';
                    this.dataEntries[id].ghost!.remove();
                    this.deselect(id);
                });
                this.ghostsParent?.remove();

                [...root.children].filter(element => element.className === 'wrapper').forEach((element, position) => {
                    this.dataEntries[parseInt(element.id)].position = position;
                });
                this.dataEntries.forEach((entry) => {
                    entry.element.innerText = `${entry.data} (${entry.position})`;
                    // entry.wrapper.style.color = 'black';
                    // entry.wrapper.style.backgroundColor = 'white';
                });
                onSwap && onSwap(this.selectedIds.map(id => this.dataEntries[id]), this.dataEntries[this.placeHolderDstId]);
            },
            onScroll,
        })
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
        const { animationDuration } = this.options
        const ghostsParent = document.createElement('div');
        ghostsParent.className = 'ghosts-aparent';
        ghostsParent.style.position = 'fixed';
        ghostsParent.style.top = `${y} px`;
        ghostsParent.style.left = `${x} px`;
        ghostsParent.style.transition = 'top 100ms ease, left 100ms ease';

        ghostsParent.style.backgroundColor = 'red';
        ghostsParent.style.width = '10px';
        ghostsParent.style.height = '10px';
        ghostsParent.style.pointerEvents = 'none';
        ghostsParent.style.userSelect = 'none';
        console.log(ghostsParent);

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
        this.selectedIds.sort((a, b) => this.dataEntries[a].position - this.dataEntries[b].position);
        this.dataEntries[id].element.style.transform = 'scale(0.8)';
    }

    deselect(id: number) {
        this.selectedIds = [...this.selectedIds.filter(i => i !== id)];
        this.dataEntries[id]!.element.style.transform = 'scale(1)';
        if (this.selectedIds.length !== 0) return;
        this.listState = 'idle';
    }

}

export class PlaceHolder {

    element: HTMLElement;

    constructor(
        private targetWidth: number,
        private targetHeight: number,
        public collapsed = false,
        private animationDuration = 300,
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


export class Swapper {

    private state: 'idle' | 'swapping' = 'idle';
    private pivotElementPosition: 'before' | 'after';
    private parent: HTMLElement;
    private childToIdx: TwoWayMap<HTMLElement, number>;

    constructor(private pivot: HTMLElement, private others: HTMLElement[]) {
        this.parent = pivot.parentElement!;
        this.childToIdx = new TwoWayMap<HTMLElement, number>();
        const allChildren = Array.from(this.parent.children);
        let minIdx, maxIdx;
        for (let idx = 0; idx < allChildren.length; idx++) {
            const element = allChildren[idx] as HTMLElement;
            this.childToIdx.set(element, idx);
        }
        for (let i = 0; i < others.length; i++) {
            const idx = this.childToIdx.get(others[i])!;
            if (!minIdx || minIdx > idx) minIdx = idx;
            if (!maxIdx || maxIdx < idx) maxIdx = idx;
        }
        const pivotIdx = this.childToIdx.get(pivot)!;
        pivot.className = 'pivot';
        this.pivotElementPosition = pivotIdx < minIdx! ? 'before' : 'after';
    }

    async swap() {
        this.state = 'swapping';
        const minIdx = Math.min(...this.others.map(elem => this.childToIdx.get(elem)!));
        const maxIdx = Math.max(...this.others.map(elem => this.childToIdx.get(elem)!));
        const startChild = this.childToIdx.reverseGet(minIdx)!;
        const endChild = this.childToIdx.reverseGet(maxIdx)!;
        const { top } = startChild.getBoundingClientRect();
        const { top: bottom } = endChild.nextElementSibling!.getBoundingClientRect();
        const frameHeight = bottom - top;
        const placeholderHeight = frameHeight / this.others.length;
        const framePlaceHolder = new PlaceHolder(1, frameHeight);
        const startPlaceHolder = new PlaceHolder(1, placeholderHeight);
        const endPlaceholder = new PlaceHolder(1, placeholderHeight);
        if (this.pivotElementPosition === 'before') {
            endPlaceholder.collapse();
        } else {
            startPlaceHolder.collapse();
        }
        framePlaceHolder.element.style.position = 'relative';
        framePlaceHolder.element.prepend(startPlaceHolder.element);
        const tops = this.others.map(element => element.getBoundingClientRect().top);
        this.others.forEach((element, idx) => {
            this.parent.removeChild(element);
            framePlaceHolder.element.appendChild(element);
            element.style.position = 'absolute';
            element.style.top = `${tops[idx] - top}px`;
        });
        this.parent.insertBefore(framePlaceHolder.element, this.pivot);
        this.parent.insertBefore(startPlaceHolder.element, framePlaceHolder.element);
        this.parent.insertBefore(endPlaceholder.element, this.pivot);
        this.parent.removeChild(this.pivot);
        this.pivot.style.position = 'absolute';
        this.pivot.style.transition = `top 300ms ease`;
        this.pivot.style.top = '0';
        if (this.pivotElementPosition === 'before') {
            startPlaceHolder.element.appendChild(this.pivot);
        } else {
            endPlaceholder.element.appendChild(this.pivot);
        }
        await new Promise(r => setTimeout(r, 300));
        if (this.pivotElementPosition === 'before') {
            startPlaceHolder.collapse();
            endPlaceholder.uncollapse();
            this.pivot.style.top = `${frameHeight}px`;
        } else {
            endPlaceholder.collapse();
            startPlaceHolder.uncollapse();
            this.pivot.style.top = `-${frameHeight + placeholderHeight}px`;
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        startPlaceHolder.destroy();
        endPlaceholder.destroy();
        this.pivot.style.position = 'static';

        if (this.pivotElementPosition === 'before') {
            this.others.forEach(element => {
                element.style.position = 'static';
                this.parent.insertBefore(element, framePlaceHolder.element)
            });
            this.parent.insertBefore(this.pivot, framePlaceHolder.element)
        } else {
            this.parent.insertBefore(this.pivot, framePlaceHolder.element)
            this.others.forEach(element => {
                element.style.position = 'static';
                this.parent.insertBefore(element, framePlaceHolder.element)
            });
        }

        framePlaceHolder.destroy();
        if (this.pivotElementPosition === 'before') {
            this.pivotElementPosition = 'after';
        } else {
            this.pivotElementPosition = 'before';
        }
        this.state = 'idle';
    }
}


// example setup
const data = ["A", "B", "C", "D", "E", "F", "G"];// "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
const root = document.querySelector('#sortable') as HTMLElement;
root.style.display = "inline-block";
root.style.overflowY = "scroll";
root.style.maxHeight = "300px";

const children = [] as HTMLElement[];
data.forEach((data, index) => {
    const element = document.createElement('div');
    element.innerText = `${data} (${index})`;
    element.style.height = "50px";
    element.style.width = "50px";
    element.style.marginBottom = "10px";
    element.style.border = "1px solid grey";
    element.style.textAlign = "center";
    element.style.backgroundColor = "#fffa"
    root.appendChild(element);
    children.push(element);
});

root.parentElement!.appendChild(root.cloneNode(true));

(async () => {
    let children = [...root.children] as HTMLElement[];
    await new Swapper(children[3], children.slice(1, 3)).swap();
    await new Promise(resolve => setTimeout(resolve, 1000));
    children = [...root.children] as HTMLElement[];
    await new Swapper(children[0], children.slice(1, 3)).swap();
})();
// new SortableList(root, data, {
//     render: (data, index) => {
//         const element = document.createElement('div');
//         element.innerText = `${data} (${index})`;
//         element.style.height = "50px";
//         element.style.width = "50px";
//         element.style.marginBottom = "10px";
//         element.style.border = "1px solid grey";
//         element.style.textAlign = "center";
//         element.style.backgroundColor = "#fffa";
//         return element;
//     },
//     animationDuration: 300,
//     onSwap: (selection, target) => {
//         console.log('onSwap', selection.map(entry => `${entry.data}:${entry.position}`), '=>', `${target.data}:${target.position}`);
//     },
//     onDragStart: () => console.log('onDragStart'),
//     onScroll: () => console.log('onScroll'),
// });