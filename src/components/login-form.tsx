"use client";

import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field, describedBy } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copy } from "@/content/copy";
import { useOnline } from "@/hooks/use-online";

/**
 * Credentials login. Errors are deliberately generic (no "this email exists"
 * oracle) and the form never submits while offline.
 */
export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const online = useOnline();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError(copy.auth.missingFields);
      return;
    }

    if (!online) {
      setError(copy.errors.offline);
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });

      if (!result || result.error) {
        setError(copy.auth.invalidCredentials);
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setError(copy.auth.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
      <Field id="email" label={copy.auth.emailLabel}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoFocus
          required
          value={email}
          aria-describedby={describedBy("email")}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.auth.emailPlaceholder}
        />
      </Field>

      <Field id="password" label={copy.auth.passwordLabel}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          aria-describedby={describedBy("password")}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={copy.auth.passwordPlaceholder}
        />
      </Field>

      <p aria-live="polite" className="min-h-[1.25rem] text-small text-danger">
        {error ?? ""}
      </p>

      <Button type="submit" size="lg" disabled={submitting || !online} className="w-full">
        {submitting ? (
          <>
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            {copy.auth.submitting}
          </>
        ) : (
          copy.auth.submit
        )}
      </Button>
    </form>
  );
}
