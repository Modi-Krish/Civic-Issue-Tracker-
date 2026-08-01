const fs = require('fs');
const envPath = 'd:\\civic_issue_tracker\\civic_issue_tracker\\.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
});

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

async function seed() {
  const db = getFirestore();
  console.log('Seeding historical complaint dataset for spatial-temporal pattern detection...');

  const baseLocation = { lat: 22.3072, lng: 73.1812, label: 'MG Road Junction' };

  // Create 5 recurring water pipe burst incidents spaced ~30 days apart
  const dates = [
    new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 92 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 61 * 24 * 60 * 60 * 1000),
    new Date(Date.now() - 61 * 24 * 60 * 60 * 1000 + 4 * 3600 * 1000), // Duplicate complaint within 24h
    new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
  ];

  for (let i = 0; i < dates.length; i++) {
    const docRef = await db.collection('issues').add({
      title: `Water Pipe Burst Cluster Incident #${i + 1}`,
      description: 'Major underground main pipeline leak causing water logging at MG Road.',
      issue_type: 'Water Leakage',
      department_id: 'water',
      location_lat: baseLocation.lat + (Math.random() - 0.5) * 0.0003, // Within ~30 meters
      location_lng: baseLocation.lng + (Math.random() - 0.5) * 0.0003,
      location_label: baseLocation.label,
      status: 'CLOSED',
      created_at: dates[i],
      updated_at: dates[i]
    });
    console.log(`Seeded issue ${docRef.id} for date ${dates[i].toISOString()}`);
  }

  console.log('Seeding complete! Triggering detection engine...');
}

seed().catch(console.error);
