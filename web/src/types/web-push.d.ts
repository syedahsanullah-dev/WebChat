declare module 'web-push' {
  export interface VapidKeys {
    publicKey: string;
    privateKey: string;
  }

  export interface PushSubscriptionKeys {
    p256dh: string;
    auth: string;
  }

  export interface PushSubscription {
    endpoint: string;
    keys: PushSubscriptionKeys;
  }

  export interface RequestOptions {
    TTL?: number;
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
    topic?: string;
    headers?: Record<string, string>;
    proxy?: string;
  }

  export interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }

  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;

  export function generateVAPIDKeys(): VapidKeys;

  export function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer | null,
    options?: RequestOptions
  ): Promise<SendResult>;

  const webpush: {
    setVapidDetails: typeof setVapidDetails;
    generateVAPIDKeys: typeof generateVAPIDKeys;
    sendNotification: typeof sendNotification;
  };

  export default webpush;
}
