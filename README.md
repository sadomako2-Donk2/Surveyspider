# Afrimetrica — Centre for Research Methods and Analytics

*Advancing Research, Measurement and Evidence.* Operated by Regelco International Ltd (Ghana).

This repository is the **Phase 1** website: one Node.js service that serves the public site and the survey software.

| Section | What it does |
| --- | --- |
| Home, About | Who Afrimetrica is; the four service lines; upcoming courses |
| Training (Afrimetrica Academy) | Course catalogue, course pages with dates, fees and seats, registration and "register interest" |
| Surveys (Afrimetrica Surveys) | The survey tools: create, upload Word/PDF/Excel, Paper Survey fieldwork quotes, My surveys, Analyze, paid participant panel, plans |
| Analytics, Consultancy | Service pages with enquiry forms |
| Resources (Knowledge Hub) | Guides, sample size calculator, survey templates (Excel), published findings, open data links |
| Contact | Contact details set by the site owner, and a contact form |
| My Account | Profile, course registrations, surveys, enquiries; admin area link for owners |
| Admin area (`#business`) | Courses editor (with 8 course templates), registrations, enquiries, Paper Survey requests, survey business totals, contact details. CSV downloads. |

- `public/index.html`: the whole front end.
- `server.mjs`: serves the page, stores data in `DATA_DIR/store.json`, enforces permissions, sends emails, calls Claude for AI features.
- `brand/`: Afrimetrica logo and icon (SVG and PNG). The brand name is **not yet legally cleared**; check trademark and company registration before printing materials.
- `docs/`: requirements, architecture, data model, security, decisions and the Phase 2 rebuild prompts. Read `CLAUDE.md` first.

> **Before collecting real respondent data**, complete a privacy review (Ghana Data Protection Act, 2012 (Act 843); registration with the Data Protection Commission) and an independent security assessment. See `docs/security.md`.

## Deploy on Render

1. In Render, choose **New + → Blueprint** and connect this GitHub repository.
2. Render reads `render.yaml`. When asked, paste your **Anthropic API key** (from console.anthropic.com) into `ANTHROPIC_API_KEY`. Leave it empty to run without AI.
3. Click **Apply**. The first deploy takes a few minutes. Your site appears at `https://surveyspider.onrender.com` (the Render service keeps its original name) (you can add your own domain under **Settings → Custom Domains**).
4. To open the **Admin area**, add your email to `ADMIN_EMAILS` in the service's **Environment** tab and sign up with that email (or enter `ADMIN_CODE` at `/#business`). Owners also get an email for every new registration, enquiry and Paper Survey request once Resend is set up.

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

Checks the statistics library against SciPy reference values (20 checks) and the server's permission rules, accounts, emails, courses, registrations, enquiries and privacy rules (124 checks).

## Accounts and sign-in

People sign in with **email and password** or **Continue with Google**. Signing in is needed to save surveys, take paid surveys, review responses, add actions, save a profile and use AI. Browsing, pricing, Paper Survey quotes and enquiry forms work without an account. Course registration needs an account with a confirmed email. Anything a visitor made before signing in moves into their new account.

- Passwords are hashed with scrypt; sessions use an HttpOnly, SameSite cookie that lasts 30 days.
- Repeated wrong passwords are rate-limited. Cross-site requests are refused.
- `ADMIN_EMAILS` (comma-separated) makes those accounts site owners automatically. `ADMIN_CODE` still works too.

### Turn on Google sign-in

1. Go to https://console.cloud.google.com and create (or pick) a project.
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app name (Afrimetrica), support email and your domain, then publish the app.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**.
   - Authorised JavaScript origin: `https://surveyspider.onrender.com`
   - Authorised redirect URI: `https://surveyspider.onrender.com/auth/google/callback`
   - If you add your own domain later, add the same two entries for it.
4. Copy the **Client ID** and **Client secret** into Render → your service → **Environment** as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then **Save, rebuild, and deploy**.

The Google button appears on the sign-in page as soon as both values are set.

### Turn on "Forgot password?" emails (Resend)

1. Create a free account at https://resend.com.
2. **Domains → Add Domain**: add a domain you own (for example `surveyspider.com`) and add the DNS records Resend shows at your domain registrar. Wait until it says **Verified**.
   - Without your own domain you can only use Resend's test sender `onboarding@resend.dev`, which delivers **only to the email address you signed up to Resend with**. That's fine for trying it out, not for real users.
3. **API Keys → Create API Key** with "Sending access". Copy it (starts with `re_`).
4. In Render → your service → **Environment**, add:
   - `RESEND_API_KEY` = the key
   - `EMAIL_FROM` = `Afrimetrica <noreply@yourdomain.com>` (an address on your verified domain)
   - then **Save, rebuild, and deploy**.

The "Forgot password?" link appears on the sign-in page once `RESEND_API_KEY` is set. Reset links work once, expire after 60 minutes, always point at the site's real address (`RENDER_EXTERNAL_URL`, or `PUBLIC_URL` if you set one for your own domain), and sign the person out on every other device. The form gives the same answer whether or not an account exists, and allows at most 3 emails per address per hour.

### Email verification

When `RESEND_API_KEY` is set, people who sign up with email and password get a "Confirm your email" message. The link works once and lasts 48 hours. Until they confirm, they can sign in, browse, save drafts and fill in their profile, but can't launch surveys, take paid studies or use AI. A banner reminds them and offers **Send it again** (at most 3 emails an hour).

- Google accounts count as confirmed (Google has already verified the address).
- Resetting a password through an emailed link also confirms the address.
- Accounts created before verification was added count as confirmed.
- Without `RESEND_API_KEY`, new accounts are confirmed automatically so sign-up keeps working.
