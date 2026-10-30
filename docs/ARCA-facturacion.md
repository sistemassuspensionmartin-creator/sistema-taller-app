# Facturación electrónica con ARCA: pasos

El sistema se conecta **directamente** con los web services de ARCA (WSAA + WSFEv1):
- La conexión sale siempre desde el servidor (Vercel) hacia ARCA. ARCA nunca entra al sistema.
- El certificado y su clave privada se guardan solo como variables de entorno en Vercel. No están en el código, en la base de datos ni en el navegador.
- Solo admin y cajero pueden facturar, y cada pedido pasa por la base, que controla:
  - que no se facture más de lo cobrado;
  - que el doble clic no emita dos veces;
  - que la nota de crédito salga de una factura.
- Solo el admin puede pasar de "Pruebas" a "Producción".

Los nombres de los menús de ARCA pueden variar un poco. Si algo no coincide, avisame o consultalo con el contador.

---

## Parte 1: pruebas (homologación, sin validez fiscal)

### 1. Generar la clave y el pedido de certificado
En la carpeta del proyecto (terminal de VS Code):
```
node scripts/arca-generar-pedido-certificado.mjs <CUIT sin guiones> "<RAZÓN SOCIAL>" sistemataller homologacion
```
Se crea la carpeta `arca-certificados/`, que nunca se sube a GitHub, con dos archivos:
- `sistemataller-homologacion.key`: es la **clave privada**. No se comparte con nadie.
- `sistemataller-homologacion.csr`: es el pedido que se sube a ARCA.

### 2. Obtener el certificado de prueba en ARCA
1. Entrá a ARCA con clave fiscal y abrí **Administrador de Relaciones de Clave Fiscal**.
2. Elegí **Adherir servicio** → ARCA → WebServices → **WSASS - Autogestión Certificados Homologación**.
3. Cerrá sesión, volvé a entrar y abrí **WSASS**:
   - Elegí **Nuevo Certificado**: pegá el contenido del `.csr` y copiá el certificado que te devuelve en un archivo `sistemataller-homologacion.crt`, dentro de `arca-certificados/`.
   - Elegí **Crear autorización a servicio**: el alias `sistemataller`, tu CUIT y el servicio **wsfe**.

### 3. Cargar el certificado en Vercel
En Vercel, entrá a **Project → Settings → Environment Variables** y cargá estas dos variables en **Production**:
- `ARCA_HOMO_CERT`: el contenido completo del `.crt`, desde `-----BEGIN CERTIFICATE-----` hasta `-----END CERTIFICATE-----`.
- `ARCA_HOMO_KEY`: el contenido completo del `.key`.

Después, en Deployments, tocá **Redeploy** en la última publicación.

### 4. Configurar y probar
1. Entrá a **Ajustes → Facturación ARCA** y completá los datos fiscales. Dejá el ambiente en **Pruebas**. En pruebas, el punto de venta puede ser cualquier número; por ejemplo, 1.
2. Tocá **Guardar** y después **Probar conexión con ARCA**: todos los pasos tienen que salir con ✔.
3. Cobrá un presupuesto de prueba y emití estos comprobantes desde **Caja → Facturar**:
   - una Factura B a un consumidor final;
   - una Factura A a un cliente Responsable Inscripto, con un CUIT válido;
   - una Nota de Crédito sobre una de esas facturas.

Los comprobantes de prueba salen con la marca "Comprobante de prueba sin validez fiscal".

---

## Parte 2: producción (facturas reales)

Hacelo cuando las pruebas den bien, y conviene que el contador revise una factura de prueba.

### 1. Punto de venta para web service
En ARCA, entrá a **Administración de puntos de venta y domicilios → A/B/M de Puntos de Venta → Agregar**:
- **Sistema:** "RECE para aplicativo y web services".
- **Domicilio:** el del taller.
- Anotá el **número**.

Si alguna vez no lo usás más, dejalo inactivo: un punto de venta dado de baja no se puede reutilizar.

### 2. Certificado de producción
1. Generá una clave y un pedido nuevos para producción:
   ```
   node scripts/arca-generar-pedido-certificado.mjs <CUIT> "<RAZÓN SOCIAL>" sistemataller produccion
   ```
2. En ARCA, adherí el servicio **Administración de Certificados Digitales** (igual que en el paso anterior).
3. Ahí, **Agregar alias** `sistemataller`, subí el `.csr` y descargá el certificado. Guardalo como `sistemataller-produccion.crt`.
4. En **Administrador de Relaciones de Clave Fiscal → Nueva Relación**, buscá ARCA → WebServices → **Facturación Electrónica**. Como representante, elegí el certificado `sistemataller`.

### 3. Vercel
1. Cargá `ARCA_PROD_CERT` y `ARCA_PROD_KEY`, igual que en pruebas.
2. Tocá **Redeploy**.

### 4. Pasar a producción
1. En **Ajustes → Facturación ARCA**, poné el número de punto de venta real y elegí **Producción**. Tocá Guardar y confirmá.
2. Tocá **Probar conexión con ARCA**.
3. Emití la primera factura real y revisala con el contador.

---

## Seguridad del certificado
- La clave privada (`.key`) es como la firma del taller ante ARCA. Si alguien la obtiene, puede emitir comprobantes a tu nombre.
- Guardala en un lugar seguro, por ejemplo un pendrive o un gestor de contraseñas. No la mandes por WhatsApp ni por mail.
- Si creés que se filtró, **revocá el certificado** en ARCA ("Administración de Certificados Digitales"), generá uno nuevo y reemplazalo en Vercel.
- El certificado vence a los 2 años. Hay que renovarlo con los mismos pasos.
