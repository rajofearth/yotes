import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import type { ZodTypeAny } from "zod";

type GenerateGeminiObjectArgs = {
  apiKey: string;
  model: string;
  schema: ZodTypeAny;
  prompt?: string;
  messages?: Parameters<typeof generateObject>[0]["messages"];
  temperature?: number;
  topP?: number;
  maxRetries?: number;
};

export const generateGeminiObject = async ({
  apiKey,
  model,
  schema,
  prompt,
  messages,
  temperature,
  topP,
  maxRetries,
}: GenerateGeminiObjectArgs) => {
  const provider = createGoogleGenerativeAI({ apiKey });
  const geminiModel = provider(model);
  const args: Parameters<typeof generateObject>[0] = {
    model: geminiModel,
    schema,
  };

  if (prompt !== undefined) {
    args.prompt = prompt;
  }
  if (messages !== undefined) {
    args.messages = messages;
  }
  if (temperature !== undefined) {
    args.temperature = temperature;
  }
  if (topP !== undefined) {
    args.topP = topP;
  }
  if (maxRetries !== undefined) {
    args.maxRetries = maxRetries;
  }

  return generateObject(args);
};
