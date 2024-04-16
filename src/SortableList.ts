import { Swapper } from "./Swapper";
import { getDefaultOptions } from "./defaults";
import { TouchListener } from "./TouchListener";
import { DataEntry, SortableListState, SortableOptions } from "./types";

export class SortableList<T> {

    private listState: SortableListState;
    selectedIds: number[];
    dataEntries: DataEntry<T>[];
    ghostsParent: HTMLElement | undefined;
    originalHeight = -1;
    placeHolderSrcId = -1;
    placeHolderDstId = -1;
    swapper?: Swapper;

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
        const { onTap, onHold, onHoldRelease, onDragStart, onDrag, onScroll, onSwap, onSwapStart, onSwapEnd } = this.options;
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
            onDrag: async (event) => {
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
                        onSwapEnd && onSwapEnd();
                        // this.listState = 'dragging';
                        // this.dstPlacholder!.style.minHeight = '-1px';
                        // console.log(this.dstPlacholder);
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

                    const pivot = this.dataEntries[this.placeHolderSrcId].wrapper;
                    const others = entriesInBetween.map(entry => entry.wrapper).filter(element => element !== pivot);
                    if (hoverPosition > placeHolderSrcPosition) {
                        element.style.backgroundColor = 'blue';
                        this.listState = 'swapstart';
                        this.swapper = new Swapper(pivot, others);
                    } else if (hoverPosition < placeHolderSrcPosition) {
                        element.style.backgroundColor = 'green';
                        this.listState = 'swapstart';
                        this.swapper = new Swapper(pivot, others);
                    }
                });
                if (this.listState === 'swapstart') {
                    onSwapStart && onSwapStart();
                    this.listState = 'swap';
                    await new Promise(resolve => requestAnimationFrame(resolve));
                    await this.swapper!.swap()
                    // await new Promise(resolve => setTimeout(resolve, 300));
                    this.listState = 'swapend';
                }
            },
            onDragEnd: () => {
                this.listState = 'idle';
                this.ghostsParent?.remove();
                [...root.children]
                    .filter(element => element.className === 'wrapper')
                    .forEach((element, position) => {
                        this.dataEntries[parseInt(element.id)].position = position;
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

// example setup
const data = ["A", "B", "C", "D", "E", "F", "G"];// "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
const root = document.querySelector('#sortable') as HTMLElement;
root.style.display = "inline-block";
root.style.overflowY = "scroll";
root.style.maxHeight = "300px";

// const children = [] as HTMLElement[];
// data.forEach((data, index) => {
//     const element = document.createElement('div');
//     element.innerText = `${data} (${index})`;
//     element.style.height = "50px";
//     element.style.width = "50px";
//     element.style.marginBottom = "10px";
//     element.style.border = "1px solid grey";
//     element.style.textAlign = "center";
//     element.style.backgroundColor = "#fffa"
//     root.appendChild(element);
//     children.push(element);
// });

// root.parentElement!.appendChild(root.cloneNode(true));

new SortableList(root, data, {
    render: (data, index) => {
        const element = document.createElement('div');
        element.innerText = `${data} (${index})`;
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
    onDragStart: () => console.log('onDragStart'),
    onScroll: () => console.log('onScroll'),
    onSwapStart: () => console.log('onSwapStart'),
    onSwapEnd: () => console.log('onSwapEnd'),
});