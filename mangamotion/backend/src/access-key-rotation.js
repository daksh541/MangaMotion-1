/**
 * Access Key Rotation Manager
 * Handles secure storage and rotation of S3/MinIO credentials
 * Supports AWS Secrets Manager, Vault, and Kubernetes Secrets
 */

const crypto = require('crypto');
const config = require('./config');
const { logger } = require('./logger');

/**
 * Access Key Metadata
 */
class AccessKeyMetadata {
  constructor(accessKey, secretKey, provider = 'manual') {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.provider = provider;
    this.createdAt = new Date().toISOString();
    this.rotatedAt = null;
    this.expiresAt = this.calculateExpiration();
    this.status = 'active';
    this.version = 1;
  }

  calculateExpiration() {
    const rotationDays = parseInt(config.ACCESS_KEY_ROTATION_DAYS || '90', 10);
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + rotationDays);
    return expirationDate.toISOString();
  }

  isExpired() {
    return new Date() > new Date(this.expiresAt);
  }

  daysUntilExpiration() {
    const now = new Date();
    const expiration = new Date(this.expiresAt);
    const diffTime = expiration - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  shouldRotate() {
    const warningDays = parseInt(config.ACCESS_KEY_ROTATION_WARNING_DAYS || '14', 10);
    return this.daysUntilExpiration() <= warningDays;
  }
}

/**
 * AWS Secrets Manager Integration
 */
class AWSSecretsManagerProvider {
  constructor() {
    this.secretName = config.AWS_SECRET_NAME || 'mangamotion/s3-credentials';
    this.region = config.AWS_REGION || 'us-east-1';
    this.initialized = false;
  }

  async initialize() {
    try {
      const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
      this.client = new SecretsManagerClient({ region: this.region });
      this.initialized = true;
      logger.info('AWS Secrets Manager provider initialized', {
        secret_name: this.secretName,
        region: this.region,
      });
    } catch (err) {
      logger.error('Failed to initialize AWS Secrets Manager', {
        error: err.message,
      });
      throw err;
    }
  }

  async getCredentials() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const { GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
      const command = new GetSecretValueCommand({ SecretId: this.secretName });
      const response = await this.client.send(command);

      let secretValue;
      if (response.SecretString) {
        secretValue = JSON.parse(response.SecretString);
      } else {
        secretValue = Buffer.from(response.SecretBinary, 'base64').toString('utf-8');
        secretValue = JSON.parse(secretValue);
      }

      logger.info('Retrieved credentials from AWS Secrets Manager', {
        secret_name: this.secretName,
      });

      return new AccessKeyMetadata(
        secretValue.accessKey || secretValue.access_key,
        secretValue.secretKey || secretValue.secret_key,
        'aws-secrets-manager'
      );
    } catch (err) {
      logger.error('Failed to retrieve credentials from AWS Secrets Manager', {
        secret_name: this.secretName,
        error: err.message,
      });
      throw err;
    }
  }

  async rotateCredentials(newAccessKey, newSecretKey) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const { UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');
      
      const secretValue = {
        accessKey: newAccessKey,
        secretKey: newSecretKey,
        rotatedAt: new Date().toISOString(),
      };

      const command = new UpdateSecretCommand({
        SecretId: this.secretName,
        SecretString: JSON.stringify(secretValue),
      });

      await this.client.send(command);

      logger.info('Credentials rotated in AWS Secrets Manager', {
        secret_name: this.secretName,
        rotated_at: secretValue.rotatedAt,
      });

      return true;
    } catch (err) {
      logger.error('Failed to rotate credentials in AWS Secrets Manager', {
        secret_name: this.secretName,
        error: err.message,
      });
      throw err;
    }
  }
}

/**
 * HashiCorp Vault Integration
 */
class VaultProvider {
  constructor() {
    this.vaultAddr = config.VAULT_ADDR || 'http://localhost:8200';
    this.vaultToken = config.VAULT_TOKEN;
    this.secretPath = config.VAULT_SECRET_PATH || 'secret/mangamotion/s3-credentials';
    this.initialized = false;
  }

  async initialize() {
    if (!this.vaultToken) {
      throw new Error('VAULT_TOKEN is required for Vault provider');
    }

    try {
      const https = require('https');
      this.client = https;
      this.initialized = true;
      logger.info('Vault provider initialized', {
        vault_addr: this.vaultAddr,
        secret_path: this.secretPath,
      });
    } catch (err) {
      logger.error('Failed to initialize Vault provider', {
        error: err.message,
      });
      throw err;
    }
  }

