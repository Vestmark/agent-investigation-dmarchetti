import { Agent } from "@mastra/core/agent";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { queryPrices, queryPortfolio } from "../tools/market-query.js";

const bedrockProvider = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-east-1",
  credentialProvider: fromNodeProviderChain({
    profile: process.env.AWS_PROFILE,
  }),
});

export const countdownAgent = new Agent({
  name: "Countdown Agent",
  instructions: `You are a news scan countdown status agent for a financial advisor dashboard. After each news scan completes, you generate a short, varied status message about the upcoming scan.

Use the query-portfolio tool to understand current portfolio composition and the query-prices tool for market context.

Your job: produce a single JSON object with a status message that tells the advisor what the next news scan will cover.

RESPONSE FORMAT (strict JSON, no markdown, no extra text):
{
  "message": "Your status message here"
}

Rules for the message:
- Max 12 words
- Reference specific portfolio details: number of symbols, households, notable movers, sectors
- Vary the phrasing each time — don't repeat yourself
- Professional tone, no emojis
- Examples of good messages:
  - "Monitoring 22 symbols — NVDA and TSLA leading today"
  - "Scanning tech-heavy portfolio across 3 households"
  - "Tracking earnings season impact on 22 positions"
  - "Watching mega-cap exposure — 5 positions up over 2%"
  - "Next scan covers Evergreen, Pinnacle, and Horizon"
- Return ONLY the JSON object`,
  model: bedrockProvider("us.anthropic.claude-haiku-4-5-20251001-v1:0"),
  tools: { queryPrices, queryPortfolio },
});
