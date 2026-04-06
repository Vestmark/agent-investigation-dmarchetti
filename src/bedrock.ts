import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";

// Uses the full AWS credential chain:
// 1. Environment variables (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY) — for containers
// 2. AWS profile (~/.aws/credentials) — for local dev
// 3. Instance/container role — for ECS/EC2
export const bedrockProvider = createAmazonBedrock({
  region: process.env.AWS_REGION || "us-east-1",
  credentialProvider: fromNodeProviderChain(),
});
