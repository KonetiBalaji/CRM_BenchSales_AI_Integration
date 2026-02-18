/**
 * Encryption Service
 * Handles field-level encryption for sensitive data
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly masterKey: Buffer;

  constructor(private readonly config: ConfigService) {
    const key = config.get<string>('encryption.masterKey');
    if (!key) {
      this.logger.warn('Encryption master key not configured - using default (INSECURE)');
      this.masterKey = Buffer.from('default-insecure-key-change-in-production'.padEnd(32, '0'));
    } else {
      this.masterKey = Buffer.from(key, 'hex');
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag
      const authTag = cipher.getAuthTag();

      // Combine: iv + authTag + encrypted
      const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex'),
      ]).toString('base64');

      return combined;
    } catch (error) {
      this.logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(ciphertext: string): string {
    try {
      // Decode from base64
      const combined = Buffer.from(ciphertext, 'base64');

      // Extract components
      const iv = combined.subarray(0, this.ivLength);
      const authTag = combined.subarray(this.ivLength, this.ivLength + this.tagLength);
      const encrypted = combined.subarray(this.ivLength + this.tagLength);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash data (one-way)
   */
  hash(data: string, salt?: string): string {
    const actualSalt = salt || crypto.randomBytes(this.saltLength).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512').toString('hex');
    return `${actualSalt}:${hash}`;
  }

  /**
   * Verify hash
   */
  verifyHash(data: string, hashedData: string): boolean {
    const [salt, originalHash] = hashedData.split(':');
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt object fields
   */
  encryptFields(obj: any, fields: string[]): any {
    const encrypted = { ...obj };
    for (const field of fields) {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    }
    return encrypted;
  }

  /**
   * Decrypt object fields
   */
  decryptFields(obj: any, fields: string[]): any {
    const decrypted = { ...obj };
    for (const field of fields) {
      if (decrypted[field]) {
        decrypted[field] = this.decrypt(decrypted[field]);
      }
    }
    return decrypted;
  }

  /**
   * Mask sensitive data for logging
   */
  mask(data: string, visibleChars: number = 4): string {
    if (!data || data.length <= visibleChars * 2) {
      return '***';
    }
    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    return `${start}***${end}`;
  }
}
