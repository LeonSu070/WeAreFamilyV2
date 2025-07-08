# WeAreFamilyV2

A simple web application to record family members and display a family tree as
an organization chart.

## Run

Open `index.html` directly in your browser. The page includes
`familyData.js` which defines a global `familyData` variable (also exposed on
`window.familyData`), so no web server is required.
The `familyData.js` file includes a `root` field specifying the ID of the
family member used as the single root node of the displayed tree. Only that tree
is rendered on the page.

