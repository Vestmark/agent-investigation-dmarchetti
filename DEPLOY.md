# Deploying Stock Monitor to Northflank

Step-by-step guide to deploy the Stock Monitor app on Northflank with managed Postgres and AWS Bedrock.

---

## Prerequisites

- A [Northflank account](https://app.northflank.com/signup)
- A GitHub account with this repo pushed to it
- AWS IAM credentials with Bedrock access (`bedrock:InvokeModel` permission)
- (Optional) AWS SES verified email for the Email Agent

---

## Step 1: Push the Repo to GitHub

If you haven't already, create a GitHub repo and push:

```bash
git remote add origin https://github.com/Vestmark/agent-investigation-dean.git
git add -A
git commit -m "Prepare for Northflank deployment"
git branch -M main
git push -u origin main
```

---

## Step 2: Connect GitHub to Northflank

1. Log in to [Northflank](https://app.northflank.com)
2. Go to **Account Settings > Git** (left sidebar)
3. Click **Connect** next to GitHub
4. Authorize Northflank to access your repositories
5. Select the `agent-investigation-dean` repo (or grant access to all repos)

---

## Step 3: Create a Project

1. From the Northflank dashboard, click **Create Project**
2. Name it `agent-investigation-dean`
3. Choose your preferred region (US East recommended for lower Bedrock latency)
4. Click **Create**

---

## Step 4: Create a Postgres Addon

1. Inside your project, click **Add Addon** (or go to **Addons > Create Addon**)
2. Select **PostgreSQL**
3. Configure:
   - **Name**: `agent-investigation-dean-db`
   - **Version**: 16 (or latest available)
   - **Plan**: Pick based on your needs (the free tier works for testing)
4. Click **Create**
5. Wait for the addon to provision (takes ~30 seconds)

Once created, note that Northflank automatically provides connection details. You'll link this to your service in the next step — no need to copy the URL manually.

---

## Step 5: Create a Combined Service

1. Inside your project, click **Add Service > Combined Service**
2. Configure the **Build** section:
   - **Source**: Select your connected GitHub repo (`agent-investigation-dean`)
   - **Branch**: `main`
   - **Build type**: **Dockerfile**
   - **Dockerfile path**: `./Dockerfile` (default)
3. Configure the **Run** section:
   - **Port**: Add port `2404`, protocol **HTTP**
   - **Resources**: At least 512MB RAM, 0.5 vCPU (the app runs 16 AI agents)
   - For production: 1GB RAM, 1 vCPU recommended
4. Click **Create**

Northflank will start building the Docker image. The first build takes 2-3 minutes.

---

## Step 6: Set Environment Variables

1. Go to your service, click the **Environment** tab
2. Add these variables:

| Variable | Value | Type |
|---|---|---|
| `AWS_REGION` | `us-east-1` | Variable |
| `AWS_ACCESS_KEY_ID` | Your IAM access key | Secret |
| `AWS_SECRET_ACCESS_KEY` | Your IAM secret key | Secret |
| `BEDROCK_MODEL_ID` | `us.anthropic.claude-opus-4-6-v1` | Variable |
| `PORT` | `2404` | Variable |

Optional variables:
| Variable | Value | Notes |
|---|---|---|
| `SES_FROM_EMAIL` | `advisor@yourdomain.com` | Required for Email Agent |
| `NODE_TLS_REJECT_UNAUTHORIZED` | `0` | Only if needed for proxy/cert issues |

3. Click **Update & Restart**

---

## Step 7: Link the Postgres Addon

1. Go to your service, click the **Environment** tab
2. Scroll to **Linked Addons** (or click **Add Link**)
3. Select the `agent-investigation-dean-db` addon you created
4. This automatically injects `DATABASE_URL` into your service environment
5. Northflank also injects individual vars like `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — the app only needs `DATABASE_URL`
6. Click **Update & Restart**

---

## Step 8: Verify the Deployment

1. Go to your service's **Logs** tab to watch startup
2. You should see:
   ```
   Web UI available at http://localhost:2404
   ╔════════════════════════════════════════════════════════════════════════╗
   ║                    Stock Price Monitor (Mastra Agents)               ║
   ```
3. The first run will create tables and seed data automatically
4. Go to the **Networking** tab to find your public URL
5. Open the URL — you should see the Stock Monitor dashboard

---

## Step 9: Set Up a Public Domain (Optional)

1. Go to your service's **Networking** tab
2. Northflank provides a default URL like `https://agent-investigation-dean-xxxx.northflank.app`
3. To use a custom domain:
   - Click **Add Custom Domain**
   - Enter your domain (e.g., `monitor.yourdomain.com`)
   - Add the CNAME record Northflank provides to your DNS
   - Wait for DNS propagation and TLS certificate provisioning

---

## AWS IAM Policy

The minimum IAM policy needed for the service:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

If you don't use the Email Agent, you can omit the SES permissions.

---

## Troubleshooting

**Build fails: "Cannot find module"**
- Make sure all dependencies are in `dependencies` (not `devDependencies`) in `package.json`
- `tsx` must be a production dependency

**"password authentication failed" for Postgres**
- Verify the addon is linked (Step 7) — `DATABASE_URL` must be injected
- Check the **Environment** tab to confirm `DATABASE_URL` is present

**"AWS SigV4 authentication requires AWS credentials"**
- Check that `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set in environment variables
- Verify the IAM user has Bedrock permissions

**App crashes with OOM**
- Increase RAM to 1GB+ (16 agents consume memory at startup)

**Prices/news not updating**
- Check logs for Bedrock errors — the agents may be hitting rate limits
- Verify the IAM policy includes `bedrock:InvokeModel`

---

## Updating

After pushing code changes to GitHub:

1. Northflank auto-builds if you enabled **auto-deploy** on the service
2. Or manually: go to your service > **Builds** tab > click **Build & Deploy**
3. Zero-downtime deployments: Northflank starts the new container before stopping the old one
