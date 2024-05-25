import { Graph, StateMachine, StateMachineSettings } from "./StateMachine";

describe('StateMachine', () => {

    it("Should transition to correct state", () => {
        const settings = {
            graph: {
                vertices: { "idle": 1, "done": 2 },
                adjacencies: { 1: [2], 2: [1] },
            },
            startState: 1,
        };
        const x = new StateMachine(settings);
        expect(x.current()).toBe("idle");
        x.transitionTo("done");
        expect(x.current()).toBe("done");
    });

    it("Should constrain transitions", () => {
        const settings = {
            graph: {
                vertices: { "idle": 1, "running": 2, "done": 3 },
                adjacencies: { 1: [2], 2: [1], 3: [1] },
            },
            startState: 1,
        };
        const x = new StateMachine(settings);
        expect(x.canTransitionTo("running")).toBe(true);
        expect(x.canTransitionTo("done")).toBe(false);
    });
});