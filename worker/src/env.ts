export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS: Fetcher;
  AI?: Ai;

  SITE_URL: string;
  R2_BUCKET_NAME: string;

  // secrets
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  GOOGLE_SAFE_BROWSING_API_KEY?: string;
  DOWNLOAD_TOKEN_SECRET?: string;
}

export type AuthUser = { id: string; email: string };

export type AppEnv = {
  Bindings: Env;
  Variables: { user: AuthUser | null; isAdmin: boolean };
};
