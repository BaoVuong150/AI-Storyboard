const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'dist', '_expo', 'static', 'js', 'web');

if (!fs.existsSync(dir)) {
  console.log('Không tìm thấy thư mục dist web');
  process.exit(0);
}

const files = fs.readdirSync(dir);
for (const file of files) {
  if (file.endsWith('.js')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('import.meta')) {
      content = content.replace(/import\.meta\.env/g, '({MODE:"production"})');
      content = content.replace(/import\.meta/g, '({env:{MODE:"production"}})');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Đã diệt tận gốc import.meta trong', file);
    }
  }
}
