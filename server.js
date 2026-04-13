// server.js — Tiny Express static server for Railway
const express = require(‘express’);
const path    = require(‘path’);

const app  = express();
const PORT = process.env.PORT || 3000;

// Serve everything in /public
app.use(express.static(path.join(__dirname, ‘public’)));

// All routes → index.html (SPA-style navigation)
app.get(’*’, (req, res) => {
res.sendFile(path.join(__dirname, ‘public’, ‘index.html’));
});

app.listen(PORT, () => {
console.log(`NAUTICA running on http://localhost:${PORT}`);
});