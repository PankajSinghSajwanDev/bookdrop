import { z } from "zod";

const envSchema = z.object({
  SHOPIFY_API_KEY: z.string().optional(),
  SHOPIFY_API_SECRET: z.string().optional(),
  SCOPES: z.string().optional(),
  SHOPIFY_APP_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  
  // GCP and Resend config with dummy fallbacks for MVP
  GCS_PROJECT_ID: z.string().default("dummy-project-id"),
  GCS_BUCKET_NAME: z.string().default("dummy-bucket-name"),
  GCS_KEY_JSON: z.string().default('{"dummy":"true"}'),
  RESEND_API_KEY: z.string().default("re_dummy_key_123456789"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Invalid environment variables:", _env.error.format());
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
