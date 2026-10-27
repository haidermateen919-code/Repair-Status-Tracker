import { notFound } from "next/navigation";

import { StatusChip } from "@/components/status-chip";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { copy } from "@/content/copy";
import { JOB_STATUSES } from "@/lib/status";

/**
 * Development-only design-system reference (PRD §9, step 1). Renders every
 * colour token, chip and control state so contrast and touch sizes can be
 * checked at 360px. Not deployed.
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <h1 className="text-title text-ink">{copy.app.name} — design system</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-body font-semibold">Colour tokens</h2>
        <div className="grid grid-cols-2 gap-2 text-small sm:grid-cols-4">
          {[
            ["background", "bg-background border border-line"],
            ["surface", "bg-surface border border-line"],
            ["accent", "bg-accent text-white"],
            ["danger", "bg-danger text-white"],
            ["success", "bg-success text-white"],
            ["ink", "bg-ink text-white"],
            ["ink-muted", "bg-ink-muted text-white"],
            ["line", "bg-line"],
          ].map(([name, className]) => (
            <div key={name} className={`flex h-16 items-end rounded-card p-2 ${className}`}>
              {name}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-body font-semibold">Status chips (never colour alone)</h2>
        <div className="flex flex-wrap gap-2">
          {JOB_STATUSES.map((status) => (
            <StatusChip key={status} status={status} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-body font-semibold">Buttons</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="whatsapp">WhatsApp</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large (48px)</Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-body font-semibold">Inputs</h2>
        <Input placeholder="Default input" />
        <Input disabled placeholder="Disabled input" />
        <Textarea placeholder="Default textarea" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-body font-semibold">Typography</h2>
        <p className="text-title">Title 24/28 semibold</p>
        <p className="text-status">Status 20 semibold</p>
        <p className="text-body">Body 16 — never smaller than 14 in the UI.</p>
        <p className="text-small">Small 14</p>
      </section>
    </main>
  );
}
