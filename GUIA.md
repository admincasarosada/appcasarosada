# Casa Rosada POS: guía de instalación

La app tiene dos partes:

- **La página** (`index.html`). Es lo que se abre en el celular, la tablet o el computador.
- **La base de datos y los usuarios.** Se guardan en **Firebase** (de Google), que es gratis para el volumen de un restaurante. Así todos los equipos ven lo mismo en tiempo real, desde cualquier lugar.

Toma unos 20 minutos y solo se hace una vez.

---

## Paso 1. Crear el proyecto en Firebase

1. Entre a **https://console.firebase.google.com** con una cuenta de Google del restaurante.
2. Haga clic en **Crear proyecto**, póngale de nombre `casarosada-pos` y siga los pasos. Google Analytics no es necesario.
3. En el menú izquierdo vaya a **Compilación → Authentication → Comenzar**. Active el método **Correo electrónico/contraseña** y guarde.
4. Vaya a **Compilación → Firestore Database → Crear base de datos**:
   - Ubicación: `southamerica-east1` (São Paulo) o `us-east1`.
   - Modo: **producción**.
5. Dentro de Firestore, abra la pestaña **Reglas**. Borre lo que hay, pegue todo el contenido del archivo `firestore.rules` y haga clic en **Publicar**.

## Paso 2. Conectar la página con Firebase

1. En Firebase, haga clic en el engranaje ⚙ → **Configuración del proyecto**. En **Tus apps**, toque el ícono **</>** (web).
2. Ponga de nombre "POS" y registre la app. No marque Hosting.
3. Firebase muestra un bloque `const firebaseConfig = { apiKey: ..., ... }`. Copie solo lo que está entre llaves.
4. Abra `index.html` con el Bloc de notas y busque esta línea:
   ```
   const FIREBASE_CONFIG = null;
   ```
   Reemplácela por la configuración, así:
   ```
   const FIREBASE_CONFIG = {
     apiKey: "AIza...",
     authDomain: "casarosada-pos.firebaseapp.com",
     projectId: "casarosada-pos",
     storageBucket: "casarosada-pos.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```
5. Guarde el archivo.

> Esa configuración no es una contraseña: es normal que vaya en la página. La seguridad la dan los usuarios y las reglas del Paso 1.

## Paso 3. Publicar la página en internet (gratis)

La opción más fácil es **Netlify Drop**, donde solo se arrastra la carpeta:

1. Entre a **https://app.netlify.com/drop** y cree una cuenta gratis.
2. Arrastre la carpeta `casarosada-pos` completa al recuadro. Debe contener `index.html`, `manifest.json` y los íconos.
3. Netlify le da una dirección del tipo `https://nombre-raro.netlify.app`. En **Site configuration → Change site name** puede cambiarla a algo como `casarosada-pos.netlify.app`.
4. Cada vez que cambie `index.html`, vuelva a arrastrar la carpeta en **Deploys**.

## Paso 4. Primer ingreso y usuarios

1. Abra la dirección de la página. La primera vez aparece **Configuración inicial**. Cree ahí el administrador principal: nombre "Administrador P", usuario **AdminP** y su contraseña.
2. Entre a **Administración → Usuarios y permisos → Nuevo usuario** y cree el resto:

| Usuario | Rol |
|---|---|
| AdminR | Administrador |
| Mesero1 | Mesero |
| Mesero2 | Mesero |
| Mesero3 | Mesero |

3. En **Administración**, configure también:
   - **Datos del negocio:** NIT, dirección y teléfono que salen en el vale.
   - **Mesas.**
   - **Menú y precios.**

Al ingresar, el usuario no distingue mayúsculas: AdminP y adminp son lo mismo. La contraseña sí distingue mayúsculas.

**Contraseñas:** solo los administradores pueden cambiarlas, en **Usuarios y permisos → Cambiar clave**. Para eso se pide la contraseña actual de ese usuario. Los meseros no tienen ninguna opción para cambiar su contraseña. Si se olvida la contraseña de un mesero: desactívelo y créele un usuario nuevo (por ejemplo, Mesero1b).

## Paso 5. Instalarla en celulares y tablets

- **Android (Chrome):** abra la dirección → menú ⋮ → **Agregar a pantalla principal**.
- **iPhone (Safari):** abra la dirección → botón compartir → **Agregar a inicio**.

Queda como un ícono más, igual que una app.

---

## Roles y permisos

