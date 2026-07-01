/**
 * MCTS (Monte Carlo Tree Search) Engine for Enemy AI
 * 
 * Provides intelligent enemy decision-making by simulating future game states
 * and selecting actions with the highest expected outcome.
 * 
 * Simplified for browser/worker environment:
 * - No full game state cloning (too expensive)
 * - Uses heuristics + random rollouts for evaluation
 * - Configurable iteration count for difficulty scaling
 */

export interface MCTSState {
    heroHealth: number;
    heroAttack: number;
    heroBlock: number;
    heroMana: number[];
    enemies: MCTSEnemy[];
    turn: number;
    phase: string;
}

export interface MCTSEnemy {
    id: string;
    health: number;
    attack: number;
    armor: number;
    abilities: string[];
}

export interface MCTSAction {
    type: 'attack' | 'block' | 'retreat' | 'ability' | 'wait';
    targetId?: string;
    ability?: string;
    value: number;
}

export interface MCTSResult {
    action: MCTSAction;
    score: number;
    iterations: number;
}

export class MCTSEngine {
    private iterations: number;
    private explorationConstant: number;
    private maxDepth: number;

    constructor(options: { iterations?: number; exploration?: number; maxDepth?: number } = {}) {
        this.iterations = options.iterations || 100;
        this.explorationConstant = options.exploration || 1.414; // sqrt(2)
        this.maxDepth = options.maxDepth || 5;
    }

    /**
     * Run MCTS to find the best action
     */
    search(state: MCTSState, actions: MCTSAction[]): MCTSResult {
        if (actions.length === 0) {
            return { action: { type: 'wait', value: 0 }, score: 0, iterations: 0 };
        }
        if (actions.length === 1) {
            return { action: actions[0], score: 0, iterations: 0 };
        }

        const root = this.createNode(state, actions, null, null);
        this.expand(root);

        for (let i = 0; i < this.iterations; i++) {
            let node = root;

            // Selection — traverse to a leaf
            while (node.untriedActions.length === 0 && node.children.length > 0) {
                node = this.selectChild(node);
            }

            // Expansion — add a child if possible
            if (node.untriedActions.length > 0) {
                const action = node.untriedActions[Math.floor(Math.random() * node.untriedActions.length)];
                node.untriedActions = node.untriedActions.filter(a => a !== action);
                const nextState = this.applyAction(node.state, action);
                const child = this.createNode(nextState, this.getActions(nextState), node, action);
                this.expand(child);
                node.children.push(child);
                node = child;
            }

            // Simulation — random rollout
            const score = this.simulate(node.state);

            // Backpropagation
            this.backpropagate(node, score);
        }

        // Select best action
        let bestChild = root.children[0];
        for (const child of root.children) {
            if (child.visits > bestChild.visits) {
                bestChild = child;
            }
        }

        return {
            action: bestChild.action || actions[0],
            score: bestChild.value / Math.max(1, bestChild.visits),
            iterations: this.iterations
        };
    }

    /**
     * Create a new MCTS node
     */
    private createNode(
        state: MCTSState,
        actions: MCTSAction[],
        parent: MCTSNode | null,
        action: MCTSAction | null
    ): MCTSNode {
        return {
            state,
            actions,
            untriedActions: [...actions],
            parent,
            action,
            children: [],
            visits: 0,
            value: 0
        };
    }

    /**
     * Select child using UCB1 formula
     */
    private selectChild(node: MCTSNode): MCTSNode {
        let bestScore = -Infinity;
        let bestChild = node.children[0];

        for (const child of node.children) {
            const exploitation = child.value / Math.max(1, child.visits);
            const exploration = this.explorationConstant * 
                Math.sqrt(Math.log(Math.max(1, node.visits)) / Math.max(1, child.visits));
            const score = exploitation + exploration;

            if (score > bestScore) {
                bestScore = score;
                bestChild = child;
            }
        }

        return bestChild;
    }

    /**
     * Expand node — evaluate its state heuristically
     */
    private expand(node: MCTSNode): void {
        // Evaluate state immediately for better selection
        node.value = this.evaluateState(node.state);
        node.visits = 1;
    }

    /**
     * Simulate a random rollout from the given state
     */
    private simulate(state: MCTSState): number {
        let simState = this.cloneState(state);
        let depth = 0;

        while (depth < this.maxDepth && simState.heroHealth > 0 && simState.enemies.length > 0) {
            // Random action for enemy
            const enemyActions = this.getActions(simState);
            if (enemyActions.length === 0) break;
            const action = enemyActions[Math.floor(Math.random() * enemyActions.length)];
            simState = this.applyAction(simState, action);

            // Simulate hero response (simplified)
            simState = this.simulateHeroResponse(simState);
            depth++;
        }

        return this.evaluateState(simState);
    }

