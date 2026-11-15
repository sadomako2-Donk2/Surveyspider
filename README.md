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

## Accounts and sign-in

People sign in with **email and password** or **Continue with Google**. Signing in is needed to save surveys, take paid surveys, review responses, add actions, save a profile and use AI. Browsing, pricing and Paper Survey quotes work without an account. Anything a visitor made before signing in moves into their new account.

- Passwords are hashed with scrypt; sessions use an HttpOnly, SameSite cookie that lasts 30 days.
- Repeated wrong passwords are rate-limited. Cross-site requests are refused.
- `ADMIN_EMAILS` (comma-separated) makes those accounts site owners automatically. `ADMIN_CODE` still works too.

### Turn on Google sign-in

1. Go to https://console.cloud.google.com and create (or pick) a project.
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app name (SurveySpider), support email and your domain, then publish the app.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**.
   - Authorised JavaScript origin: `https://surveyspider.onrender.com`
   - Authorised redirect URI: `https://surveyspider.onrender.com/auth/google/callback`
   - If you add your own domain later, add the same two entries for it.
4. Copy the **Client ID** and **Client secret** into Render → your service → **Environment** as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then **Save, rebuild, and deploy**.

The Google button appears on the sign-in page as soon as both values are set.

### Not included yet

Email verification and "forgot password" emails need an email-sending service (for example Resend or SendGrid). Until then, a person who forgets their password can use Continue with Google with the same email address, or the site owner can help.
