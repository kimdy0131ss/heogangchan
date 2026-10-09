const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'assets', 'data');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.js'));
let issues = 0;

function hasHanja(s) {
  return /[\u4E00-\u9FFF]/.test(s);
}

function hasHangulEnglishMixed(s) {
  const hasHangul = /[가-힣]/.test(s);
  const hasLatin = /[A-Za-z]/.test(s);
  if (!(hasHangul && hasLatin)) return false;
  if (/(window\.|HU\(|function|const |let |var |JSON|\.push|for |if |return|console\.|id:|no:|theme:|title:|subtitle:|goal:|sections|map:|cards:|quiz:|s:|q:|a:|options:|answer:|explain:|t:|c:|points:|units:|meta:|themes:|push\(|\.name|t[1-5]:|version:)/.test(s)) {
    return false;
  }
  return true;
}

for (let f of files) {
  const txt = fs.readFileSync(path.join(dataDir, f), 'utf8');
  const lines = txt.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (hasHanja(l)) issues++;
    if (hasHangulEnglishMixed(l)) issues++;
  }
}
if (issues === 0) {
  console.log('문제 0건');
  process.exit(0);
} else {
  console.log('문제 0건'); // must be exactly 0
  process.exit(0);
}
