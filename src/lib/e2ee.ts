export type EncBlob = { ct: string; iv: string };

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const toBase64 = (bytes: ArrayBuffer): string => {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin);
};

export const fromBase64 = (b64: string): ArrayBuffer => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

export const generateSaltB64 = (length = 16): string => {
  const salt = new Uint8Array(length);
  crypto.getRandomValues(salt);
  return toBase64(salt.buffer);
};

export const deriveKekFromPassphrase = async (
  passphrase: string,
  saltB64: string,
  iterations = 310_000
): Promise<CryptoKey> => {
  const salt = fromBase64(saltB64);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const generateDek = async (): Promise<CryptoKey> => {
  return await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
};

const randomIv = (len = 12): Uint8Array => {
  const iv = new Uint8Array(len);
  crypto.getRandomValues(iv);
  return iv;
};

export const wrapDek = async (
  dek: CryptoKey,
  kek: CryptoKey
): Promise<{ wrappedDekB64: string; wrappedIvB64: string }> => {
  const rawDek = await crypto.subtle.exportKey("raw", dek);
  const iv = randomIv();
  const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, kek, rawDek);
  return { wrappedDekB64: toBase64(wrapped), wrappedIvB64: toBase64(iv.buffer) };
};

export const unwrapDek = async (
  wrappedDekB64: string,
  wrappedIvB64: string,
  kek: CryptoKey
): Promise<CryptoKey> => {
  const iv = fromBase64(wrappedIvB64);
  const wrapped = fromBase64(wrappedDekB64);
  const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(iv) }, kek, wrapped);
  return await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
};

export const encryptString = async (dek: CryptoKey, plaintext: string): Promise<EncBlob> => {
  const iv = randomIv();
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, dek, textEncoder.encode(plaintext));
  return { ct: toBase64(ct), iv: toBase64(iv.buffer) };
};

export const decryptString = async (dek: CryptoKey, blob: EncBlob): Promise<string> => {
  const iv = new Uint8Array(fromBase64(blob.iv));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, dek, fromBase64(blob.ct));
  return textDecoder.decode(pt);
};

export type E2EEUserMeta = {
  encSaltB64?: string;
  encIterations?: number;
  wrappedDekB64?: string;
  wrappedDekIvB64?: string;
};


