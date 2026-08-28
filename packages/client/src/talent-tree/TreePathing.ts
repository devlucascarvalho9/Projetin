export type TreeEdge = readonly [string, string];

export function buildAdjacency(edges: readonly TreeEdge[]): Map<string, Set<string>> {
    const adjacency = new Map<string, Set<string>>();

    const ensure = (id: string) => {
        let neighbours = adjacency.get(id);
        if (!neighbours) {
            neighbours = new Set<string>();
            adjacency.set(id, neighbours);
        }
        return neighbours;
    };

    for (const [a, b] of edges) {
        ensure(a).add(b);
        ensure(b).add(a);
    }

    return adjacency;
}

/**
 * Finds the shortest visual route from any currently active passive to target.
 * The start node is included in the result. Masteries can simply be omitted
 * from the supplied graph because they are not road nodes in the Warrior tree.
 */
export function shortestPathFromActive(
    target: string,
    active: ReadonlySet<string>,
    adjacency: ReadonlyMap<string, ReadonlySet<string>>
): string[] | null {
    if (active.has(target)) return [target];

    const queue: string[] = [];
    const previous = new Map<string, string | null>();

    for (const start of active) {
        queue.push(start);
        previous.set(start, null);
    }

    for (let cursor = 0; cursor < queue.length; cursor++) {
        const current = queue[cursor];
        const neighbours = adjacency.get(current);
        if (!neighbours) continue;

        for (const next of neighbours) {
            if (previous.has(next)) continue;
            previous.set(next, current);

            if (next === target) {
                const path: string[] = [target];
                let step: string | null | undefined = current;
                while (step) {
                    path.push(step);
                    step = previous.get(step);
                }
                path.reverse();
                return path;
            }

            queue.push(next);
        }
    }

    return null;
}

export function pathEdgeKeys(path: readonly string[] | null): Set<string> {
    const keys = new Set<string>();
    if (!path || path.length < 2) return keys;

    for (let i = 1; i < path.length; i++) {
        keys.add(edgeKey(path[i - 1], path[i]));
    }
    return keys;
}

export function edgeKey(a: string, b: string): string {
    return a < b ? `${a}::${b}` : `${b}::${a}`;
}