  async getCredentials() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const fetch = require('node-fetch');
      const response = await fetch(`${this.vaultAddr}/v1/${this.secretPath}`, {
        headers: {
          'X-Vault-Token': this.vaultToken,
        },
      });

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const secretData = data.data.data || data.data;

      logger.info('Retrieved credentials from Vault', {
        secret_path: this.secretPath,
      });

      return new AccessKeyMetadata(
        secretData.accessKey || secretData.access_key,
        secretData.secretKey || secretData.secret_key,
        'vault'
      );
    } catch (err) {
      logger.error('Failed to retrieve credentials from Vault', {
        secret_path: this.secretPath,
        error: err.message,
      });
      throw err;
    }
  }

  async rotateCredentials(newAccessKey, newSecretKey) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const fetch = require('node-fetch');
      const secretData = {
        accessKey: newAccessKey,
        secretKey: newSecretKey,
        rotatedAt: new Date().toISOString(),
      };

      const response = await fetch(`${this.vaultAddr}/v1/${this.secretPath}`, {
        method: 'POST',
        headers: {
          'X-Vault-Token': this.vaultToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: secretData }),
      });

      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.status} ${response.statusText}`);
      }

      logger.info('Credentials rotated in Vault', {
        secret_path: this.secretPath,
        rotated_at: secretData.rotatedAt,
      });

      return true;
    } catch (err) {
      logger.error('Failed to rotate credentials in Vault', {
        secret_path: this.secretPath,
        error: err.message,
      });
      throw err;
    }
  }
}

/**
 * Kubernetes Secrets Integration
 */
class KubernetesSecretsProvider {
  constructor() {
    this.secretName = config.K8S_SECRET_NAME || 'mangamotion-s3-credentials';
    this.namespace = config.K8S_NAMESPACE || 'default';
    this.initialized = false;
  }

  async initialize() {
    try {
      const fs = require('fs');
      const path = require('path');

      // Read service account token
      const tokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token';
      const caPath = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt';

      if (!fs.existsSync(tokenPath) || !fs.existsSync(caPath)) {
        throw new Error('Kubernetes service account credentials not found');
      }

      this.token = fs.readFileSync(tokenPath, 'utf-8');
      this.ca = fs.readFileSync(caPath, 'utf-8');
      this.kubeApiUrl = `https://${process.env.KUBERNETES_SERVICE_HOST}:${process.env.KUBERNETES_SERVICE_PORT}`;
      this.initialized = true;

      logger.info('Kubernetes Secrets provider initialized', {
        secret_name: this.secretName,
        namespace: this.namespace,
      });
    } catch (err) {
      logger.error('Failed to initialize Kubernetes Secrets provider', {
        error: err.message,
      });
      throw err;
    }
  }

  async getCredentials() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const https = require('https');
      const secretUrl = `${this.kubeApiUrl}/api/v1/namespaces/${this.namespace}/secrets/${this.secretName}`;

      const response = await new Promise((resolve, reject) => {
        const options = {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          ca: this.ca,
          rejectUnauthorized: true,
        };

        https.get(secretUrl, options, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`K8s API returned ${res.statusCode}`));
            }
          });
        }).on('error', reject);
      });

      const secretData = Buffer.from(response.data.data['credentials.json'], 'base64').toString('utf-8');
      const credentials = JSON.parse(secretData);

      logger.info('Retrieved credentials from Kubernetes Secrets', {
        secret_name: this.secretName,
        namespace: this.namespace,
      });

      return new AccessKeyMetadata(
        credentials.accessKey || credentials.access_key,
        credentials.secretKey || credentials.secret_key,
        'kubernetes-secrets'
      );
    } catch (err) {
      logger.error('Failed to retrieve credentials from Kubernetes Secrets', {
        secret_name: this.secretName,
        namespace: this.namespace,
        error: err.message,
      });
      throw err;
    }
  }

  async rotateCredentials(newAccessKey, newSecretKey) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const https = require('https');
      const secretUrl = `${this.kubeApiUrl}/api/v1/namespaces/${this.namespace}/secrets/${this.secretName}`;

      const secretData = {
        accessKey: newAccessKey,
        secretKey: newSecretKey,
        rotatedAt: new Date().toISOString(),
      };

      const body = JSON.stringify({
        data: {
          'credentials.json': Buffer.from(JSON.stringify(secretData)).toString('base64'),
        },
      });

      const response = await new Promise((resolve, reject) => {
        const options = {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/strategic-merge-patch+json',
            'Content-Length': body.length,
          },
          ca: this.ca,
          rejectUnauthorized: true,
        };

        const req = https.request(secretUrl, options, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`K8s API returned ${res.statusCode}`));
            }
          });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
      });

      logger.info('Credentials rotated in Kubernetes Secrets', {
        secret_name: this.secretName,
        namespace: this.namespace,
        rotated_at: secretData.rotatedAt,
      });

      return true;
    } catch (err) {
      logger.error('Failed to rotate credentials in Kubernetes Secrets', {
        secret_name: this.secretName,
        namespace: this.namespace,
        error: err.message,
      });
      throw err;
    }
  }
}

