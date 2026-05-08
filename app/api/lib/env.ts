import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  kimiAuthUrl: required("KIMI_AUTH_URL"),
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  kimiApiKey: process.env.KIMI_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  llmProvider: process.env.LLM_PROVIDER ?? "auto",
  llmTimeoutMs: process.env.LLM_TIMEOUT_MS ?? "",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "qwen2.5-coder",
  ollamaKeepAlive: process.env.OLLAMA_KEEP_ALIVE ?? "5m",
};
