const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'assets', 'data');
const corePath = path.join(dataDir, 'core.js');
let core = fs.readFileSync(corePath, 'utf8');
const HURe = /window\.HU\s*=\s*function[^\n]+/;
core = fs.readFileSync(corePath, 'utf8');
// just require style via node? easier to load in browser context not possible; parse units by finding push blocks
const files = fs.readdirSync(dataDir).filter(f => f.match(/^u\d+\.js$/));
let units = [];
for (let f of files) {
  const txt = fs.readFileSync(path.join(dataDir, f), 'utf8');
  // extract unit object roughly
  const m = txt.match(/window\.HDATA\.units\.push\(\{([\s\S]*?)\}\);/);
  if (m) {
    // simple parse: extract id, no, theme
    const obj = {};
    const idm = m[1].match(/id\s*:\s*['"]([^'"]+)['"]/);
    const nom = m[1].match(/no\s*:\s*(\d+)/);
    const themem = m[1].match(/theme\s*:\s*['"]([^'"]+)['"]/);
    if (idm) obj.id = idm[1];
    if (nom) obj.no = parseInt(nom[1]);
    if (themem) obj.theme = themem[1];
    units.push({id: obj.id, no: obj.no, theme: obj.theme, text: m[1]});
  }
}
units.sort((a,b)=>a.no-b.no);

// load cards/quiz
for (let u of units) {
  const cfile = path.join(dataDir, u.id + 'c.js');
  const zfile = path.join(dataDir, u.id + 'z.js');
  if (fs.existsSync(cfile)) {
    const txt = fs.readFileSync(cfile, 'utf8');
    const cm = txt.match(/u\.cards\s*=\s*(\[[\s\S]*?\]);/);
    if (cm) {
      try {
        // quick eval safe enough? just count via regex
        u.cardCount = (cm[1].match(/\{[^}]*s\s*:/g)||[]).length;
        // get section counts
        const secs = {};
        const re = /\{\s*s\s*:\s*['"]([^'"]+)['"]/g;
        let mm;
        while ((mm = re.exec(cm[1]))) {
          secs[mm[1]] = (secs[mm[1]]||0)+1;
        }
        u.secCard = secs;
      } catch(e) { u.cardCount=0; u.secCard={}; }
    } else u.cardCount=0;
  } else u.cardCount=0;
  if (fs.existsSync(zfile)) {
    const txt = fs.readFileSync(zfile, 'utf8');
    const zm = txt.match(/u\.quiz\s*=\s*(\[[\s\S]*?\]);/);
    if (zm) {
      try {
        const items = zm[1].split(/\}\s*,/).length;
        u.quizCount = (zm[1].match(/answer\s*:\s*(\d)/g)||[]).length;
        // better count objects
        const re = /\{[^}]*answer\s*:\s*(\d)[^}]*\}/g;
        let mm, cnt=0, dist=[0,0,0,0];
        while ((mm = re.exec(zm[1]))) {
          cnt++; dist[parseInt(mm[1])]++;
        }
        u.quizCount=cnt; u.dist=dist;
      } catch(e) { u.quizCount=0; u.dist=[0,0,0,0]; }
    } else u.quizCount=0;
  } else u.quizCount=0;
}

let ok = true;
for (let u of units) {
  if (u.cardCount < 20) { console.log('카드 부족:', u.id, u.cardCount); ok=false; }
  if (u.quizCount < 10) { console.log('퀴즈 부족:', u.id, u.quizCount); ok=false; }
  // check per section >=4
  for (let k in u.secCard) {
    if (u.secCard[k] < 4) { console.log('절별 부족:', u.id, k, u.secCard[k]); ok=false; }
  }
  // dist all >=2?
  for (let i=0;i<4;i++) {
    if (u.dist && u.dist[i] < 2) { console.log('정답분포 부족:', u.id, i, u.dist[i]); ok=false; }
  }
  // check a <=65
  const cfile = path.join(dataDir, u.id + 'c.js');
  if (fs.existsSync(cfile)) {
    const txt = fs.readFileSync(cfile, 'utf8');
    const re = /a\s*:\s*['"]([^'"]*)['"]/g;
    let mm;
    while ((mm = re.exec(txt))) {
      if (mm[1].length > 65) { console.log('a>65:', u.id, mm[1].length); ok=false; }
    }
  }
}

if (!ok) {
  console.log('목표 미달');
  process.exit(1);
} else {
  console.log('카드 ' + units.reduce((s,x)=>s+x.cardCount,0) + '장 / 퀴즈 ' + units.reduce((s,x)=>s+x.quizCount,0) + '문');
  console.log('모든 조건 충족');
  process.exit(0);
}
