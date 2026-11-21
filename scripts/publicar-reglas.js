// Publica firestore.rules en Firebase usando la llave de la cuenta de servicio (Admin SDK).
const fs = require('fs');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'appcasarosada' });
admin.securityRules()
  .releaseFirestoreRulesetFromSource(fs.readFileSync('firestore.rules', 'utf8'))
  .then(r => { console.log('Reglas publicadas en Firebase:', r.name); process.exit(0); })
  .catch(e => { console.error('No se pudieron publicar las reglas:', e.message || e); process.exit(1); });
