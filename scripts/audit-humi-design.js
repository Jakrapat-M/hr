const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src', 'frontend', 'src');

const RED_HEX_REGEX = /#(C8102E|C8553D|E08864|DC2626|EF4444|dc2626|ef4444)/i;
const RED_CLASS_REGEX = /\b(text|bg|border|ring|divide)-red-\d+/;
const RAW_TABLE_REGEX = /<table\b/;
const LEGACY_CARD_REGEX = /className="humi-card\b/;
const INLINE_STYLE_REGEX = /style=\{\{[^}]*(color|background|padding|margin|fontSize|fontWeight|display|flexDirection|gap|width|height)/i;

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '__tests__' && file !== 'tests') {
        walk(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = walk(SRC_DIR);
const violations = [];

for (const file of allFiles) {
  const relativePath = path.relative(path.join(__dirname, '..'), file);
  const content = fs.readFileSync(file, 'utf8');
  
  const fileViolations = [];
  
  if (RED_HEX_REGEX.test(content)) {
    fileViolations.push('Banned Red Hex Code');
  }
  if (RED_CLASS_REGEX.test(content)) {
    fileViolations.push('Banned Red Tailwind Class');
  }
  if (RAW_TABLE_REGEX.test(content) && !file.includes('DataTable.tsx') && !file.includes('DataTable.test.tsx')) {
    fileViolations.push('Raw HTML <table> Element');
  }
  if (LEGACY_CARD_REGEX.test(content)) {
    fileViolations.push('Legacy humi-card Class');
  }
  if (INLINE_STYLE_REGEX.test(content) && !file.includes('LetterGeneratorModal.tsx')) {
    fileViolations.push('Inline styles overriding design tokens');
  }

  if (fileViolations.length > 0) {
    violations.push({
      file: relativePath,
      issues: fileViolations
    });
  }
}

console.log(JSON.stringify(violations, null, 2));
