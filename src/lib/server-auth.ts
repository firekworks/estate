export type AuthenticatedEstateUser = {
  id: string;
  email?: string;
};

export async function requireEstateUser(request: Request): Promise<AuthenticatedEstateUser | null> {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;

  const token = auth.slice(7).trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !supabaseUrl || !publishableKey) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: publishableKey,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  const data = (await response.json()) as { id?: string; email?: string };
  return data.id ? { id: data.id, email: data.email } : null;
}
