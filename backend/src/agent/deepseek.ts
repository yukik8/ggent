import { ChatDeepSeek } from "@langchain/deepseek";

const apiKey = process.env.DEEPSEEK_API_KEY ?? "";
const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

export function getDeepSeek(): ChatDeepSeek {
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY not set. Add it to backend .env or shell env.",
    );
  }
  return new ChatDeepSeek({
    model,
    apiKey,
    temperature: 0.3,
    maxTokens: 8192,
  });
}