const fs   = require('fs');
const path = require('path');

// Strips emoji unicode characters from a string
function stripEmojis(str) {
  return str.replace(
    /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F1FF}]|[\u{1F200}-\u{1F2FF}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F171}]|[\u{1F17E}-\u{1F17F}]|[\u{1F18E}]|[\u{3030}]|[\u{2B50}]|[\u{2B55}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{3297}]|[\u{3299}]|[\u{303D}]|[\u{00A9}]|[\u{00AE}]|[\u{2122}]|[\u{23F3}]|[\u{24C2}]|[\u{23E9}-\u{23F3}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270C}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]/gu,
    ''
  ).replace(/\s{2,}/g, ' '); // collapse double spaces left by removed emojis
}

// Replace common emoji text patterns in console.log strings
function replaceEmojiPatterns(str) {
  return str
    .replace(/✅/g,  '[OK]')
    .replace(/❌/g,  '[ERROR]')
    .replace(/⚠️/g,  '[WARN]')
    .replace(/⚠/g,   '[WARN]')
    .replace(/🔥/g,  '[HOT]')
    .replace(/🚀/g,  '[START]')
    .replace(/💡/g,  '[INFO]')
    .replace(/🔑/g,  '[KEY]')
    .replace(/📦/g,  '[PKG]')
    .replace(/🌱/g,  '[GROWER]')
    .replace(/💧/g,  '[WATER]')
    .replace(/🧪/g,  '[LAB]')
    .replace(/📊/g,  '[DATA]')
    .replace(/🤖/g,  '[AI]')
    .replace(/🛡/g,   '[SHIELD]')
    .replace(/🔒/g,  '[LOCK]')
    .replace(/📧/g,  '[EMAIL]')
    .replace(/📱/g,  '[MOBILE]')
    .replace(/🌍/g,  '[GLOBE]')
    .replace(/📍/g,  '[PIN]')
    .replace(/⚡/g,  '[FAST]');
}

const targets = [
  path.join(__dirname, 'server.js'),
  path.join(__dirname, 'src', 'Auth.js'),
  path.join(__dirname, 'db.js'),
];

// Add all route files
const routesDir = path.join(__dirname, 'routes');
if (fs.existsSync(routesDir)) {
  fs.readdirSync(routesDir)
    .filter(f => f.endsWith('.js'))
    .forEach(f => targets.push(path.join(routesDir, f)));
}

let totalFixed = 0;

targets.forEach(fp => {
  if (!fs.existsSync(fp)) return;
  let c = fs.readFileSync(fp, 'utf8');
  const before = c;
  c = replaceEmojiPatterns(c);
  c = stripEmojis(c);
  if (c !== before) {
    fs.writeFileSync(fp, c, 'utf8');
    totalFixed++;
    console.log('[FIXED]', path.relative(__dirname, fp));
  }
});

console.log(`\nDone. ${totalFixed} files stripped of emojis.`);