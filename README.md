# WeAreFamilyV2

A simple web application to record family members and display a family tree as
an organization chart.

## Run

Open `index.html` directly in your browser. The page includes
`familyData.js` which defines a global `familyData` variable, so no web server is required.
The `familyData.js` file includes a `root` field specifying the ID of the
family member used as the single root node of the displayed tree. Only that
tree is rendered on the page.

## Interactions

- **Single click** a member or spouse to toggle display of their children.
- **Double click** (or double tap on touch screens) a member or spouse to reload the tree using that person as the new root.
- **Click the up arrow** above the root node to reload the tree using its parent when available.
- Single-click actions wait a short delay so that a double click will cancel them.
- On touch screens, a tap only registers once your finger lifts; holding a touch without releasing does nothing.

## Customizing Data

The tree data lives in `familyData.js`. You can pass a `root_id` query parameter
when opening `index.html` to start from a different root member.

