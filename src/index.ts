import { TouchListener, TouchListenerOptions } from "./touch-listener";

function getDefaultOptions<T>(): SortableOptions<T> {
    return {
        animationDuration: 300,
        render: (data) => {
            const element = document.createElement('div');
            element.innerText = JSON.stringify(data);
            element.style.height = "50px";
            element.style.width = "50px";
            element.style.marginBottom = "10px";
            element.style.border = "1px solid grey";
            element.style.textAlign = "center";
            element.style.backgroundColor = "#fffa";
            return element;
        }
    };
}

export type SortableOptions<T> = TouchListenerOptions & {
    render: (data: T, index?: number) => HTMLElement;
    animationDuration?: number;
    onSwap?: (selection: DataEntry<T>[], target: DataEntry<T>) => void;
    onChange?: (oldData: T[], newData: T[]) => void;
};

export type DataEntry<T> = {
    id: number;
    data: T;
    position: number;
    wrapper: HTMLElement;
    element: HTMLElement;
    ghost?: HTMLElement;
};

export class SortableList<T> {

    private listState: 'idle' | 'selecting' | 'dragging' | 'swapstart' | 'swap' | 'swapend';
    selectedIds: number[];
    dataEntries: DataEntry<T>[];
    ghostsParent: HTMLElement | undefined;
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
        dataList.forEach((data, index) => {
            // Create list item
            const element = this.createElement(data, index);
            const wrapper = this.createWrapper(index);
            wrapper.appendChild(element);
            rootElement.appendChild(wrapper);

            // Add logic
            const id = index;
            const position = index;
            this.dataEntries.push({ id, data, wrapper, element, position });
            const { onTap, onHold, onHoldRelease, onDragStart, onDrag } = options;
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

                    // Init state
                    const currentId = index;
                    this.placeHolderSrcId = currentId;
                    this.listState = 'dragging';

                    // Create ghostsParent
                    const { wrapper } = this.dataEntries[currentId];
                    const { x, y } = wrapper.getBoundingClientRect();
                    this.ghostsParent = this.createGhostsParent(y, x);
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
                            // Hide list item
                            if (id !== currentId) {
                                wrapper.style.maxHeight = '0';
                            }
                            // Let ghost fly to ghostsParent
                            ghost.style.top = '0';
                            ghost.style.left = '0';
                        }, 10);
                    });
                    onDragStart && onDragStart(event);
                },
                onDrag: (event) => {
                    let element: HTMLElement | undefined;
                    requestAnimationFrame(() => {
                        // Update ghostsParent's position
                        const { clientX, clientY } = event.touches[0];
                        this.ghostsParent!.style.top = `${clientY}px`;
                        this.ghostsParent!.style.left = `${clientX}px`;

                        if (this.listState === 'swapend') {
                            // this.dstPlacholder!.style.minHeight = `0`;
                            this.listState = 'dragging';
                        };
                        if (this.listState !== 'dragging') return;

                        // Get hovered element as possible swap target
                        const elements = (document.elementsFromPoint(clientX, clientY) as HTMLElement[])
                            .filter(element => element.className === 'wrapper');

                        if (elements.length === 1) {
                            element = elements[0];
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
                            this.dstPlacholder.style.minHeight = `0`;
                            this.dstPlacholder.style.transition = 'min-height 300ms ease';
                            const lastEntry = this.dataEntries[hoverId].wrapper;

                            if (hoverPosition > placeHolderSrcPosition) {
                                element.style.backgroundColor = 'red';
                                this.rootElement.insertBefore(this.dstPlacholder, lastEntry.nextSibling);
                                this.listState = 'swapstart';
                            } else if (hoverPosition < placeHolderSrcPosition) {
                                element.style.backgroundColor = 'green';
                                this.rootElement.insertBefore(this.dstPlacholder, lastEntry);
                                this.listState = 'swapstart';
                            }
                        }
                    });
                    if (this.listState === 'swapstart') {
                        const { wrapper } = this.dataEntries[this.placeHolderSrcId]
                        const { height } = wrapper.getBoundingClientRect();
                        setTimeout(() => {
                            this.dstPlacholder!.style.minHeight = `${height}px`;
                            wrapper.style.maxHeight = '0';
                            // this.listState = 'swapend';
                        }, 100);
                        this.listState = 'swap';
                    }
                },
                onDragEnd: () => {
                    const { onSwap, onChange } = options;

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
                        entry.element.innerText = `${entry.data}_${entry.position}`;
                    });
                    onSwap && onSwap(this.selectedIds.map(id => this.dataEntries[id]), this.dataEntries[this.placeHolderDstId]);
                    // onChange && onChange(());
                },
                onScroll: () => console.log('onScroll'),
            })
        });
    }

    private createElement(data: T, idx: number) {
        const { render, animationDuration } = this.options;
        const element = render(data, idx);
        element.style.transition = `transform ${animationDuration}ms ease`;
        return element
    }

    private createWrapper(id: number) {
        const { animationDuration } = this.options;
        const wrapper = document.createElement('div');
        wrapper.style.transition = `max - height ${animationDuration}ms ease`;
        wrapper.style.overflow = 'hidden';
        wrapper.className = 'wrapper';
        wrapper.id = `${id} `;
        return wrapper;
    }

    private createGhostsParent(y: number, x: number) {
        const ghostsParent = document.createElement('div');
        ghostsParent.className = 'ghosts-parent';
        ghostsParent.style.position = 'fixed';
        ghostsParent.style.top = `${y} px`;
        ghostsParent.style.left = `${x} px`;
        ghostsParent.style.transition = 'top 100ms ease, left 100ms ease';
        return ghostsParent;
    }

    private createGhostFromWrapper(wrapper: HTMLElement, x: number, y: number) {
        // Calculate relative distance from list item to ghosts parent
        const { x: parentX, y: parentY } = this.ghostsParent!.getBoundingClientRect();
        const deltaY = y - parentY;
        const deltaX = x - parentX;

        // Create ghost as child of ghostsParent
        const ghost = wrapper.cloneNode(true) as HTMLElement;
        ghost.className = 'ghost';
        ghost.style.userSelect = 'none';
        ghost.style.position = 'absolute';
        ghost.style.top = `${deltaY} px`;
        ghost.style.left = `${deltaX} px`;
        ghost.style.transition = 'top 200ms ease, left 200ms ease';
        this.ghostsParent!.appendChild(ghost);
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
        if (this.selectedIds.includes(id)) return;
        this.selectedIds.push(id);
        this.selectedIds.sort((a, b) => this.dataEntries[a].position - this.dataEntries[b].position);
        this.dataEntries[id].element.style.transform = 'scale(0.8)';
    }

    deselect(id: number) {
        this.selectedIds = [...this.selectedIds.filter(i => i !== id)];
        this.dataEntries[id]!.element.style.transform = 'scale(1)';
        if (this.selectedIds.length === 0) {
            this.listState = 'idle';
        }
    }

}

const data = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
const root = document.querySelector('#sortable') as HTMLElement;
root.style.display = "inline-block";
root.style.overflowY = "scroll";
root.style.maxHeight = "300px";

new SortableList(root, data, {
    render: (data, index) => {
        const element = document.createElement('div');
        element.innerText = `${data}_${index}`;
        element.style.height = "50px";
        element.style.width = "50px";
        element.style.marginBottom = "10px";
        element.style.border = "1px solid grey";
        element.style.textAlign = "center";
        element.style.backgroundColor = "#fffa";
        return element;
    },
    animationDuration: 300,
    onSwap: (selection, target) => {
        console.log('onSwap', selection.map(entry => `${entry.data}:${entry.position}`), '=>', `${target.data}:${target.position}`);
    },
});