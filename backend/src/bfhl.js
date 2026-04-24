const EDGE_PATTERN = /^([A-Z])->([A-Z])$/;

const buildTree = (node, adjacency) => {
  const children = adjacency.get(node) || [];
  const branch = {};
  for (const child of children) {
    branch[child] = buildTree(child, adjacency);
  }
  return branch;
};

const calcDepth = (node, adjacency) => {
  const children = adjacency.get(node) || [];
  if (children.length === 0) {
    return 1;
  }
  let maxChildDepth = 0;
  for (const child of children) {
    const childDepth = calcDepth(child, adjacency);
    if (childDepth > maxChildDepth) {
      maxChildDepth = childDepth;
    }
  }
  return maxChildDepth + 1;
};

const collectComponent = (start, undirected, visited) => {
  const stack = [start];
  const nodes = new Set();
  while (stack.length > 0) {
    const current = stack.pop();
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    nodes.add(current);
    for (const neighbor of undirected.get(current) || []) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }
  return nodes;
};

const groupHasCycle = (groupNodes, adjacency) => {
  const state = new Map();
  for (const node of groupNodes) {
    state.set(node, 0);
  }
  const dfs = (node) => {
    state.set(node, 1);
    for (const child of adjacency.get(node) || []) {
      if (!groupNodes.has(child)) {
        continue;
      }
      const childState = state.get(child);
      if (childState === 1) {
        return true;
      }
      if (childState === 0 && dfs(child)) {
        return true;
      }
    }
    state.set(node, 2);
    return false;
  };
  for (const node of groupNodes) {
    if (state.get(node) === 0 && dfs(node)) {
      return true;
    }
  }
  return false;
};

export const processBfhl = (entries) => {
  const invalidEntries = [];
  const duplicateEdges = [];
  const seenRawEdges = new Set();
  const duplicateOnce = new Set();
  const parentOf = new Map();
  const adjacency = new Map();
  const undirected = new Map();
  const nodeOrder = [];
  const seenNodes = new Set();

  const ensureNode = (node) => {
    if (!adjacency.has(node)) {
      adjacency.set(node, []);
    }
    if (!undirected.has(node)) {
      undirected.set(node, new Set());
    }
    if (!seenNodes.has(node)) {
      seenNodes.add(node);
      nodeOrder.push(node);
    }
  };

  for (const item of entries) {
    const edge = String(item).trim();
    const match = edge.match(EDGE_PATTERN);
    if (!match) {
      invalidEntries.push(edge);
      continue;
    }
    const [, parent, child] = match;
    if (parent === child) {
      invalidEntries.push(edge);
      continue;
    }
    if (seenRawEdges.has(edge)) {
      if (!duplicateOnce.has(edge)) {
        duplicateEdges.push(edge);
        duplicateOnce.add(edge);
      }
      continue;
    }
    seenRawEdges.add(edge);
    if (parentOf.has(child)) {
      continue;
    }
    parentOf.set(child, parent);
    ensureNode(parent);
    ensureNode(child);
    adjacency.get(parent).push(child);
    undirected.get(parent).add(child);
    undirected.get(child).add(parent);
  }

  const visited = new Set();
  const groups = [];
  for (const node of nodeOrder) {
    if (visited.has(node)) {
      continue;
    }
    groups.push(collectComponent(node, undirected, visited));
  }

  const hierarchies = [];
  let totalTrees = 0;
  let totalCycles = 0;
  let largestTreeRoot = "";
  let largestDepth = 0;

  for (const groupNodes of groups) {
    const candidateRoots = [];
    for (const node of groupNodes) {
      if (!parentOf.has(node)) {
        candidateRoots.push(node);
      }
    }
    candidateRoots.sort();
    const root =
      candidateRoots.length > 0
        ? candidateRoots[0]
        : [...groupNodes].sort((a, b) => a.localeCompare(b))[0];
    const hasCycle = groupHasCycle(groupNodes, adjacency);
    if (hasCycle) {
      totalCycles += 1;
      hierarchies.push({ root, tree: {}, has_cycle: true });
      continue;
    }
    totalTrees += 1;
    const tree = { [root]: buildTree(root, adjacency) };
    const depth = calcDepth(root, adjacency);
    if (
      depth > largestDepth ||
      (depth === largestDepth && (largestTreeRoot === "" || root < largestTreeRoot))
    ) {
      largestDepth = depth;
      largestTreeRoot = root;
    }
    hierarchies.push({ root, tree, depth });
  }

  return {
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot
    }
  };
};
