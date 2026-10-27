import { AppHeader } from "@/components/app-header";
import { requireOwner } from "@/lib/auth";
import { getShopById } from "@/lib/services/shop";
import { copy } from "@/content/copy";

/**
 * Authenticated shell. The middleware already blocks anonymous requests, but
 * every render re-checks the session server-side (PRD §6.7).
 */
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOwner();
  const shop = await getShopById(session.shopId);

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <AppHeader shopName={shop?.name ?? copy.app.name} email={session.email} />
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4 md:pb-8">{children}</div>
    </div>
  );
}
