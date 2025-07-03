fetch('/family')
  .then(res => res.json())
  .then(list => drawTree(buildHierarchy(list)))
  .catch(err => console.error(err));

function buildHierarchy(list) {
  const idMap = new Map();
  list.forEach(member => {
    member.name = `${member.first_name}${member.last_name}`;
    member.children = [];
    idMap.set(member.id, member);
  });

  const root = { name: 'Family Tree', children: [] };
  list.forEach(member => {
    if (member.parent_id && idMap.has(member.parent_id)) {
      idMap.get(member.parent_id).children.push(member);
    } else {
      root.children.push(member);
    }
  });

  list.forEach(member => {
    if (member.children.length === 0) {
      delete member.children;
    }
  });

  return root;
}

function drawTree(data) {
  const width = 600;
  const dx = 10;
  const dy = 100;
  const tree = d3.tree().nodeSize([dx, dy]);
  const diagonal = d3.linkHorizontal().x(d => d.y).y(d => d.x);

  const root = d3.hierarchy(data);
  root.x0 = dy / 2;
  root.y0 = 0;
  tree(root);

  let x0 = Infinity;
  let x1 = -x0;
  root.each(d => {
    if (d.x > x1) x1 = d.x;
    if (d.x < x0) x0 = d.x;
  });

  const svg = d3.select('#chart').append('svg')
      .attr('viewBox', [0, 0, width, x1 - x0 + dx * 2])
      .style('font', '10px sans-serif')
      .style('user-select', 'none');

  const g = svg.append('g')
      .attr('transform', `translate(${dy / 3},${dx - x0})`);

  const link = g.append('g')
      .attr('fill', 'none')
      .attr('stroke', '#555')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.5)
    .selectAll('path')
    .data(root.links())
    .join('path')
      .attr('d', diagonal);

  const node = g.append('g')
    .selectAll('g')
    .data(root.descendants())
    .join('g')
      .attr('transform', d => `translate(${d.y},${d.x})`);

  node.append('circle')
      .attr('fill', d => d.children ? '#555' : '#999')
      .attr('r', 4.5);

  node.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.children ? -6 : 6)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => d.data.name)
    .clone(true).lower()
      .attr('stroke', 'white');
}
