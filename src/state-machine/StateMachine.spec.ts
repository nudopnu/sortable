import { AbstractStateEvent } from "./StateEvent";
import { StateMachine } from "./StateMachine";

describe("Testing the StateMachine", () => {

    it("should work", () => {
        // Setting up events
        class StartEvent extends AbstractStateEvent<string> { readonly name = "onStart" }
        class StopEvent extends AbstractStateEvent<void> { readonly name = "onStop" }
        type StateEvents = StopEvent | StartEvent;

        // Setting up states and statemachine
        type States = "Idle" | "Running";
        const mockCallback = jest.fn(payload => { if (payload === "correct") return "Running"; });
        const stateMachine = new StateMachine<States, StateEvents>({
            entryState: "Idle",
            states: {
                Idle: { onStart: mockCallback },
                Running: {},
            }
        });

        // Check initial state
        expect(stateMachine.currentState).toBe("Idle");

        // Should not change state
        stateMachine.submit(new StopEvent());
        expect(stateMachine.currentState).toBe("Idle");

        // Should not change state
        stateMachine.submit(new StartEvent("incorrect"));
        expect(stateMachine.currentState).toBe("Idle");

        // Should change state
        stateMachine.submit(new StartEvent("correct"));
        expect(stateMachine.currentState).toBe("Running");

        // Should be called 
        expect(mockCallback.mock.calls).toHaveLength(2);
        expect(mockCallback.mock.calls[0][0]).toBe("incorrect");
        expect(mockCallback.mock.calls[1][0]).toBe("correct");
    });

})