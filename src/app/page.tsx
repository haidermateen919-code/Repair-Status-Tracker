import { redirect } from "next/navigation";

/** The app has no marketing page: the owner's dashboard is home. */
export default function HomePage(): never {
  redirect("/app");
}
