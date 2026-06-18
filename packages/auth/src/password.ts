import { scrypt, timingSafeEqual, randomBytes } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)
const SCRYPT_KEYLEN = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer
  return `scrypt$${salt}$${hash.toString('hex')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Support legacy bcrypt hashes from admin dashboard
  if (stored.startsWith('$2')) {
    return verifyBcrypt(password, stored)
  }
  // scrypt format: scrypt$<salt_hex>$<hash_hex>
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, hashHex] = parts
  try {
    const hash = (await scryptAsync(password, salt, SCRYPT_KEYLEN)) as Buffer
    const storedHash = Buffer.from(hashHex, 'hex')
    if (hash.length !== storedHash.length) return false
    return timingSafeEqual(hash, storedHash)
  } catch {
    return false
  }
}

async function verifyBcrypt(password: string, hash: string): Promise<boolean> {
  try {
    const bcrypt = await import('bcryptjs')
    return bcrypt.compare(password, hash)
  } catch {
    return false
  }
}