    /**
     * Simulate hero's response (simplified greedy strategy)
     */
    private simulateHeroResponse(state: MCTSState): MCTSState {
        const sim = this.cloneState(state);

        // Hero attacks weakest enemy
        if (sim.enemies.length > 0 && sim.heroAttack > 0) {
            const weakest = sim.enemies.reduce((a, b) => a.health < b.health ? a : b);
            weakest.health -= Math.max(0, sim.heroAttack - weakest.armor);
            if (weakest.health <= 0) {
                sim.enemies = sim.enemies.filter(e => e.id !== weakest.id);
            }
        }

        // Hero blocks
        if (sim.heroBlock > 0) {
            for (const enemy of sim.enemies) {
                enemy.attack = Math.max(0, enemy.attack - sim.heroBlock);
            }
        }

        return sim;
    }

    /**
     * Backpropagate score up the tree
     */
    private backpropagate(node: MCTSNode | null, score: number): void {
        while (node !== null) {
            node.visits++;
            node.value += score;
            node = node.parent;
        }
    }

    /**
     * Get available actions for current state
     */
    private getActions(state: MCTSState): MCTSAction[] {
        const actions: MCTSAction[] = [];

        for (const enemy of state.enemies) {
            if (enemy.health <= 0) continue;

            // Attack action
            actions.push({
                type: 'attack',
                targetId: enemy.id,
                value: enemy.attack
            });

            // Block/defend action
            actions.push({
                type: 'block',
                targetId: enemy.id,
                value: Math.floor(enemy.attack * 0.5)
            });

            // Ability actions
            for (const ability of enemy.abilities) {
                actions.push({
                    type: 'ability',
                    targetId: enemy.id,
                    ability,
                    value: this.getAbilityValue(ability, enemy.attack)
                });
            }
        }

        // Retreat option
        actions.push({ type: 'retreat', value: 0 });

        return actions;
    }

    /**
     * Get value of an ability
     */
    private getAbilityValue(ability: string, baseAttack: number): number {
        const abilityValues: Record<string, number> = {
            poison: baseAttack * 1.5,
            freeze: baseAttack * 0.8,
            fire: baseAttack * 1.3,
            summon: baseAttack * 1.2,
            heal: baseAttack * 0.5,
            vampiric: baseAttack * 1.4,
        };
        return abilityValues[ability] || baseAttack;
    }

    /**
     * Apply action to state (returns new state)
     */
    private applyAction(state: MCTSState, action: MCTSAction): MCTSState {
        const sim = this.cloneState(state);

        switch (action.type) {
            case 'attack': {
                if (action.targetId) {
                    const enemy = sim.enemies.find(e => e.id === action.targetId);
                    if (enemy) {
                        // Enemy attacks hero
                        const damage = Math.max(0, enemy.attack - 2); // hero armor
                        sim.heroHealth -= damage;
                    }
                }
                break;
            }
            case 'block': {
                // Enemy defends, reduce hero's effective attack
                sim.heroAttack = Math.max(0, sim.heroAttack - 1);
                break;
            }
            case 'ability': {
                if (action.ability === 'heal') {
                    const enemy = sim.enemies.find(e => e.id === action.targetId);
                    if (enemy) enemy.health = Math.min(enemy.armor, enemy.health + 3);
                } else if (action.ability === 'poison') {
                    sim.heroHealth -= 2; // Poison damage over time
                } else if (action.ability === 'vampiric') {
                    const enemy = sim.enemies.find(e => e.id === action.targetId);
                    if (enemy) {
                        const damage = Math.max(0, enemy.attack - 2);
                        sim.heroHealth -= damage;
                        enemy.health = Math.min(enemy.armor, enemy.health + damage);
                    }
                }
                break;
            }
            case 'retreat': {
                // Enemy retreats, reduce hero pressure
                sim.heroAttack = Math.max(0, sim.heroAttack - 2);
                break;
            }
        }

        sim.turn++;
        return sim;
    }

    /**
     * Evaluate state — higher is better for enemy
     */
    private evaluateState(state: MCTSState): number {
        if (state.heroHealth <= 0) return 100; // Enemy wins
        if (state.enemies.length === 0) return -100; // Hero wins

        let score = 0;

        // Hero health (lower is better for enemy)
        score += (20 - state.heroHealth) * 2;

        // Enemy health (higher is better for enemy)
        for (const enemy of state.enemies) {
            score += enemy.health * 1.5;
            score += enemy.attack * 0.5;
        }

        // Enemy count advantage
        score += state.enemies.length * 5;

        // Hero resources (lower is better for enemy)
        score -= state.heroAttack * 0.5;
        score -= state.heroBlock * 0.3;
        score -= state.heroMana.length * 1;

        return score;
    }

    /**
     * Clone a game state
     */
    private cloneState(state: MCTSState): MCTSState {
        return {
            heroHealth: state.heroHealth,
            heroAttack: state.heroAttack,
            heroBlock: state.heroBlock,
            heroMana: [...state.heroMana],
            enemies: state.enemies.map(e => ({ ...e, abilities: [...e.abilities] })),
            turn: state.turn,
            phase: state.phase
        };
    }
}

interface MCTSNode {
    state: MCTSState;
    actions: MCTSAction[];
    untriedActions: MCTSAction[];
    parent: MCTSNode | null;
    action: MCTSAction | null;
    children: MCTSNode[];
    visits: number;
    value: number;
}

export default MCTSEngine;
