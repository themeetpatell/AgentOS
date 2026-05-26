interface Guardrail {
  readonly title: string;
  readonly description: string;
  readonly enforcedBy: string;
}

const GUARDRAILS: ReadonlyArray<Guardrail> = [
  {
    title: 'No duplicate active runs per brief',
    description:
      'Submitting a brief that already has an in-flight run is rejected.',
    enforcedBy: 'BriefsService -> AgentRunRepository.hasActiveRunForBrief',
  },
  {
    title: 'Capped retries (3 attempts default)',
    description:
      'Each phase retries with exponential backoff up to three times before the run is marked FAILED.',
    enforcedBy: 'OrchestratorService.handlePhase',
  },
  {
    title: 'Reviewer gate — drafts never auto-publish',
    description:
      'Runs land in AWAITING_REVIEW. APPROVED, EDITED, or REJECTED requires an explicit human action with the actor uid recorded.',
    enforcedBy: 'AgentRunsService.applyReview + state machine',
  },
  {
    title: 'Regulated-claims lint (UAE finance content)',
    description:
      'Every draft runs through agent.validate(). Sprint 3 adds a deny-list of unverified tax/regulatory claims.',
    enforcedBy: 'Agent.validate + planned pre-publish lint',
  },
  {
    title: 'Audit log of every plan, draft, edit, approval',
    description:
      'Each state transition writes an immutable record to audit_events with actor, before/after, and timestamp.',
    enforcedBy: 'AgentRunsService.writeAudit',
  },
  {
    title: 'Domain-restricted SSO',
    description:
      'Only @finanshels.com Google accounts can authenticate. Enforced in the Firebase sign-in popup and server-side on every API call.',
    enforcedBy: 'FirebaseAuthGuard + getFirebaseAuth.signInWithGoogle',
  },
  {
    title: 'Cancel & rollback',
    description:
      'Any in-flight run can be cancelled; cancelled runs are skipped by subsequent worker dispatches. Rollback after publish lands in Sprint 3.',
    enforcedBy: 'OrchestratorService phase skip on CANCELLED',
  },
];

export default function GuardrailsPage() {
  return (
    <main className="min-h-screen px-6 py-8 max-w-3xl mx-auto space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Guardrails</h1>
        <p className="text-sm text-muted">
          Visible policies the platform enforces. Click into any run to see
          which guardrails fired during execution.
        </p>
      </header>

      <ul className="space-y-4">
        {GUARDRAILS.map((g) => (
          <li
            key={g.title}
            className="rounded-md border border-muted/40 px-4 py-3 space-y-1"
          >
            <p className="font-medium">{g.title}</p>
            <p className="text-sm text-muted">{g.description}</p>
            <p className="text-xs text-muted font-mono">{g.enforcedBy}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
