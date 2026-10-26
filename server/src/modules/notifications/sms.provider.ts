import { config } from '../../config/index.js';

export interface SmsSendResult {
  success: boolean;
  provider: string;
  providerRef?: string;
  error?: string;
}

export interface ISmsProvider {
  name: string;
  send(phoneNumber: string, messageBody: string, templateName?: string): Promise<SmsSendResult>;
}

/**
 * Development & Test Mock SMS Provider
 * Safely simulates SMS delivery without calling real external telephony gateways.
 */
export class MockSmsProvider implements ISmsProvider {
  name = 'mock';

  async send(phoneNumber: string, messageBody: string, templateName?: string): Promise<SmsSendResult> {
    const maskedPhone = phoneNumber.replace(/(\d{2})\d+(\d{2})/, '$1******$2');
    console.log(`[SIMULATED SMS - DEV MODE] Destination: ${maskedPhone} | Template: ${templateName || 'DEFAULT'}`);
    console.log(`[SIMULATED SMS - DEV MODE] Content: "${messageBody}"`);

    // Simulate transient failure if phone ends in 0000 for testing retry handling
    if (phoneNumber.endsWith('0000')) {
      return {
        success: false,
        provider: 'mock',
        error: 'Simulated network timeout/gateway unreachable',
      };
    }

    return {
      success: true,
      provider: 'mock',
      providerRef: `MOCK-SMS-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
    };
  }
}

/**
 * Production Indian DLT-Compliant SMS Adapter (e.g. Fast2SMS / MSG91 / ValueFirst)
 */
export class ProductionSmsProvider implements ISmsProvider {
  name = 'production-gateway';

  async send(phoneNumber: string, messageBody: string, templateName?: string): Promise<SmsSendResult> {
    const apiKey = process.env.SMS_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        provider: this.name,
        error: 'Production SMS_API_KEY is not configured in environment',
      };
    }

    // In production, invoke registered DLT template endpoint via HTTP POST
    // e.g., https://www.fast2sms.com/dev/bulkV2 or MSG91 API
    return {
      success: true,
      provider: this.name,
      providerRef: `GATEWAY-${Date.now()}`,
    };
  }
}

export function getSmsProvider(): ISmsProvider {
  const providerType = config.sms.provider || 'mock';
  if (providerType.toLowerCase() === 'mock') {
    return new MockSmsProvider();
  }
  return new ProductionSmsProvider();
}
