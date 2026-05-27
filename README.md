# Finanshels Neuro

Internal AI agent platform for Finanshels GTM and people functions
(branding, marketing, pre-sales, sales, partnerships, HR).

Modeled on the neuro-app pattern:
**Brief → Plan → Execute → Awaiting Review → Approved/Edited → Published**.

V1 ships the platform shell plus four marketing-content agents:
`blog-post`, `seo-brief`, `social-variants`, `ad-copy`.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + Tailwind + shadcn |
| Backend | NestJS 10 on Cloud Run |
| Data | Firestore (runs, drafts, briefs, audit) |
| Queue | Cloud Tasks (HTTP target → NestJS worker) |
| Auth | Firebase Auth + Google SSO (domain-restricted to @finanshels.com) |
| AI | Anthropic SDK direct (Opus 4.7 plan / Sonnet 4.6 execute / Haiku 4.5 variants) |
| Storage | GCS (brief attachments) |
| Observability | Cloud Logging + Cloud Trace, Sentry (web) |

## Layout

```
finanshels_neuro/
├── apps/
│   ├── web/     # Next.js 15 staff dashboard (port 3001)
│   └── api/     # NestJS backend (port 3000)
├── packages/
│   ├── shared/   # Zod schemas, AgentRun/Brief/Draft types
│   ├── agents/   # Pluggable Agent implementations
│   ├── prompts/  # Versioned prompt templates + brand voice
│   └── ui/       # Shared shadcn components
└── infra/
    ├── terraform/  # GCP project, Firestore, Cloud Tasks, Cloud Run
    └── deploy/     # Cloud Run service YAMLs
```

## Local-dev quickstart (no Firebase, no GCP, no Zoho)

Run the whole platform with just an Anthropic API key. Data lives in memory
and resets on restart. Sign-in is one click. Cloud Tasks is replaced by an
in-process HTTP self-call. Perfect for trying the agents.

```sh
cp .env.example .env
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env

# 1. Set just two values in apps/api/.env:
#    NEURO_LOCAL_DEV=1
#    ANTHROPIC_API_KEY=sk-ant-...
#
# 2. Set just one value in apps/web/.env.local:
#    NEXT_PUBLIC_NEURO_LOCAL_DEV=1

npm install
npm run dev        # web on 3001, api on 3000
```

Open http://localhost:3001 → "Continue (local dev)" → pick any agent at
`/briefs/new`. The platform skips Firebase auth, uses an in-memory
Firestore shim, and runs Cloud Tasks in-process. **Sales and analytics
agents that read from Zoho (cold outreach, follow-up, discovery prep, the
four analytics agents) will fail gracefully without Zoho creds** — the
paste-in agents (meeting summary, interview debrief, JD, onboarding plan,
financial commentary, variance explainer, blog post, newsletter, …) all
work day-one with just the Anthropic key.

### Day-1 useful agents (zero external integration)

| Group | Agent | Paste in | Get back |
|---|---|---|---|
| Day-to-day | meeting-prep | Agenda + attendees + context | Talking points, questions, risks, success criteria |
| Day-to-day | meeting-summary | Transcript or rough notes | Summary, decisions, action items with owners, draft follow-up email |
| HR | interview-debrief | Interview notes + JD | Strengths, concerns, hire/no-hire, next-round questions |
| HR | job-description | Rough role requirements | Polished JD + interview rubric |
| HR | onboarding-plan | Role + start date + team context | First-30-days plan with weekly milestones |
| Finance | financial-commentary | P&L + KPI numbers + context | Management-report narrative (never invents numbers) |
| Finance | variance-explainer | Budget vs actual numbers | Ranked variance drivers + questions for line-owners |
| Marketing | blog-post / seo-brief / social-variants / ad-copy / email-nurture / newsletter | Brief + source notes | Drafts in Finanshels voice |

## Getting Started (production)

Prerequisites: Node 20+, npm 10+, gcloud CLI (for deploy), terraform (for infra).

```sh
cp .env.example .env
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env

# Fill in real values: FIREBASE_*, GCP_*, ANTHROPIC_API_KEY, ZOHO_* (optional),
# then unset NEURO_LOCAL_DEV.

npm install
npm run dev        # runs web (3001) + api (3000) via turbo
```

Health checks:

- Web: http://localhost:3001 (lands on /login when unauthenticated)
- API: http://localhost:3000/health

## Deployment

1. Create a GCP project and a Firebase project on top of it.
2. Provision infra: `cd infra/terraform && terraform init && terraform apply`.
3. Build images and deploy each app to Cloud Run (see `infra/deploy/`).
4. Configure Firebase Auth → enable Google provider → restrict to `finanshels.com`.

## Guardrails (visible at `/guardrails`)

- No duplicate active runs per brief
- Capped retries (3 attempts default; configurable per agent)
- Cancel & rollback on any in-flight run
- Reviewer gate — drafts never auto-publish
- Regulated-claims lint for UAE finance content
- Audit log of every plan, draft, edit, approval
- Domain-restricted SSO (@finanshels.com only)
- Webhook HMAC validation for inbound integrations

## Related repos

- `../neuro-app` — engineering version of this pattern (Jira → code → PR)
- `../finanshels_web` — marketing site and existing CMS (publish target)
