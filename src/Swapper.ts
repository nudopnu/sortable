import { TwoWayMap } from "./utils";
import { PlaceHolder } from "./PlaceHolder";



export class Swapper {

    private pivotElementPosition: 'before' | 'after';
    private parent: HTMLElement;
    private childToIdx: TwoWayMap<HTMLElement, number>;

    constructor(private pivot: HTMLElement, private others: HTMLElement[]) {
        this.parent = pivot.parentElement!;
        this.childToIdx = new TwoWayMap<HTMLElement, number>();
        if (others.includes(pivot)) throw new Error("Pivot should be excluded from 'others'");
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
        pivot.classList.add('pivot');
        this.pivotElementPosition = pivotIdx < minIdx! ? 'before' : 'after';
    }

    async swap() {

        // get start and end child of others
        const minIdx = Math.min(...this.others.map(elem => this.childToIdx.get(elem)!));
        const maxIdx = Math.max(...this.others.map(elem => this.childToIdx.get(elem)!));
        const startChild = this.childToIdx.reverseGet(minIdx)!;
        const endChild = this.childToIdx.reverseGet(maxIdx)!;

        // init placeholders: before, frame, after
        const frameTop = startChild.getBoundingClientRect().top;
        const frameBottom = endChild.nextElementSibling ? endChild.nextElementSibling.getBoundingClientRect().top : endChild.getBoundingClientRect().bottom;
        const frameHeight = frameBottom - frameTop;
        const placeholderHeight = frameHeight / this.others.length;
        const startPlaceHolder = new PlaceHolder(1, placeholderHeight);
        const endPlaceholder = new PlaceHolder(1, placeholderHeight);
        const framePlaceHolder = new PlaceHolder(1, frameHeight);
        framePlaceHolder.element.style.position = 'relative';

        // collapse the correct placeholder
        if (this.pivotElementPosition === 'before') {
            endPlaceholder.collapse();
        } else {
            startPlaceHolder.collapse();
        }

        // transfer others into the frame with relative positions
        const tops = this.others.map(element => element.getBoundingClientRect().top);
        this.others.forEach((element, idx) => {
            this.parent.removeChild(element);
            framePlaceHolder.element.appendChild(element);
            element.style.position = 'absolute';
            element.style.top = `${tops[idx] - frameTop}px`;
        });

        // add placeholders to parent and remove pivot from parent
        this.parent.insertBefore(framePlaceHolder.element, this.pivot);
        this.parent.insertBefore(startPlaceHolder.element, framePlaceHolder.element);
        this.parent.insertBefore(endPlaceholder.element, this.pivot);
        this.parent.removeChild(this.pivot);

        // prepare pivot for flying
        this.pivot.style.position = 'absolute';
        this.pivot.style.transition = `top 300ms ease`;
        this.pivot.style.top = '0';
        if (this.pivotElementPosition === 'before') {
            startPlaceHolder.element.appendChild(this.pivot);
        } else {
            endPlaceholder.element.appendChild(this.pivot);
        }

        // shift frame with others and let pivot fly
        await new Promise(r => setTimeout(r, 0));
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

        // cleanup
        startPlaceHolder.destroy();
        endPlaceholder.destroy();
        this.pivot.style.position = 'static';

        if (this.pivotElementPosition === 'before') {
            this.others.forEach(element => {
                element.style.position = 'static';
                this.parent.insertBefore(element, framePlaceHolder.element);
            });
            this.parent.insertBefore(this.pivot, framePlaceHolder.element);
        } else {
            this.parent.insertBefore(this.pivot, framePlaceHolder.element);
            this.others.forEach(element => {
                element.style.position = 'static';
                this.parent.insertBefore(element, framePlaceHolder.element);
            });
        }

        framePlaceHolder.destroy();
        if (this.pivotElementPosition === 'before') {
            this.pivotElementPosition = 'after';
        } else {
            this.pivotElementPosition = 'before';
        }
    }
}
