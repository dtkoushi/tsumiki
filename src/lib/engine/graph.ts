import type { Card } from '../../types';

export function buildDependencyGraph(cards: Card[]): Map<string, string[]> {
    const adjacencyList = new Map<string, string[]>();

    // Initialize all cards in the map
    cards.forEach(card => {
        if (!adjacencyList.has(card.id)) {
            adjacencyList.set(card.id, []);
        }
    });

    // Build edges based on references
    // If Card B refers to Card A, then A must be calculated before B.
    // Edge: A -> B
    cards.forEach(consumerCard => {
        Object.values(consumerCard.inputs).forEach(input => {
            if (input.ref) {
                const producerId = input.ref.cardId;
                if (adjacencyList.has(producerId)) {
                    const edges = adjacencyList.get(producerId)!;
                    if (!edges.includes(consumerCard.id)) {
                        edges.push(consumerCard.id);
                    }
                }
            }
        });
    });

    return adjacencyList;
}

export function topologicalSort(cards: Card[]): string[] {
    const graph = buildDependencyGraph(cards);
    const visited = new Set<string>();
    const tempVisited = new Set<string>(); // For cycle detection
    const order: string[] = [];


    function visit(nodeId: string) {
        if (tempVisited.has(nodeId)) {
            // Cycle detected
            return;
        }
        if (visited.has(nodeId)) {
            return;
        }

        tempVisited.add(nodeId);

        const neighbors = graph.get(nodeId) || [];
        for (const neighborId of neighbors) {
            visit(neighborId);
        }

        tempVisited.delete(nodeId);
        visited.add(nodeId);
        order.unshift(nodeId); // Add to front for reverse post-order (which acts as topo sort here? wait)
    }

    // Standard DFS topological sort returns reverse post-order.
    // If we want execution order (Dependencies -> Consumers), we need the reverse of that?
    // Let's trace: A -> B. Visit A. Visit B (has no neighbors). B finishes. A finishes.
    // Standard algo: 
    //   Visit A -> calls Visit B -> B finishes, push B to stack. A finishes, push A to stack.
    //   Stack: [B, A]. Pop -> A, B. (Correct for A -> B)
    // But here I'm using `order.unshift(nodeId)`.
    //   B finishes -> unshift B -> [B]
    //   A finishes -> unshift A -> [A, B]
    //   Result: [A, B]. Correct.

    // We should iterate over all nodes to ensure disconnected components are covered.
    // However, we want to respect the "Vertical Stack" conceptual order if possible for independent nodes,
    // but strictly topological sort dictates dependency order.
    // The user requirement says "Topological Sort: スタック順序に基づき計算順序を確定"
    // implies that stack order is a tie-breaker or the base traversal order.

    // Let's visit in the order they appear in the list (Stack Order) to maintain stability.
    cards.forEach(card => {
        if (!visited.has(card.id)) {
            visit(card.id);
        }
    });

    return order;
}
