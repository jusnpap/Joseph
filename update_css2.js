const fs = require('fs');
const path = require('path');

const file = path.join('c:', 'Users', 'juanp', '.gemini', 'antigravity', 'scratch', 'joseph', 'style.css');
let css = fs.readFileSync(file, 'utf8');

// Make :root glass much more transparent
css = css.replace(/--bg-glass: hsla\(var\(--primary-hue\), var\(--glass-s\), var\(--glass-l\), 0\.7\);/g, '--bg-glass: hsla(var(--primary-hue), var(--glass-s), var(--glass-l), 0.25);');
css = css.replace(/--bg-glass-strong: hsla\(var\(--primary-hue\), var\(--glass-s\), 98%, 0\.9\);/g, '--bg-glass-strong: hsla(var(--primary-hue), var(--glass-s), 98%, 0.4);');
css = css.replace(/--border-glass: hsla\(var\(--primary-hue\), var\(--glass-s\), var\(--glass-l\), 0\.4\);/g, '--border-glass: hsla(var(--primary-hue), var(--glass-s), var(--glass-l), 0.2);');

// Make Dark Mode glass much more transparent
css = css.replace(/--bg-glass: hsla\(var\(--primary-hue\), var\(--glass-s\), var\(--glass-l\), 0\.6\);/g, '--bg-glass: hsla(var(--primary-hue), var(--glass-s), var(--glass-l), 0.15);');
css = css.replace(/--bg-glass-strong: hsla\(var\(--primary-hue\), var\(--glass-s\), 20%, 0\.9\);/g, '--bg-glass-strong: hsla(var(--primary-hue), var(--glass-s), 20%, 0.3);');

// Replace the replaced hsla values (0.4 -> 0.15, 0.5 -> 0.2, 0.6 -> 0.25)
css = css.replace(/hsla\(var\(--primary-hue\), var\(--glass-s\), var\(--glass-l\), 0\.4\)/g, 'hsla(var(--primary-hue), var(--glass-s), var(--glass-l), 0.15)');
css = css.replace(/hsla\(var\(--primary-hue\), var\(--glass-s\), var\(--glass-l\), 0\.5\)/g, 'hsla(var(--primary-hue), var(--glass-s), var(--glass-l), 0.2)');
css = css.replace(/hsla\(var\(--primary-hue\), var\(--glass-s\), var\(--glass-l\), 0\.6\)/g, 'hsla(var(--primary-hue), var(--glass-s), var(--glass-l), 0.25)');
css = css.replace(/hsla\(var\(--primary-hue\), var\(--glass-s\), var\(--glass-l\), 0\.3\)/g, 'hsla(var(--primary-hue), var(--glass-s), var(--glass-l), 0.1)');

fs.writeFileSync(file, css);
console.log('Successfully updated opacities for more glassmorphism');
