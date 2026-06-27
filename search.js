const fs = require('fs');
try {
  const code = fs.readFileSync('./app.js', 'utf8');
  console.log("File length: " + code.length);
  let matches = 0;
  code.split('\n').forEach((line, i) => {
    if (line.includes('location.reload') || line.includes('reload(') || line.includes('sw.js') || line.includes('controllerchange')) {
      console.log((i+1) + ': ' + line.trim());
      matches++;
    }
  });
  console.log("Matches: " + matches);
} catch (e) {
  console.log("CRASH: " + e.stack);
}
