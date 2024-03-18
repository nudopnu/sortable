import { TouchListener } from "./touch-listener";

export type SortableOptions<T> = {
    render: (data: T) => HTMLElement;
};

export class SortableList<T> {

    private listState: 'idle' | 'selecting' | 'dragging' = 'idle';
    positions: number[];
    selectedIds: number[];
    dataEntries: Array<{ data: T, wrapper: HTMLElement, element: HTMLElement, ghost?: HTMLElement }>;

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
            element.style.transition = `transform ${duration}ms ease, max-height ${duration}ms ease`;
            wrapper.appendChild(element);
            root.appendChild(wrapper);

            this.positions.push(id);
            this.dataEntries.push({ data, wrapper, element });

            new TouchListener(wrapper, {
                onTap: () => {
                    console.log('onTap');
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
                    this.listState = 'dragging';

                    this.selectedIds.forEach(id => {
                        const { wrapper } = this.dataEntries[id];
                        const { x, y } = wrapper.getBoundingClientRect();
                        const ghost = this.dataEntries[id].wrapper.cloneNode(true) as HTMLElement;
                        ghost.style.position = 'fixed';
                        ghost.style.top = `${y}px`;
                        ghost.style.left = `${x}px`;
                        ghost.style.transition = 'top 100ms ease, left 100ms ease';
                        document.body.appendChild(ghost);
                        this.dataEntries[id].ghost = ghost;
                        console.log(ghost);

                    });
                },
                onDrag: (event) => {
                    const { clientX, clientY } = event.touches[0];
                    this.selectedIds.forEach(id => {
                        const ghost = this.dataEntries[id].ghost!;
                        ghost.style.top = `${clientY}px`;
                        ghost.style.left = `${clientX}px`;
                    });
                },
                onDragEnd: () => {
                    console.log('onDragEnd');
                    this.listState = 'idle';
                    [...this.selectedIds].forEach(id => {
                        this.dataEntries[id].ghost!.remove();
                        this.deselect(id);
                    });
                },
                onScroll: () => console.log('onScroll'),
            });
        });
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

const data = ["A", "B", "C", "D", "E", "F", "G"];
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
        element.style.border = "1px solid grey";
        element.style.textAlign = "center";
        element.style.backgroundColor = "#fff";
        return element;
    }
});