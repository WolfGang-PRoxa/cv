// Chiffrement des données synchronisées (aucune dépendance à Electron : testable seul).
//
// Clé : scrypt(mot de passe, sel) → 64 octets, dont 32 pour AES-256-GCM et 32 pour
// nommer les fichiers distants (HMAC), afin que ni le contenu ni les identifiants des
// CV ne soient lisibles. Contenu : JSON compressé (gzip), chiffré et authentifié ;
// un mauvais mot de passe ou un fichier altéré est donc toujours détecté.

import crypto from 'node:crypto';
import zlib from 'node:zlib';

export const KDF = { N: 2 ** 15, r: 8, p: 1, keyLength: 64 };
const FORMAT = 1;

export function newSalt() {
  return crypto.randomBytes(16).toString('base64');
}

export function deriveKey(passphrase, salt, kdf = KDF) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(String(passphrase).normalize('NFC'), Buffer.from(salt, 'base64'), kdf.keyLength,
      { N: kdf.N, r: kdf.r, p: kdf.p, maxmem: 256 * kdf.N * kdf.r }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

const encKey = key => key.subarray(0, 32);
const macKey = key => key.subarray(32, 64);

export function seal(key, value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(key), iv);
  const body = Buffer.concat([cipher.update(zlib.gzipSync(Buffer.from(JSON.stringify(value), 'utf8'))), cipher.final()]);
  return Buffer.concat([Buffer.from([FORMAT]), iv, cipher.getAuthTag(), body]).toString('base64');
}

export function open(key, text) {
  const data = Buffer.from(String(text || '').trim(), 'base64');
  if (data.length < 29 || data[0] !== FORMAT) throw new Error('format de données synchronisées inconnu');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey(key), data.subarray(1, 13));
  decipher.setAuthTag(data.subarray(13, 29));
  let plain;
  try {
    plain = Buffer.concat([decipher.update(data.subarray(29)), decipher.final()]);
  } catch {
    const error = new Error('mot de passe de synchronisation incorrect, ou données altérées');
    error.code = 'BAD_KEY';
    throw error;
  }
  return JSON.parse(zlib.gunzipSync(plain).toString('utf8'));
}

/** Nom de fichier distant d'un élément : ne révèle pas sa clé. */
export function fileNameFor(key, itemKey) {
  return `cvs-${crypto.createHmac('sha256', macKey(key)).update(itemKey).digest('hex').slice(0, 24)}.enc`;
}

/** Empreinte stable d'un contenu JSON. */
export function hashValue(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
