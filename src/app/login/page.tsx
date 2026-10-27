import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getOwnerSession } from "@/lib/auth";
import { copy } from "@/content/copy";

export const metadata: Metadata = {
  title: `${copy.auth.title} — ${copy.app.name}`,
};

export const dynamic = "force-dynamic";

/** Only ever redirect back into the owner area — never to an external URL. */
function safeNextPath(value: string | undefined): string {
  if (!value) return "/app";
  return value.startsWith("/app") && !value.startsWith("//") ? value : "/app";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; email?: string; password?: string }>;
}) {
  const session = await getOwnerSession();
  const params = await searchParams;

  // Defence in depth: if a pre-hydration submit ever put credentials in the
  // query string, strip them from the URL (and from browser history) at once.
  if (params.email !== undefined || params.password !== undefined) redirect("/login");

  const nextPath = safeNextPath(params.next);

  if (session) redirect(nextPath);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6">
        <h1 className="text-title text-ink">{copy.auth.title}</h1>
        <p className="mt-1 text-body text-ink-muted">{copy.auth.subtitle}</p>
      </div>
      <LoginForm nextPath={nextPath} />
    </main>
  );
}
