import { TOTP, Secret } from 'otpauth';
import QRCode from 'qrcode';
import { randomBytes } from 'node:crypto';

const ISSUER = 'AutoMade';
const ALGORITHM = 'SHA1';
const DIGITS = 6;
const PERIOD = 30; // seconds

/**
 * Generate a random TOTP secret
 */
export function generateSecret(): string {
  // Generate a 20-byte (160-bit) random secret
  const bytes = randomBytes(20);
  // Convert Buffer to ArrayBuffer for Secret constructor
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const secret = new Secret({ buffer: arrayBuffer });
  return secret.base32;
}

/**
 * Generate a secure random password
 */
export function generatePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const bytes = randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      password += charset[byte % charset.length];
    }
  }

  return password;
}

/**
 * Create a TOTP instance from a secret
 */
function createTOTP(secret: string, accountName: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label: accountName,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: Secret.fromBase32(secret),
  });
}

/**
 * Generate a TOTP code from a secret
 */
export function generateCode(secret: string, accountName: string = 'user'): string {
  const totp = createTOTP(secret, accountName);
  return totp.generate();
}

/**
 * Verify a TOTP code against a secret
 * @param secret - The TOTP secret (base32 encoded)
 * @param token - The 6-digit code to verify
 * @param window - Number of periods to check before/after current time (default: 1)
 * @returns true if the code is valid
 */
export function verifyCode(secret: string, token: string, window: number = 1): boolean {
  const totp = createTOTP(secret, 'user');
  const delta = totp.validate({ token, window });
  return delta !== null;
}

/**
 * Generate a TOTP URI for authenticator apps
 */
export function generateURI(secret: string, accountName: string): string {
  const totp = createTOTP(secret, accountName);
  return totp.toString();
}

/**
 * Generate a QR code for TOTP setup (as data URL)
 */
export async function generateQRCode(secret: string, accountName: string): Promise<string> {
  const uri = generateURI(secret, accountName);
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 2,
    width: 256,
  });
}

/**
 * Generate a QR code for TOTP setup (as SVG string)
 */
export async function generateQRCodeSVG(secret: string, accountName: string): Promise<string> {
  const uri = generateURI(secret, accountName);
  return QRCode.toString(uri, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
  });
}

/**
 * Generate TOTP setup data including secret and QR code
 */
export async function generateSetupData(accountName: string): Promise<{
  secret: string;
  uri: string;
  qrCode: string;
  qrCodeSVG: string;
}> {
  const secret = generateSecret();
  const uri = generateURI(secret, accountName);
  const qrCode = await generateQRCode(secret, accountName);
  const qrCodeSVG = await generateQRCodeSVG(secret, accountName);

  return {
    secret,
    uri,
    qrCode,
    qrCodeSVG,
  };
}

/**
 * Backup codes for MFA recovery (one-time use)
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character backup codes
    const bytes = randomBytes(4);
    const code = bytes.toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}
