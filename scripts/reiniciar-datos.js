// Respaldo y reinicio de los datos de operación (se ejecuta solo desde GitHub Actions, nunca desde la app).
// 1) Copia todo a respaldos/<fecha>/<colección>/<id> (solo accesible con la llave de servicio; la app no puede leerlo).
// 2) Borra: tickets, ingresos y egresos, soportes, aperturas y cierres, arqueos, movimientos de crédito y todo lo del modo «No guardar datos».
// 3) El consecutivo de tickets vuelve a 0 (el próximo será 000001).
// Conserva: usuarios, accesos, mesas, carta, menús, clientes de domicilio, clientes con crédito y datos del negocio.
const fs = require('fs');
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'appcasarosada' });
const db = admin.firestore();
const OPERACION = ['vales', 'movimientos', 'soportes', 'soportesMov', 'cierres', 'arqueos', 'creditoMovs'];
const ENSAYO = ['vales', 'movimientos', 'soportes', 'creditoMovs', 'clientes', 'menus', 'cierres', 'soportesMov', 'arqueos', 'config'].map(c => 'ensayo_' + c);
const FECHA = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10); // fecha de Colombia
const raizRespaldo = db.collection('respaldos').doc(FECHA + '-' + Date.now());

async function respaldar(nombre) {
  const s = await db.collection(nombre).get(); let n = 0;
  for (let i = 0; i < s.docs.length; i += 20) {
    const b = db.batch(); s.docs.slice(i, i + 20).forEach(d => b.set(raizRespaldo.collection(nombre).doc(d.id), d.data())); await b.commit(); n += Math.min(20, s.docs.length - i);
  }
  return n;
}
async function vaciar(nombre) {
  let total = 0;
  for (;;) { const s = await db.collection(nombre).limit(200).get(); if (s.empty) break;
    const b = db.batch(); s.docs.forEach(d => b.delete(d.ref)); await b.commit(); total += s.size; }
  return total;
}
(async () => {
  const r = { fecha: new Date().toISOString(), respaldo: raizRespaldo.path, respaldados: {}, borrados: {} };
  const cont = await db.collection('config').doc('contador').get();
  const todas = [...OPERACION, ...ENSAYO];
  for (const c of todas) r.respaldados[c] = await respaldar(c);
  await raizRespaldo.set({ fecha: r.fecha, contadorAnterior: cont.exists ? cont.data() : null, conteos: r.respaldados });
  // Solo se borra si el respaldo quedó completo
  for (const c of todas) { const n = (await raizRespaldo.collection(c).count().get()).data().count; if (n !== r.respaldados[c]) throw new Error('Respaldo incompleto en ' + c); }
  for (const c of todas) r.borrados[c] = await vaciar(c);
  await db.collection('config').doc('contador').set({ n: 0 });
  r.contador = 'reiniciado (próximo ticket 000001); antes iba en ' + (cont.exists ? cont.data().n : 0);
  const conservados = {};
  for (const c of ['users', 'logins', 'mesas', 'productos', 'menus', 'clientes', 'creditos']) conservados[c] = (await db.collection(c).count().get()).data().count;
  r.conservados = conservados;
  for (const k of Object.keys(r.respaldados)) if (!r.respaldados[k]) { delete r.respaldados[k]; delete r.borrados[k]; }
  console.log(JSON.stringify(r, null, 2));
  fs.writeFileSync('scripts/reinicio-resultado.json', JSON.stringify(r, null, 2) + '\n');
  process.exit(0);
})().catch(e => { console.error('Error en el reinicio (no se borró nada si falló el respaldo):', e.message || e); process.exit(1); });
