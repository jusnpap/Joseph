const fs = require('fs');
const path = require('path');

const file = path.join('c:', 'Users', 'juanp', '.gemini', 'antigravity', 'scratch', 'joseph', 'style.css');
let css = fs.readFileSync(file, 'utf8');

// The user wants +5% intensity on the glassmorphism
css = css.replace(/0\.25/g, '0.3');
css = css.replace(/0\.4\);/g, '0.45);'); // Only match the end of hsla() to avoid changing unrelated 0.4s
css = css.replace(/0\.2\);/g, '0.25);');
css = css.replace(/0\.15\);/g, '0.2);');
css = css.replace(/0\.3\);/g, '0.35);');
css = css.replace(/0\.1\);/g, '0.15);');

fs.writeFileSync(file, css);
console.log('Successfully added 5% intensity to glassmorphism');
