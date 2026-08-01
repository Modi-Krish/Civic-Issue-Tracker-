const fs = require('fs');
const envPath = 'd:\\civic_issue_tracker\\civic_issue_tracker\\.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = val;
  }
});

async function run() {
  console.log('Testing Detection Engine via server API...');
  const res = await fetch('http://localhost:3000/api/analytics/run-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forceFullRescan: true })
  });
  const data = await res.json();
  console.log('Detection Engine Output:', JSON.stringify(data, null, 2));
}

run().catch(console.error);
