export interface Graph<T extends string> {
    vertices: { [key in T]: number };
    adjacencies: { [key in number]: number[] };
}

export type StateMachineSettings<T extends string> = {
    graph: Graph<T>;
    startState: number;
}

export class StateMachine<T extends string> {

    private currentStateId: number;
    private idToState: { [key in number]: T };
    graph: Graph<T>;

    constructor(protected settings: StateMachineSettings<T>) {
        const { startState, graph } = settings;
        this.graph = graph;
        this.currentStateId = startState;
        this.idToState = {};
        for (const [stateName, stateId] of Object.entries(graph.vertices)) {
            this.idToState[stateId as number] = stateName as T;
        }
    }

    current() {
        return this.idToState[this.currentStateId];
    }

    canTransitionTo(state: T) {
        const targetStateId = this.graph.vertices[state];
        const currentNeighbors = this.graph.adjacencies[this.currentStateId];
        return currentNeighbors.indexOf(targetStateId) !== -1;
    }

    transitionTo(state: T) {
        this.currentStateId = this.graph.vertices[state];
    }

}

