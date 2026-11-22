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
   - **Datos del negocio:** NIT, dirección y teléfono que salen en el ticket.
   - **Mesas.**
   - **Menú y precios.**

Al ingresar, el usuario no distingue mayúsculas: AdminP y adminp son lo mismo. La contraseña sí distingue mayúsculas.

**Contraseñas:** solo los administradores las cambian, en **Usuarios y permisos → Cambiar clave**, sin necesidad de conocer la anterior. Si el usuario tiene la app abierta, se le cierra la sesión y debe ingresar con la nueva. Los meseros no tienen ninguna opción para cambiar contraseñas. **Eliminar** quita el acceso de un usuario; su nombre se conserva en los tickets y reportes anteriores. No se puede eliminar al único administrador ni a uno mismo.

## Paso 5. Instalarla en celulares y tablets

- **Android (Chrome):** abra la dirección → menú ⋮ → **Agregar a pantalla principal**.
- **iPhone (Safari):** abra la dirección → botón compartir → **Agregar a inicio**.

Queda como un ícono más, igual que una app.

---

## Roles y permisos

| Función | Administrador | Cajero | Mesero | Cocina |
|---|:-:|:-:|:-:|:-:|
| Ver mesas y tomar pedidos | ✅ | ✅ | ✅ | — |
| Imprimir ticket y comanda | ✅ | ✅ | ✅ | — |
| Pantalla de cocina | ✅ | — | — | ✅ |
| Cobrar tickets | ✅ | ✅ | — | — |
| Quitar productos ya enviados (con motivo) | ✅ | — | — | — |
| Anular tickets (con motivo) | ✅ | — | — | — |
| Ingresos y egresos: registrar y corregir lo propio del día | ✅ | ✅ | — | — |
| Ingresos y egresos: editar cualquiera y anular | ✅ | — | — | — |
| Reportes del día | ✅ | ✅ | — | — |
| Reportes de otras fechas | ✅ | — | — | — |
| Menú, precios, mesas y usuarios | ✅ | — | — | — |

Los permisos se controlan **también en el servidor** con `firestore.rules`. Aunque alguien manipule la página, un mesero no puede cobrar, anular ni cambiar precios del menú.

## Cómo funciona el ticket

1. El mesero toca la mesa, agrega productos (con notas como "sin cebolla") y toca **Enviar a cocina**. Se crea el **ticket con número consecutivo** y el pedido aparece en la pantalla de cocina, con un aviso sonoro.
2. Si la mesa pide algo más, se agrega al **mismo ticket**. En cocina aparece marcado como "NUEVO".
3. Cocina marca el pedido como **Empezar → Listo → Entregado**. En el plano de mesas aparece la etiqueta "LISTO".
4. Cuando el cliente pide la cuenta, el mesero toca **Pidió la cuenta** (la mesa se pone naranja) e imprime el **ticket del cliente con código QR**.
5. En caja se **escanea el QR** con la cámara o con un lector de códigos USB, o se escribe el número. Se elige el medio de pago y se confirma. El ticket queda **PAGADO** con fecha, hora, medio y quién cobró.
6. Si alguien presenta un ticket ya pagado o anulado, la caja lo ve de inmediato con el sello correspondiente.
7. Los tickets **nunca se borran**: solo el administrador los anula, con motivo, y todo queda en reportes.

## Nueva solicitud (toma de pedidos)

1. **Elegir el servicio:** Servicio a la mesa, Domicilio, Para llevar en icopor, Para llevar en plato o Productos varios. Aquí no se muestran precios; los recargos de cada modalidad se suman solos en el ticket.
2. **Mesa:** se abre el plano del piso; una mesa libre inicia el pedido y una ocupada abre su ticket para editarlo.
3. **Armar el ticket:** almuerzos y productos. El total aparece en el ticket.
4. **Editar:** el mesero puede agregar adicionales en cualquier momento y quitar lo que cocina aún no ha despachado (con motivo, que queda en el historial de caja). Si el ticket queda sin productos, se anula solo.
5. **Todo termina en caja:** cada ticket aparece en Caja desde que se crea y solo sale de ahí al cobrarse o anularse. Caja avisa si quedan tickets de días anteriores sin cerrar.

## Modo de pruebas (solo administrador)

El botón **🧪 Modo de pruebas** del encabezado abre una copia de práctica con un menú estándar y las mesas de los dos pisos. Con **"Ver como"** se cambia entre administrador, meseros (Andrés, Tania, Mateo), cocina y caja para recorrer todo el proceso en un solo equipo. Nada de lo que se registre ahí pasa al sistema real. **↺ Reiniciar datos** borra lo de prueba y **Salir de pruebas** vuelve al sistema real.

## Atención: cocina, servido y envío a caja

