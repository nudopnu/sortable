import { TouchListener } from "./touch-listener";

export type SortableProperties<T> = {
    data: T[];
    render: (data: T) => HTMLElement;
};

export class SortableList<T> {

    private listState: 'idle' | 'selecting' | 'dragging' = 'idle';
    positions: number[];
    selectedIds: number[];
    dataEntries: Array<{ data: T, wrapper: HTMLElement, element: HTMLElement }>;

    constructor(
        root: HTMLElement,
        props: SortableProperties<T>,
    ) {
        const { data, render } = props;
        this.positions = [];
        this.selectedIds = [];
        this.dataEntries = [];
        data.forEach((data, id) => {
            const wrapper = document.createElement('div');
            const element = render(data);
            const duration = 300;
            element.style.transition = `transform ${duration}ms ease`;
            wrapper.appendChild(element)
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
                onDragStart: () => {
                    console.log('onDragStart');
                    
                },
                onScroll: () => console.log('onScroll'),
            });
        });
        root.addEventListener('blur', () => {
            this.selectedIds.forEach(id => this.deselect(id));
            console.log('desdfsdf');

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

const root = document.querySelector('#sortable') as HTMLElement;
root.style.display = "inline-block";
root.style.overflowY = "scroll";
root.style.maxHeight = "300px";

new SortableList(root, {
    data: ["A", "B", "C", "D", "E", "F", "G"],
    render: (data) => {
        const element = document.createElement('div');
        element.innerText = data;
        element.style.height = "50px";
        element.style.width = "50px";
        element.style.border = "1px solid grey";
        element.style.textAlign = "center";
        return element;
    }
});