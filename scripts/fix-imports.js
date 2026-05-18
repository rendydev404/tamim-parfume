const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const shopDir = path.join(process.cwd(), 'app', '(shop)');
walkDir(shopDir, (filePath) => {
  if (filePath.endsWith('page.tsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Remove imports correctly using multiline/regex matching any newline
    content = content.replace(/import\s+Header\s+from\s+['"].+Header['"];?[\r\n]*/g, '');
    content = content.replace(/import\s+Footer\s+from\s+['"].+Footer['"];?[\r\n]*/g, '');
    content = content.replace(/import\s+MobileNav\s+from\s+['"].+MobileNav['"];?[\r\n]*/g, '');
    
    fs.writeFileSync(filePath, content);
  }
});
console.log('Done fixing imports');
