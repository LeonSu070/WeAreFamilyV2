fetch('/family')
  .then(res => res.json())
  .then(data => {
    const root = buildHierarchy(data);
    if (root) {
      drawTree(root);
    }
  })
  .catch(err => console.error(err));

function buildHierarchy(data) {
  const list = data.members;
  const rootId = data.root;
  const idMap = new Map();
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
  const rectWidth = 120; // increased for larger nodes
  const rectHeight = 30; // increased for larger nodes
  const spouseGap = 10;
  // Use a horizontal spacing that accounts for the maximum width of a
  // node with a spouse so siblings don't overlap.
  const dx = rectWidth * 2 + spouseGap + 20;
  const dy = 120;
  const tree = d3.tree()
    .nodeSize([dx, dy])
    // Keep spouses close together while ensuring siblings are spaced
    // apart so their boxes do not touch.
    .separation((a, b) => (a.parent === b.parent ? 1 : 2));
  const diagonal = d3.linkVertical().x(d => d.x).y(d => d.y);

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
    const width = margin.left + margin.right + 2 * halfWidth;
    const height = bottom - top + margin.top + margin.bottom + rectHeight;

    svg
      .attr('viewBox', [0, 0, width, height])
      .attr('width', width)
      .attr('height', height);

    const offsetX = margin.left + (width - margin.left - margin.right) / 2 - rootCenter;
    g.attr('transform', `translate(${offsetX},${margin.top})`);

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
            const o = { x: source.x0, y: source.y0 };
            return diagonal({ source: o, target: o });
          })
          .transition().duration(250)
          .attr('d', d => diagonal({ source: d.source, target: d.target })),
      update => update.transition().duration(250)
          .attr('d', d => diagonal({ source: d.source, target: d.target })),
      exit => exit.transition().duration(250)
          .attr('d', () => {
            const o = { x: source.x, y: source.y };
            return diagonal({ source: o, target: o });
          })
          .remove()
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

    root.each(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  update(root);
}