- **Cocina** ve solo los pedidos por despachar: mesas, mostrador y domicilios. Cada pedido muestra el tipo de servicio, el número de mesa o la dirección, las notas y los ajustes de cada plato, y un cronómetro.
- **DESPACHAR:** al sacar el plato o la caja, cocina presiona DESPACHAR y elige quién lo recibe (los meseros activos u "Otro"). Ese dato queda en el historial del ticket y en reportes.
- **Cronómetro:** cada pedido muestra la hora de carga y el tiempo transcurrido. Se pone naranja a los 15 min y rojo a los 25 min. Se detiene cuando el mesero marca **✓ Servido** (mesa) o **✓ Entregado** (domicilio o mostrador). Si se agregan adicionales después de servir, van a cocina y su cronómetro corre aparte.
- **Enviar a caja:** cuando el cliente se va, o el domiciliario regresa, el mesero presiona **💵 Enviar a caja**. La mesa queda libre y el pedido deja de aparecerle. En caja queda marcado como "ENVIADO A CAJA" para cobrarlo.
- **Caja** muestra el historial de atención de cada ticket: quién lo tomó, quién lo recibió de cocina, cuánto esperó el cliente, quién lo envió a caja y quién cobró.
- Los nombres que aparecen al despachar son los de los usuarios con rol Mesero. Se cambian en Administración → Usuarios (✎ junto al nombre).

## Domicilios

**Pestaña 🛵 Domicilios** (administración, caja y meseros):
- **En cocina:** domicilios pendientes de despacho, con cronómetro.
- **Listos para entregar:** cocina ya los despachó; muestra quién los lleva.
- **Entregado · cerrar:** el domiciliario indica cómo pagó el cliente (Efectivo, QR o Crédito) y el domicilio pasa a caja, donde se confirma el pago (si fue por QR, se elige la cuenta donde llegó).
- **Cerrados hoy:** historial del día con quién entregó, pago reportado, tiempo y estado en caja.


- **Crear un domicilio:** en **Mesas**, botón **🛵 Nuevo domicilio**. Disponible para administradores, cajeros y meseros.
- **Datos que se piden:** celular, nombre, dirección, barrio o indicaciones y, si aplica, el valor del domicilio (envío).
- **Clientes conocidos:** si el cliente autoriza guardar sus datos (Ley 1581 de 2012), la próxima vez basta con escribir su celular y se cargan solos.
- **Precios:** el domicilio se cobra con los precios para llevar.
- **Cocina:** lo ve marcado con 🛵 y la dirección. Al terminar, lo marca como **Despachado**.
- **Caja:** como todo pedido, pasa por caja para el cobro y el medio de pago. Se puede filtrar por Mesas, Mostrador o Domicilios.
- **Reportes:** muestran las ventas por tipo de servicio (mesas, para llevar y domicilios), con número de tickets, ventas, ticket promedio y porcentaje.

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
- **Cada cobro en caja se registra solo** como ingreso ejecutado en la cuenta elegida (concepto "Venta del restaurante", con el número de ticket).
- **Sincronizar ventas** completa, sin duplicar, los tickets pagados que hayan quedado sin ingreso (por ejemplo, por una falla de internet al cobrar).
- **Excel (CSV)** descarga los registros del período.

Los registros no se borran: el administrador los anula con motivo.

## Impresión

La app usa la impresión normal del navegador. Funciona con impresoras térmicas de 80 mm que estén instaladas en el equipo (USB, red o Bluetooth en Android con la app del fabricante). En el cuadro de impresión elija la impresora térmica y tamaño 80 mm.

## Importante: el ticket no es factura

El ticket es un **documento interno de control**. Para la DIAN, las ventas deben soportarse con factura electrónica o documento equivalente POS electrónico, emitido por un proveedor habilitado. Ese será el paso de integración contable.

## Próximos módulos planeados

- Tiquetera prepagada y créditos de clientes conocidos (saldo, abonos, cupo).
- Base de datos de clientes, con autorización de Habeas Data.
- Integración con software contable / facturación electrónica.


## Novedades v1.24.0
- **Modo mesero (administración y caja):** botón «🍽 Activar/Desactivar modo mesero» arriba. Encendido muestra Nueva solicitud, En curso y Cocina para tomar y despachar pedidos como cualquier mesero; apagado solo se ven las pestañas propias del rol. Los pedidos quedan a nombre del usuario que los toma.
- **Estado de solicitudes:** nueva columna «⏰ Pendientes de cobrar» con la fecha en que se pidió el servicio (tickets de días anteriores sin cerrar), «Cobrados hoy» incluye tickets viejos cobrados hoy, y abajo el plano en vivo de Piso 1 y Piso 2.
- **Domicilios pagados por QR / llave:** al cerrar el domicilio se muestra el QR del negocio y la llave para que el cliente pague, y el botón «📷 Tomar foto del soporte» guarda la foto como evidencia. En Caja aparece «📎 Ver soporte». El QR, la llave y la cuenta de destino se configuran en Administración → Datos del negocio.