/**
 * Access Key Rotation Manager
 * Manages credential rotation across different secret backends
 */
class AccessKeyRotationManager {
  constructor() {
    this.provider = null;
    this.currentCredentials = null;
    this.rotationCheckInterval = null;
  }

  async initialize() {
    const providerType = config.SECRET_PROVIDER || 'environment';

    try {
      switch (providerType) {
        case 'aws-secrets-manager':
          this.provider = new AWSSecretsManagerProvider();
          break;
        case 'vault':
          this.provider = new VaultProvider();
          break;
        case 'kubernetes-secrets':
          this.provider = new KubernetesSecretsProvider();
          break;
        case 'environment':
        default:
          logger.info('Using environment variables for credentials (no rotation)');
          return;
      }

      await this.provider.initialize();
      this.currentCredentials = await this.provider.getCredentials();
      this.startRotationCheck();

      logger.info('Access Key Rotation Manager initialized', {
        provider: providerType,
        expires_at: this.currentCredentials.expiresAt,
        days_until_expiration: this.currentCredentials.daysUntilExpiration(),
      });
    } catch (err) {
      logger.error('Failed to initialize Access Key Rotation Manager', {
        provider: providerType,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Start periodic rotation check
   */
  startRotationCheck() {
    // Check every 24 hours
    const checkInterval = 24 * 60 * 60 * 1000;

    this.rotationCheckInterval = setInterval(async () => {
      try {
        await this.checkAndRotate();
      } catch (err) {
        logger.error('Rotation check failed', {
          error: err.message,
        });
      }
    }, checkInterval);

    logger.info('Access key rotation check started', {
      check_interval_hours: 24,
    });
  }

  /**
   * Check if rotation is needed and perform it
   */
  async checkAndRotate() {
    if (!this.provider || !this.currentCredentials) {
      return;
    }

    try {
      if (this.currentCredentials.isExpired()) {
        logger.warn('Access key has expired!', {
          expired_at: this.currentCredentials.expiresAt,
        });
        // Trigger alert/notification
      } else if (this.currentCredentials.shouldRotate()) {
        logger.warn('Access key rotation recommended', {
          days_until_expiration: this.currentCredentials.daysUntilExpiration(),
          expires_at: this.currentCredentials.expiresAt,
        });
        // Trigger notification for manual rotation
      }
    } catch (err) {
      logger.error('Error checking key rotation status', {
        error: err.message,
      });
    }
  }

  /**
   * Get current credentials
   */
  getCredentials() {
    return this.currentCredentials;
  }

  /**
   * Rotate credentials manually
   */
  async rotateCredentials(newAccessKey, newSecretKey) {
    if (!this.provider) {
      throw new Error('No secret provider configured');
    }

    try {
      await this.provider.rotateCredentials(newAccessKey, newSecretKey);
      this.currentCredentials = new AccessKeyMetadata(newAccessKey, newSecretKey, this.provider.constructor.name);
      
      logger.info('Access key rotated successfully', {
        provider: this.provider.constructor.name,
        new_expires_at: this.currentCredentials.expiresAt,
      });

      return this.currentCredentials;
    } catch (err) {
      logger.error('Failed to rotate access key', {
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Stop rotation checks
   */
  stop() {
    if (this.rotationCheckInterval) {
      clearInterval(this.rotationCheckInterval);
      logger.info('Access key rotation check stopped');
    }
  }
}

// Create singleton instance
let rotationManager = null;

async function getRotationManager() {
  if (!rotationManager) {
    rotationManager = new AccessKeyRotationManager();
    await rotationManager.initialize();
  }
  return rotationManager;
}

module.exports = {
  AccessKeyMetadata,
  AWSSecretsManagerProvider,
  VaultProvider,
  KubernetesSecretsProvider,
  AccessKeyRotationManager,
  getRotationManager,
};
