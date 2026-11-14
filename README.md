# SurveySpider

AI-powered surveys, a paid participant panel and decision-intelligence analytics, in one web app.

- `public/index.html`: the whole front end (survey builder, Word/PDF/Excel upload, participant panel, Analyze workspace, Excel exports).
- `server.mjs`: a small Node.js server. It serves the page, stores shared data in `DATA_DIR/store.json`, enforces permissions, and calls Claude for the AI features.
- `render.yaml`: one-click deployment on Render.

## Deploy on Render

1. In Render, choose **New + → Blueprint** and connect this GitHub repository.
2. Render reads `render.yaml`. When asked, paste your **Anthropic API key** (from console.anthropic.com) into `ANTHROPIC_API_KEY`. Leave it empty to run without AI.
3. Click **Apply**. The first deploy takes a few minutes. Your site appears at `https://surveyspider-XXXX.onrender.com` (you can add your own domain under **Settings → Custom Domains**).
4. To open the owner-only **Business** page, copy `ADMIN_CODE` from the service's **Environment** tab and enter it on the Business page.

### Plans and costs

- The Blueprint uses Render's **Starter** plan with a 1 GB disk, so data survives restarts and deploys. Check Render's pricing page for the current cost.
- To try it for free, change `plan: starter` to `plan: free` and delete the `disk:` block. **On the free plan all surveys and responses are erased whenever the service restarts or redeploys**, and the site sleeps after inactivity.
- AI features are billed by Anthropic per use. `AI_REQUESTS_PER_HOUR` caps requests per visitor.

## Run locally

```bash
npm install
ANTHROPIC_API_KEY=your-key ADMIN_CODE=choose-a-code npm start
```

Then open http://localhost:10000.

## Tests

```bash
npm test
```

Checks the statistics library against SciPy reference values and the server's permission rules.

## How accounts work today

Each browser gets a random private key stored in that browser. It acts as an anonymous account: the server only lets that browser edit its own surveys, answers and actions. Clearing browser data or switching devices starts a new account. Proper sign-in (email/password or Google) is the recommended next step before taking paying customers.
