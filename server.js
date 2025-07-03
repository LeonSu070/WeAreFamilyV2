const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/family', (req, res) => {
  fs.readFile(path.join(__dirname, 'data', 'family.json'), 'utf-8', (err, data) => {
    if (err) {
      res.status(500).json({ error: 'Failed to load data' });
    } else {
      res.json(JSON.parse(data));
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
