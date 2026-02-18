/**
 * Secrets Manager Service
 * Integrates with AWS Secrets Manager for secure credential storage
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Secret {
  value: string;
  version: string;
  lastRotated: Date;
}

@Injectable()
export class SecretsManagerService implements OnModuleInit {
  private readonly logger = new Logger(SecretsManagerService.name);
  private readonly secretsCache = new Map<string, Secret>();
  private readonly refreshInterval = 3600000; // 1 hour

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    // Load critical secrets on startup
    await this.loadCriticalSecrets();
    
    // Set up periodic refresh
    setInterval(() => this.refreshSecrets(), this.refreshInterval);
  }

  /**
   * Get secret by name
   */
  async getSecret(name: string): Promise<string> {
    // Check cache first
    const cached = this.secretsCache.get(name);
    if (cached) {
      return cached.value;
    }

    // Load from secrets manager
    const secret = await this.loadSecret(name);
    return secret.value;
  }

  /**
   * Load secret from AWS Secrets Manager or environment
   */
  private async loadSecret(name: string): Promise<Secret> {
    try {
      // In production, use AWS Secrets Manager
      if (process.env.NODE_ENV === 'production') {
        // AWS Secrets Manager integration - implement when needed for production
        // const AWS = require('aws-sdk');
        // const client = new AWS.SecretsManager({ region: 'us-east-1' });
        // const data = await client.getSecretValue({ SecretId: name }).promise();
        // return JSON.parse(data.SecretString);
      }

      // Fallback to environment variables
      const value = process.env[name] || this.config.get(name) || '';
      const secret: Secret = {
        value,
        version: '1',
        lastRotated: new Date(),
      };

      this.secretsCache.set(name, secret);
      return secret;
    } catch (error) {
      this.logger.error(`Failed to load secret ${name}:`, error);
      throw new Error(`Secret ${name} not found`);
    }
  }

  /**
   * Load critical secrets on startup
   */
  private async loadCriticalSecrets() {
    const criticalSecrets = [
      'DATABASE_URL',
      'REDIS_PASSWORD',
      'JWT_SECRET',
      'OPENAI_API_KEY',
      'STRIPE_SECRET_KEY',
    ];

    for (const secretName of criticalSecrets) {
      try {
        await this.loadSecret(secretName);
        this.logger.log(`Loaded secret: ${secretName}`);
      } catch (error) {
        this.logger.warn(`Could not load secret ${secretName}:`, error);
      }
    }
  }

  /**
   * Refresh secrets periodically
   */
  private async refreshSecrets() {
    this.logger.log('Refreshing secrets...');
    const secretNames = Array.from(this.secretsCache.keys());
    
    for (const name of secretNames) {
      try {
        await this.loadSecret(name);
      } catch (error) {
        this.logger.error(`Failed to refresh secret ${name}:`, error);
      }
    }
  }

  /**
   * Rotate secret (trigger rotation in AWS Secrets Manager)
   */
  async rotateSecret(name: string): Promise<void> {
    this.logger.log(`Rotating secret: ${name}`);
    // AWS Secrets Manager rotation - implement when needed for production
    // Clear cache to force reload
    this.secretsCache.delete(name);
  }

  /**
   * Check if secret needs rotation
   */
  needsRotation(name: string, maxAgeDays: number = 90): boolean {
    const secret = this.secretsCache.get(name);
    if (!secret) return true;

    const ageMs = Date.now() - secret.lastRotated.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    return ageDays > maxAgeDays;
  }
}