| Función | Administrador | Cajero | Mesero | Cocina |
|---|:-:|:-:|:-:|:-:|
| Ver mesas y tomar pedidos | ✅ | ✅ | ✅ | — |
| Imprimir vale y comanda | ✅ | ✅ | ✅ | — |
| Pantalla de cocina | ✅ | — | — | ✅ |
| Cobrar vales | ✅ | ✅ | — | — |
| Quitar productos ya enviados (con motivo) | ✅ | — | — | — |
| Anular vales (con motivo) | ✅ | — | — | — |
| Ingresos y egresos: registrar y corregir lo propio del día | ✅ | ✅ | — | — |
| Ingresos y egresos: editar cualquiera y anular | ✅ | — | — | — |
| Reportes del día | ✅ | ✅ | — | — |
| Reportes de otras fechas | ✅ | — | — | — |
| Menú, precios, mesas y usuarios | ✅ | — | — | — |

Los permisos se controlan **también en el servidor** con `firestore.rules`. Aunque alguien manipule la página, un mesero no puede cobrar, anular ni cambiar precios del menú.

## Cómo funciona el vale

1. El mesero toca la mesa, agrega productos (con notas como "sin cebolla") y toca **Enviar a cocina**. Se crea el **vale con número consecutivo** y el pedido aparece en la pantalla de cocina, con un aviso sonoro.
2. Si la mesa pide algo más, se agrega al **mismo vale**. En cocina aparece marcado como "NUEVO".
3. Cocina marca el pedido como **Empezar → Listo → Entregado**. En el plano de mesas aparece la etiqueta "LISTO".
4. Cuando el cliente pide la cuenta, el mesero toca **Pidió la cuenta** (la mesa se pone naranja) e imprime el **vale del cliente con código QR**.
5. En caja se **escanea el QR** con la cámara o con un lector de códigos USB, o se escribe el número. Se elige el medio de pago y se confirma. El vale queda **PAGADO** con fecha, hora, medio y quién cobró.
6. Si alguien presenta un vale ya pagado o anulado, la caja lo ve de inmediato con el sello correspondiente.
7. Los vales **nunca se borran**: solo el administrador los anula, con motivo, y todo queda en reportes.

## Ingresos y egresos

En la pestaña **Ingresos y egresos** (administrador y cajero) se registra todo el dinero que entra y sale.

**Para empezar:** registre un ingreso con concepto **"Saldo inicial"** en cada cuenta (Efectivo, Davivienda, Banco de Bogotá, Nequi) con el dinero que hay hoy.

**Datos de cada registro**
- **Tipo:** ingreso o egreso.
- **Estado:**
  - **Ejecutado:** el dinero ya entró o ya salió.
  - **Por ejecutar:** provisión de algo que aún no ha pasado, por ejemplo el arriendo del fin de mes o el pago de un evento.
- **Fecha** del movimiento, o fecha esperada si es una provisión.
- **Valor.**
- **Concepto.**
- **De dónde viene** (ingresos) o **responsable** (egresos).
- **Cuenta.**
- Opcionales: soporte y observaciones.

**Resumen de saldos (parte de arriba)**
- **Saldo real (sin provisiones):** lo que debería haber hoy en efectivo y en cada banco. Solo suma lo ejecutado, desde el inicio.
- **Saldo proyectado (con provisiones):** saldo real + ingresos por recibir − gastos por pagar.
- Una tabla por cuenta muestra saldo real, por recibir, por pagar y saldo proyectado, con subtotal de bancos y total general.
- Si una provisión pasó su fecha sin ejecutarse, aparece una alerta y la marca **VENCIDA**.

**Movimiento del período:** ingresos y egresos del rango de fechas elegido, separados en reales, provisionados y total con provisiones. Los "Saldo inicial" no se cuentan como ingresos del período.

**Ejecutar una provisión:** el botón **✔ Ejecutar** pide la fecha real, el valor real (puede ser distinto al provisionado) y la cuenta. Desde ese momento pasa al saldo real. El valor y la fecha provisionados quedan guardados.

**Otros botones**
- **Traer ventas de caja** pasa los vales cobrados del día como ingresos ejecutados, una línea por cuenta, sin duplicar.
- **Excel (CSV)** descarga los registros del período.

Los registros no se borran: el administrador los anula con motivo.

## Impresión

La app usa la impresión normal del navegador. Funciona con impresoras térmicas de 80 mm que estén instaladas en el equipo (USB, red o Bluetooth en Android con la app del fabricante). En el cuadro de impresión elija la impresora térmica y tamaño 80 mm.

## Importante: el vale no es factura

El vale es un **documento interno de control**. Para la DIAN, las ventas deben soportarse con factura electrónica o documento equivalente POS electrónico, emitido por un proveedor habilitado. Ese será el paso de integración contable.

## Próximos módulos planeados

- Tiquetera prepagada y créditos de clientes conocidos (saldo, abonos, cupo).
- Base de datos de clientes, con autorización de Habeas Data.
- Integración con software contable / facturación electrónica.
