import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { JobForm } from "@/components/job-form";
import { copy } from "@/content/copy";
import { requireOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  await requireOwner();

  return (
    <main className="flex flex-col gap-4">
      <div>
        <Link
          href="/app"
          className="mb-2 inline-flex h-11 items-center gap-1 text-small font-medium text-accent"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          {copy.jobDetail.backToJobs}
        </Link>
        <h1 className="text-title text-ink">{copy.newJob.title}</h1>
        <p className="mt-1 text-small text-ink-muted">{copy.newJob.subtitle}</p>
      </div>

      <JobForm />
    </main>
  );
}
