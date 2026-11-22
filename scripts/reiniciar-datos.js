// Reinicio único de los datos de operación (se ejecuta solo desde GitHub Actions, nunca desde la app).
// Borra: tickets (vales), ingresos y egresos (movimientos), fotos de soporte, menús del día y clientes de domicilio.
// Reinicia el consecutivo de tickets a 0 (el próximo será 000001).
// Conserva: usuarios, accesos (logins), mesas, productos de la carta y datos del negocio (permisos, QR).
const fs = require('fs');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'appcasarosada' });
const db = admin.firestore();
const COLECCIONES = ['vales', 'movimientos', 'soportes', 'menus', 'clientes'];

async function vaciar(nombre) {
  let total = 0;
  for (;;) {
    const s = await db.collection(nombre).limit(400).get();
    if (s.empty) break;
    const b = db.batch(); s.docs.forEach(d => b.delete(d.ref)); await b.commit();
    total += s.size;
  }
  return total;
}
(async () => {
  const resultado = { fecha: new Date().toISOString(), borrados: {} };
  for (const c of COLECCIONES) resultado.borrados[c] = await vaciar(c);
  await db.collection('config').doc('contador').set({ n: 0 });
  resultado.contador = 'reiniciado (próximo ticket 000001)';
  const conservados = {};
  for (const c of ['users', 'logins', 'mesas', 'productos']) conservados[c] = (await db.collection(c).count().get()).data().count;
  conservados.negocio = (await db.collection('config').doc('negocio').get()).exists;
  resultado.conservados = conservados;
  console.log(JSON.stringify(resultado, null, 2));
  fs.writeFileSync('scripts/reinicio-resultado.json', JSON.stringify(resultado, null, 2) + '\n');
  process.exit(0);
})().catch(e => { console.error('Error en el reinicio:', e.message || e); process.exit(1); });
