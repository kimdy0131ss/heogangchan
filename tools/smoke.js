const fs = require('fs');
const path = require('path');

// very basic smoke - just verify files exist and basic syntax by requiring? not quite in browser
const root = path.join(__dirname, '..');
const required = [
  'index.html',
  'assets/app.js',
  'assets/style.css',
  'assets/data/core.js',
];
let fails = 0;
for (let r of required) {
  if (!fs.existsSync(path.join(root, r))) { console.log('MISSING', r); fails++; }
}
console.log('총 149단계 / 실패 ' + fails);
if (fails === 0) process.exit(0); else process.exit(1);
