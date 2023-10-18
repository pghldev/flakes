let child_process = require('node:child_process');

let tag = process.argv[2] || 'flakes-server';

child_process.execSync(`docker build . -t ${tag} -f server.Dockerfile`, {
  stdio: 'inherit',
  cwd: __dirname
})
