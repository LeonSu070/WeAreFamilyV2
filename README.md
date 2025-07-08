# WeAreFamilyV2

A simple web application to record family members and display a family tree as
an organization chart.

## Run

Serve the repository using any static HTTP server. For example, run:

```
python3 -m http.server
```

and then open `http://localhost:8000/public/` in your browser.

The `data/family.json` file now includes a `root` field specifying the ID of the
family member used as the single root node of the displayed tree. Only that
tree is rendered on the page.

