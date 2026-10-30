// Genera la clave privada y el pedido de certificado (CSR) para ARCA.
//
// Uso (en la carpeta del proyecto):
//   node scripts/arca-generar-pedido-certificado.mjs <CUIT sin guiones> "<Razón social>" <alias> [homologacion|produccion]
// Ejemplo:
//   node scripts/arca-generar-pedido-certificado.mjs 20123456789 "MARTIN JUAN PABLO" sistemataller homologacion
//
// Crea la carpeta arca-certificados/ (excluida de git) con:
//   <alias>-<ambiente>.key  -> clave privada: NO se comparte ni se sube a ningún lado (solo a Vercel)
//   <alias>-<ambiente>.csr  -> pedido que se sube a ARCA para obtener el certificado (.crt)
import forge from "node-forge"
import { mkdirSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const [cuit, razonSocial, alias, ambiente = "homologacion"] = process.argv.slice(2)

if (!/^\d{11}$/.test(cuit || "") || !razonSocial || !/^[a-zA-Z0-9]+$/.test(alias || "")) {
  console.error('Uso: node scripts/arca-generar-pedido-certificado.mjs <CUIT> "<Razón social>" <alias> [homologacion|produccion]')
  console.error("El CUIT va sin guiones (11 dígitos) y el alias solo con letras y números.")
  process.exit(1)
}
if (!["homologacion", "produccion"].includes(ambiente)) {
  console.error("El ambiente tiene que ser homologacion o produccion.")
  process.exit(1)
}

const carpeta = "arca-certificados"
const base = join(carpeta, `${alias}-${ambiente}`)
if (existsSync(`${base}.key`)) {
  console.error(`Ya existe ${base}.key. Si querés generar otra, borrala o usá otro alias.`)
  process.exit(1)
}
mkdirSync(carpeta, { recursive: true })

console.log("Generando clave privada RSA de 2048 bits...")
const claves = forge.pki.rsa.generateKeyPair(2048)

const csr = forge.pki.createCertificationRequest()
csr.publicKey = claves.publicKey
csr.setSubject([
  { name: "countryName", value: "AR" },
  { name: "organizationName", value: razonSocial },
  { name: "commonName", value: alias },
  { type: "2.5.4.5", value: `CUIT ${cuit}` }, // serialNumber, como lo pide ARCA
])
csr.sign(claves.privateKey, forge.md.sha256.create())

writeFileSync(`${base}.key`, forge.pki.privateKeyToPem(claves.privateKey), { mode: 0o600 })
writeFileSync(`${base}.csr`, forge.pki.certificationRequestToPem(csr))

console.log(`Listo:\n  ${base}.key  (clave privada, guardala en un lugar seguro)\n  ${base}.csr  (subilo a ARCA)`)
