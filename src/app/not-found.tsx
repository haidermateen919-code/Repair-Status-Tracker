import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { copy } from "@/content/copy";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
      <EmptyState
        icon={FileQuestion}
        title={copy.errors.notFoundTitle}
        body={copy.errors.notFoundBody}
        action={
          <Button asChild size="lg">
            <Link href="/app">{copy.jobDetail.backToJobs}</Link>
          </Button>
        }
      />
    </main>
  );
}
