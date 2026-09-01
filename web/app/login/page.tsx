import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkPassword, createSessionToken, COOKIE_NAME, MAX_AGE_SECONDS } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/drafts");

  if (!checkPassword(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const jar = await cookies();
  jar.set(COOKIE_NAME, await createSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });

  redirect(next.startsWith("/") ? next : "/drafts");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next ?? "/drafts";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form action={login} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold mb-1">Silent Legacy</h1>
        <p className="text-sm text-slate-500 mb-4">Enter the editor password to continue.</p>
        {params.error && (
          <p className="mb-3 text-sm text-red-600">Incorrect password.</p>
        )}
        <input type="hidden" name="next" value={next} />
        <input
          type="password"
          name="password"
          required
          autoFocus
          placeholder="Password"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
