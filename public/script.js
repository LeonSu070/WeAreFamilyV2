let idMap;
let currentRoot;

// The family data is provided by familyData.js as a global variable.
const data = window.familyData;
if (data) {
  const root = buildHierarchy(data);
  if (root) {
    currentRoot = root;
    drawTree(root);
  }
} else {
  console.error("Family data not found");
}

function buildHierarchy(data) {
  const list = data.members;
  const rootId = data.root;
  idMap = new Map();
  list.forEach(member => {
    member.name = `${member.first_name}${member.last_name}`;
    member.children = [];
    idMap.set(member.id, member);
  });

  list.forEach(member => {
    if (member.parent_id && idMap.has(member.parent_id)) {
      idMap.get(member.parent_id).children.push(member);
    }
  });

  // link spouses and share children
  list.forEach(member => {
    if (member.spouse_id && idMap.has(member.spouse_id)) {
      member.spouse = idMap.get(member.spouse_id);
    }
  });

  list.forEach(member => {
    if (member.spouse) {
      const combined = Array.from(new Set([
        ...(member.children || []),
        ...(member.spouse.children || [])
      ]));
      member.children = combined;
      member.spouse.children = combined;
    }
  });

  const rootMember = idMap.get(rootId);

  list.forEach(member => {
    if (member.children.length === 0) {
      delete member.children;
    }
  });

  return rootMember;
}

