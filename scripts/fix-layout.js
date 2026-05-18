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
    
    // Remove imports
    content = content.replace(/import\s+Header\s+from\s+['"].*Header['"].*\n/g, '');
    content = content.replace(/import\s+Footer\s+from\s+['"].*Footer['"].*\n/g, '');
    content = content.replace(/import\s+MobileNav\s+from\s+['"].*MobileNav['"].*\n/g, '');
    
    // Remove components
    content = content.replace(/\s*<Header\s*\/>\s*/g, '\n');
    content = content.replace(/\s*<Footer\s*\/>\s*/g, '\n');
    content = content.replace(/\s*<MobileNav\s*\/>\s*/g, '\n');
    
    fs.writeFileSync(filePath, content);
    console.log('Fixed', filePath);
  }
});
