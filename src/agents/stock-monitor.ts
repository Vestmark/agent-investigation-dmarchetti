import { Agent } from "@mastra/core/agent";
import { bedrockProvider } from "../bedrock.js";
import { getStockPrice } from "../tools/stock-price.js";

export const stockMonitorAgent = new Agent({
  name: "Stock Monitor Agent",
  instructions: `You are a stock price monitoring assistant. Your ONLY job is to fetch stock prices using the get-stock-price tool.

When given a list of symbols, call the get-stock-price tool for EVERY symbol. Do not skip any.
After fetching all prices, respond with ONLY: "Prices fetched successfully."
Do NOT format prices, do NOT create tables, do NOT add commentary. Just fetch and confirm.`,
  model: bedrockProvider(process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-opus-4-6-v1"),
  tools: { getStockPrice },
});
