import { brandContextV1 } from '@finanshels-neuro/prompts';

export default function BrandPage() {
  const ctx = brandContextV1;
  return (
    <main className="min-h-screen px-6 py-8 max-w-3xl mx-auto space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Brand Context</h1>
        <p className="text-sm text-muted">
          Version {ctx.version} · read-only in Sprint 1. Editing UI ships in
          Sprint 2; runs already pin the version they used.
        </p>
      </header>

      <Section title="Voice">
        <p className="text-sm">{ctx.voice}</p>
      </Section>

      <Section title="ICP">
        <p className="text-sm">{ctx.icp}</p>
      </Section>

      <Section title="Glossary">
        <dl className="text-sm space-y-1">
          {ctx.glossary.map((g) => (
            <div key={g.term} className="flex gap-3">
              <dt className="font-mono font-medium w-12">{g.term}</dt>
              <dd className="text-muted">{g.definition}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <div className="grid sm:grid-cols-2 gap-6">
        <Section title="Do">
          <ul className="text-sm list-disc pl-5 space-y-1">
            {ctx.dos.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Section>
        <Section title="Don't">
          <ul className="text-sm list-disc pl-5 space-y-1">
            {ctx.donts.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Section>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  );
}
