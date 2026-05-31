const fs = require('fs');
const path = require('path');

const file = path.join('c:', 'Users', 'juanp', '.gemini', 'antigravity', 'scratch', 'joseph', 'style.css');
let css = fs.readFileSync(file, 'utf8');

// Add the variables to :root
if (!css.includes('--glass-s: 30%;')) {
    css = css.replace(
        /--bg-glass: hsla\(var\(--primary-hue\), 30%, 95%, 0\.7\);/g,
        '--glass-s: 30%;\n    --glass-l: 95%;\n    --bg-glass: hsla(var(--primary-hue), var(--glass-s), var(--glass-l), 0.7);'
    );
    css = css.replace(
        /--bg-glass-strong: hsla\(var\(--primary-hue\), 30%, 98%, 0\.9\);/g,
        '--bg-glass-strong: hsla(var(--primary-hue), var(--glass-s), 98%, 0.9);'
    );
    css = css.replace(
        /--border-color: hsla\(var\(--primary-hue\), 30%, 85%, 0\.8\);/g,
        '--border-color: hsla(var(--primary-hue), var(--glass-s), 85%, 0.8);'
    );
    css = css.replace(
        /--border-glass: hsla\(var\(--primary-hue\), 30%, 95%, 0\.4\);/g,
        '--border-glass: hsla(var(--primary-hue), var(--glass-s), var(--glass-l), 0.4);'
    );
}

// Add variables to [data-theme="dark"]
if (!css.includes('--glass-s: 40%;')) {
    css = css.replace(
        /--bg-glass: hsla\(var\(--primary-hue\), 40%, 15%, 0\.6\);/g,
        '--glass-s: 40%;\n    --glass-l: 15%;\n    --bg-glass: hsla(var(--primary-hue), var(--glass-s), var(--glass-l), 0.6);'
    );
    css = css.replace(
        /--bg-glass-strong: hsla\(var\(--primary-hue\), 40%, 20%, 0\.9\);/g,
        '--bg-glass-strong: hsla(var(--primary-hue), var(--glass-s), 20%, 0.9);'
    );
    css = css.replace(
        /--border-color: hsla\(var\(--primary-hue\), 40%, 30%, 0\.6\);/g,
        '--border-color: hsla(var(--primary-hue), var(--glass-s), 30%, 0.6);'
    );
    css = css.replace(
        /--border-glass: hsla\(var\(--primary-hue\), 40%, 40%, 0\.1\);/g,
        '--border-glass: hsla(var(--primary-hue), var(--glass-s), 40%, 0.1);'
    );
}

// Replace all hardcoded rgba(255, 255, 255, X) with the dynamic tint
css = css.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*([0-9.]+)\s*\)/g, 'hsla(var(--primary-hue), var(--glass-s), var(--glass-l), $1)');

fs.writeFileSync(file, css);
console.log('Successfully updated style.css');
