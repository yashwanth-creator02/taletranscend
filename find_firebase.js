// find_firebase.js

import fs from 'fs';
import path from 'path';

const searchTerms = ['@firebase/firestore', 'firebase', './firestore'];
const directoryToScan = './js'; // Scans your js folder

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules') scanDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (searchTerms.some((term) => line.includes(term))) {
          console.log(`MATCH found in ${fullPath} (Line ${index + 1}):`);
          console.log(`   > ${line.trim()}`);
        }
      });
    }
  }
}

console.log('Searching for Firebase references...');
scanDir('./'); // Starts from project root
