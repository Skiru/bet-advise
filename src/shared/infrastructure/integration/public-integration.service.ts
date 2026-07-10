import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PublicIntegrationService {
  private readonly logger = new Logger(PublicIntegrationService.name);

  /**
   * Dispatches the generated betting advice to a public endpoint to show off integration capability.
   */
  async sendAdviceGenerated(payload: {
    adviceId: string;
    tenantId: string;
    matchId: string;
    market: string;
    selection: string;
    confidence: number;
  }): Promise<void> {
    const url = 'https://httpbin.org/post';
    this.logger.log(
      `[Public Integration] Triggering external webhook to ${url} for Advice: ${payload.adviceId} (Tenant: ${payload.tenantId})...`,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': payload.tenantId,
        },
        body: JSON.stringify({
          source: 'bet-advise-modular-monolith',
          event: 'ADVICE_GENERATED',
          timestamp: new Date().toISOString(),
          data: payload,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = (await response.json()) as {
        origin?: string;
        json?: Record<string, any>;
      };
      this.logger.log(
        `[Public Integration] Success! httpbin.org response received. Echoed origin IP: ${
          responseData.origin || 'unknown'
        }`,
      );
      this.logger.debug(
        `[Public Integration] Webhook Echoed Payload: ${JSON.stringify(
          responseData.json || {},
        )}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[Public Integration] Failed to trigger external webhook for Advice: ${payload.adviceId}:`,
        error,
      );
    }
  }
}