function drawTree(data) {
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const rectWidth = 120; // width of a single member node
  const rectHeight = 30;
  const spouseGap = 10;

  // Base horizontal step used by the tree layout.  This roughly matches the
  // width of a single node and a small margin so that nodes without a spouse
  // stay close to each other.
  const baseDx = rectWidth + 20;
  const dy = 80; // vertical spacing between generations

  // Additional spacing required when a node has a spouse box drawn next to it.
  const spouseOffset = (rectWidth + spouseGap) / baseDx;

  const tree = d3.tree()
    .nodeSize([baseDx, dy])
    // Custom separation so that a node with a spouse reserves enough
    // horizontal space for the additional box. When determining spacing
    // between siblings, only add the offset if the left sibling has a spouse
    // drawn to its right. For nodes from different subtrees we fall back to
    // the original behaviour of adding spacing when either node has a spouse.
    .separation((a, b) => {
      const base = a.parent === b.parent ? 1 : 2;
      let extra = 0;
      if (a.parent && b.parent && a.parent === b.parent) {
        const siblings = a.parent.children;
        const aIndex = siblings.indexOf(a);
        const bIndex = siblings.indexOf(b);
        if (aIndex < bIndex) {
          extra = a.data.spouse ? spouseOffset : 0;
        } else {
          extra = b.data.spouse ? spouseOffset : 0;
        }
      } else if (a.data.spouse || b.data.spouse) {
        extra = spouseOffset;
      }
      return base + extra;
    });
  const diagonal = d3.linkVertical().x(d => d.x).y(d => d.y);
  // Links should connect to the top/bottom edges of each node's rectangle
  // rather than its centre. We'll use a helper that adjusts the y
  // coordinate by half of the rectangle height.
  function linkPath(d) {
    const source = { x: d.source.x, y: d.source.y + rectHeight / 2 };
    const target = { x: d.target.x, y: d.target.y - rectHeight / 2 };
    return diagonal({ source, target });
  }

  const root = d3.hierarchy(data);
  root.x0 = 0;
  root.y0 = 0;

  root.descendants().forEach((d, i) => {
    d.id = i;
    d._children = d.children;
  });

  const svg = d3.select('#chart').append('svg')
    // slightly larger font to match bigger nodes
    .style('font', '14px sans-serif')
    .style('user-select', 'none')
    .style('margin-bottom', '20px');

  const g = svg.append('g');

  function update(source) {
    tree(root);

    let left = Infinity,
        right = -Infinity,
        top = Infinity,
        bottom = -Infinity;
    root.each(d => {
      const nodeLeft = d.x - rectWidth / 2;
      const nodeRight = d.x + rectWidth / 2;
      left = Math.min(left, nodeLeft);
      right = Math.max(right, nodeRight);
      top = Math.min(top, d.y);
      bottom = Math.max(bottom, d.y);
      if (d.data.spouse) {
        const spouseLeft = d.x + rectWidth + spouseGap - rectWidth / 2;
        const spouseRight = d.x + rectWidth + spouseGap + rectWidth / 2;
        left = Math.min(left, spouseLeft);
        right = Math.max(right, spouseRight);
      }
    });

    const rootCenter = root.x + (root.data.spouse ? (rectWidth + spouseGap) / 2 : 0);
    const halfWidth = Math.max(rootCenter - left, right - rootCenter);
    const extraTop = currentRoot && currentRoot.parent_id ? rectHeight : 0;
    const width = margin.left + margin.right + 2 * halfWidth;
    const height = bottom - top + margin.top + margin.bottom + rectHeight + extraTop;

    svg
      .attr('viewBox', [0, 0, width, height])
      .attr('width', width)
      .attr('height', height);

    const offsetX = margin.left + (width - margin.left - margin.right) / 2 - rootCenter;
    g.attr('transform', `translate(${offsetX},${margin.top + extraTop})`);

    const nodes = root.descendants().reverse();
    const links = root.links();

    const link = g.selectAll('path.link')
      .data(links, d => d.target.id);

    link.join(
      enter => enter.append('path')
          .attr('class', 'link')
          .attr('stroke', '#555')
          .attr('stroke-opacity', 0.4)
          .attr('fill', 'none')
          .attr('stroke-width', 1.5)
          .attr('d', () => {
            const o = { x: source.x0, y: source.y0 + rectHeight / 2 };
            return diagonal({ source: o, target: o });
          })
          .transition().duration(250)
          .attr('d', d => linkPath(d)),
      update => update.transition().duration(250)
          .attr('d', d => linkPath(d)),
      exit => exit.transition().duration(250)
          .attr('d', () => {
            const o = { x: source.x, y: source.y + rectHeight / 2 };
            return diagonal({ source: o, target: o });
          })
          .remove(),
    );

    const node = g.selectAll('g.node')
      .data(nodes, d => d.id);

    const nodeEnter = node.enter().append('g')
      .attr('class', 'node')
      .attr('transform', () => `translate(${source.x0},${source.y0})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
        update(d);
      });

    nodeEnter.append('rect')
      .attr('x', -rectWidth / 2)
      .attr('y', -rectHeight / 2)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('fill', '#fff')
      .attr('stroke', d => d.data.gender === 2 ? 'pink' : 'steelblue');

    nodeEnter.append('text')
      .attr('dy', '0.31em')
      .attr('text-anchor', 'middle')
      .text(d => d.data.name);

    const spouseEnter = nodeEnter.filter(d => d.data.spouse).append('g')
      .attr('class', 'spouse')
      .attr('transform', `translate(${rectWidth + spouseGap},0)`);

    spouseEnter.append('rect')
      .attr('x', -rectWidth / 2)
      .attr('y', -rectHeight / 2)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('fill', '#fff')
      .attr('stroke', d => d.data.spouse.gender === 2 ? 'pink' : 'steelblue');

    spouseEnter.append('text')
      .attr('dy', '0.31em')
      .attr('text-anchor', 'middle')
      .text(d => d.data.spouse.name);

    nodeEnter.filter(d => d.data.spouse).append('line')
      .attr('class', 'spouse-link')
      .attr('x1', rectWidth / 2)
      .attr('y1', 0)
      .attr('x2', rectWidth / 2 + spouseGap)
      .attr('y2', 0)
      .attr('stroke', '#555')
      .attr('stroke-width', 1.5);

    node.merge(nodeEnter).transition().duration(250)
      .attr('transform', d => `translate(${d.x},${d.y})`);

    node.exit().transition().duration(250)
      .attr('transform', () => `translate(${source.x},${source.y})`)
      .remove();

    const iconData = currentRoot && currentRoot.parent_id ? [root] : [];
    const icon = g.selectAll('text.up-icon').data(iconData);
    icon.enter()
      .append('text')
      .attr('class', 'up-icon')
      .attr('text-anchor', 'middle')
      .attr('cursor', 'pointer')
      .text('\u25B2')
      .on('click', expandRootUp)
      .merge(icon)
      .attr('transform', d => `translate(${d.x},${d.y - rectHeight / 2 - 10})`);
    icon.exit().remove();

    root.each(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  update(root);
}

function expandRootUp() {
  if (!currentRoot) return;
  const parent = idMap.get(currentRoot.parent_id);
  if (!parent) return;
  const grand = idMap.get(parent.parent_id);
  currentRoot = grand || parent;
  d3.select('#chart').selectAll('svg').remove();
  drawTree(currentRoot);
}
