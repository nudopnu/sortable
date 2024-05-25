import { EventStateMachine } from "./EventStateMachine";
import { AbstractState } from "./State";

describe("EventStateMachine", () => {

    it("Should work", () => {
        class StartState extends AbstractState<string> { readonly state = "StartState"; }
        class MidState extends AbstractState<string> { readonly state = "MidState"; }
        class EndState extends AbstractState<string> { readonly state = "EndState"; }
        const mockCallback = jest.fn(_ => { });
        const stateMachine = new EventStateMachine<StartState | MidState | EndState>({
            graph: {
                vertices: { StartState: 1, MidState: 2, EndState: 3 },
                adjacencies: { 1: [2] }
            },
            startState: 1,
            MidState: mockCallback,
        });
        expect(stateMachine.current()).toBe("StartState");

        // Should not transition
        stateMachine.submit(new EndState("test"));
        expect(stateMachine.current()).toBe("StartState");

        // Should transition
        stateMachine.submit(new MidState("MidStatePayload"));
        expect(stateMachine.current()).toBe("MidState");

        // Should have been called once
        expect(mockCallback.mock.calls).toHaveLength(1);
        expect(mockCallback.mock.calls[0][0]).toBe("MidStatePayload");
    });

});