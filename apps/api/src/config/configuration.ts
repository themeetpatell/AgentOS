export interface AppConfig {
  readonly nodeEnv: 'development' | 'production' | 'test';
  readonly port: number;
  readonly webOrigin: string;
  readonly gcp: {
    readonly projectId: string;
    readonly region: string;
  };
  readonly firebase: {
    readonly projectId: string;
    readonly allowedDomain: string;
  };
  readonly anthropic: {
    readonly apiKey: string;
    readonly planModel: string;
    readonly executeModel: string;
    readonly lightModel: string;
  };
  readonly cloudTasks: {
    readonly queue: string;
    readonly location: string;
    readonly workerUrl: string;
    readonly invokerSa: string;
  };
  readonly publish: {
    readonly finanshelsWebUrl: string;
    readonly finanshelsWebToken: string;
  };
  readonly zoho: {
    readonly clientId: string;
    readonly clientSecret: string;
    readonly refreshToken: string;
    readonly apiBase: string;
    readonly accountsBase: string;
  };
}

export default function configuration(): { app: AppConfig } {
  const nodeEnv = (process.env.NODE_ENV ?? 'development') as AppConfig['nodeEnv'];

  return {
    app: {
      nodeEnv,
      port: Number(process.env.PORT ?? 3000),
      webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3001',
      gcp: {
        projectId: process.env.GCP_PROJECT_ID ?? '',
        region: process.env.GCP_REGION ?? 'us-central1',
      },
      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID ?? '',
        allowedDomain: process.env.FIREBASE_AUTH_ALLOWED_DOMAIN ?? 'finanshels.com',
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY ?? '',
        planModel: process.env.ANTHROPIC_MODEL_PLAN ?? 'claude-opus-4-7',
        executeModel: process.env.ANTHROPIC_MODEL_EXECUTE ?? 'claude-sonnet-4-6',
        lightModel: process.env.ANTHROPIC_MODEL_LIGHT ?? 'claude-haiku-4-5-20251001',
      },
      cloudTasks: {
        queue: process.env.CLOUD_TASKS_QUEUE ?? 'agent-runs',
        location: process.env.CLOUD_TASKS_LOCATION ?? 'us-central1',
        workerUrl: process.env.CLOUD_TASKS_WORKER_URL ?? 'http://localhost:3000',
        invokerSa: process.env.CLOUD_TASKS_INVOKER_SA ?? '',
      },
      publish: {
        finanshelsWebUrl: process.env.FINANSHELS_WEB_PUBLISH_URL ?? '',
        finanshelsWebToken: process.env.FINANSHELS_WEB_PUBLISH_TOKEN ?? '',
      },
      zoho: {
        clientId: process.env.ZOHO_CLIENT_ID ?? '',
        clientSecret: process.env.ZOHO_CLIENT_SECRET ?? '',
        refreshToken: process.env.ZOHO_REFRESH_TOKEN ?? '',
        apiBase: process.env.ZOHO_API_BASE ?? 'https://www.zohoapis.com',
        accountsBase:
          process.env.ZOHO_ACCOUNTS_BASE ?? 'https://accounts.zoho.com',
      },
    },
  };
}
