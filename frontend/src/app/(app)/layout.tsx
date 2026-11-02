// Signed-in shell. The session is validated on the server before any HTML is sent, so there is no auth flash.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Nav } from "@/components/layout/Nav";
import { currentUser, SESSION_COOKIE } from "@/lib/server/backend";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser(cookies().get(SESSION_COOKIE)?.value);
  if (!user) redirect("/sign-in");
  return (
    <>
      <Nav user={user} />
      <main id="main" className="mx-auto w-full max-w-3xl animate-page-in px-4 pb-16 pt-8 sm:px-6">
        {children}
      </main>
    </>
  );
}
