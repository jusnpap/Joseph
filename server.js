const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3845;

// Figma API token (provided by user)
const FIGMA_TOKEN = process.env.FIGMA_TOKEN || 'YOUR_FIGMA_TOKEN_HERE';

// Helper to call Figma API
async function fetchFromFigma(endpoint) {
  const url = `https://api.figma.com/v1/${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'X-Figma-Token': FIGMA_TOKEN
    }
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Figma API error ${response.status}: ${err}`);
  }
  return response.json();
}

// Example endpoint: get file nodes
app.get('/figma/file/:fileId', async (req, res) => {
  const { fileId } = req.params;
  try {
    const data = await fetchFromFigma(`files/${fileId}`);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/health', (req, res) => res.send('Figma server is up'));

app.listen(PORT, () => {
  console.log(`Figma server listening on port ${PORT}`);
});
