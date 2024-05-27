import { SwapperModel } from "../src/Swapper.model";

describe("Should swap correctly if...", () => {

    it("target above pivot", () => {
        const src = [1, 2, 3, 4, 5];
        const dst = [2, 3, 1, 4, 5];
        const sorted = new SwapperModel(src);
        sorted.swapWithPivot([2, 3], 1, { pivotId: 2 });
        expect(sorted.ids).toEqual(dst);
    });

    it("target below pivot", () => {
        const src = [1, 2, 3, 4, 5];
        const dst = [1, 4, 2, 3, 5];
        const sorted = new SwapperModel(src);
        sorted.swapWithPivot([2, 3], 4, { pivotId: 2 });
        expect(sorted.ids).toEqual(dst);
    });

    it("should swap correctly", () => {
        const src = [1, 2, 3, 4, 5];
        const dst = [1, 3, 5, 2, 4];
        const sorted = new SwapperModel(src);
        sorted.swapWithPivot([1, 3, 5], 2, { pivotId: 3 });
        expect(sorted.ids).toEqual(dst);
    });

    it("Target is in range of selection and pivot is below", () => {
        const src = [1, 2, 3, 4, 5];
        const dst = [2, 1, 3, 5, 4];
        const sorted = new SwapperModel(src);
        sorted.swapWithPivot([1, 3, 5], 2, { pivotId: 1 });
        expect(sorted.ids).toEqual(dst);
    });

});