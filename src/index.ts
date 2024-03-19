import { TouchListener } from "./touch-listener";

export type SortableOptions<T> = {
    render: (data: T) => HTMLElement;
};

export type DataEntry<T> = {
    data: T;
    wrapper: HTMLElement;
    element: HTMLElement;
    ghost?: HTMLElement;
};

export class SortableList<T> {

    private listState: 'idle' | 'selecting' | 'dragging' = 'idle';
    positions: number[];
    selectedIds: number[];
    dataEntries: DataEntry<T>[];
    ghostsParent: HTMLElement | undefined;
    placeHolderPosition = -1;

    constructor(
        root: HTMLElement,
        data: T[],
        options: SortableOptions<T>,
    ) {
        const { render } = options;
        this.positions = [];
        this.selectedIds = [];
        this.dataEntries = [];
        data.forEach((data, id) => {
            const wrapper = document.createElement('div');
            const element = render(data);
            const duration = 300;
            element.style.transition = `transform ${duration}ms ease`;
            wrapper.style.transition = `max-height ${duration}ms ease`;
            wrapper.style.overflow = 'hidden';
            wrapper.className = 'wrapper';
            wrapper.id = `${id}`;
            wrapper.appendChild(element);
            root.appendChild(wrapper);

            this.positions.push(id);
            this.dataEntries.push({ data, wrapper, element });

            new TouchListener(wrapper, {
                onTap: () => {
                    console.log('onTap', data);
                    if (this.listState === 'selecting') {
                        this.toggleSelection(id);
                    }
                },
                onHold: () => {
                    console.log('onHold');
                    this.listState = 'selecting';
                    this.select(id);
                },
                onHoldRelease: (event) => {
                    event.preventDefault();
                    console.log('onHoldRelease');
                },
                onDragStart: (event) => {
                    console.log('onDragStart');
                    this.placeHolderPosition = this.positions[id];
                    this.listState = 'dragging';
                    const currentId = id;

                    const { wrapper } = this.dataEntries[currentId];
                    const { x, y } = wrapper.getBoundingClientRect();
                    this.ghostsParent = document.createElement('div');
                    this.ghostsParent.className = 'ghosts-parent';
                    this.ghostsParent.style.position = 'fixed';
                    this.ghostsParent.style.top = `${y}px`;
                    this.ghostsParent.style.left = `${x}px`;
                    this.ghostsParent.style.transition = 'top 100ms ease, left 100ms ease';

                    this.ghostsParent.style.minWidth = '5px';
                    this.ghostsParent.style.minHeight = '5px';
                    this.ghostsParent.style.backgroundColor = 'red';

                    document.body.appendChild(this.ghostsParent);

                    this.selectedIds.forEach(id => {
                        const { wrapper, element } = this.dataEntries[id];
                        const { x, y, width, height } = wrapper.getBoundingClientRect();
                        const ghost = this.createGhostFromWrapper(wrapper, x, y);
                        this.ghostsParent!.appendChild(ghost);
                        this.dataEntries[id].ghost = ghost;
                        console.log(ghost);

                        // Prepare element in list to be hidden
                        wrapper.style.maxHeight = `${height}px`;

                        setTimeout(() => {
                            // Hide element in list
                            if (id !== currentId) {
                                wrapper.style.maxHeight = '0';
                            }
                            // Let ghost fly to ghostsParent
                            ghost.style.top = '0';
                            ghost.style.left = '0';
                        }, 10);
                    });
                },
                onDrag: (event) => {
                    requestAnimationFrame(() => {
                        const { clientX, clientY } = event.touches[0];
                        this.ghostsParent!.style.top = `${clientY}px`;
                        this.ghostsParent!.style.left = `${clientX}px`;
                        const elements = (document.elementsFromPoint(clientX, clientY) as HTMLElement[]).filter(element => element.className === 'wrapper');
                        if (elements.length === 1) {
                            const element = elements[0];
                            if (parseInt(element.id) > this.placeHolderPosition) {
                                element.style.backgroundColor = 'red';
                            } else if (parseInt(element.id) < this.placeHolderPosition) {
                                element.style.backgroundColor = 'green';
                            }
                        }
                    });
                },
                onDragEnd: () => {
                    console.log('onDragEnd');
                    this.listState = 'idle';
                    [...this.selectedIds].forEach(id => {
                        this.dataEntries[id].wrapper.style.maxHeight = `${this.dataEntries[id].ghost!.getBoundingClientRect().height}px`;
                        this.dataEntries[id].ghost!.remove();
                        this.deselect(id);
                    });
                    this.ghostsParent?.remove();
                },
                onScroll: () => console.log('onScroll'),
            });

        });
    }

    private createGhostFromWrapper(wrapper: HTMLElement, x: number, y: number) {
        const ghost = wrapper.cloneNode(true) as HTMLElement;
        // Calculate relative distance from list item to ghosts parent
        const { x: parentX, y: parentY } = this.ghostsParent!.getBoundingClientRect();
        const deltaY = y - parentY;
        const deltaX = x - parentX;
        ghost.className = 'ghost';
        ghost.style.userSelect = 'none';
        ghost.style.position = 'absolute';
        ghost.style.top = `${deltaY}px`;
        ghost.style.left = `${deltaX}px`;
        ghost.style.transition = 'top 200ms ease, left 200ms ease';
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
    render: (data) => {
        const element = document.createElement('div');
        element.innerText = data;
        element.style.height = "50px";
        element.style.width = "50px";
        element.style.marginBottom = "10px";
        element.style.border = "1px solid grey";
        element.style.textAlign = "center";
        element.style.backgroundColor = "#fffa";
        return element;
    }
});