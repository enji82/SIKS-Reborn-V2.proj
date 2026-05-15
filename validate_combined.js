const fs = require('fs');

function include(filename) {
    let path = `/Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/${filename}.html`;
    if (!fs.existsSync(path)) return `<!-- ${filename} not found -->`;
    return fs.readFileSync(path, 'utf8');
}

let index = fs.readFileSync('/Users/macbookpro/Documents/GitHub/SIKS-Reborn-V2.proj/index.html', 'utf8');
let combined = index.replace(/<\?!= include\('(.*?)'\); \?>/g, (match, p1) => {
    return include(p1);
});

// Extract all script blocks
let scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
let match;
let scriptContent = "";
while ((match = scriptRegex.exec(combined)) !== null) {
    scriptContent += match[1] + "\n";
}

fs.writeFileSync('all_scripts.js', scriptContent);
try {
    const { execSync } = require('child_process');
    execSync('node -c all_scripts.js');
    console.log("SUCCESS: Combined scripts are syntactically valid.");
} catch (e) {
    console.log("ERROR in combined scripts:");
    console.log(e.stderr.toString());
}
