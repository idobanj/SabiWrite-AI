import { supabase } from "./supabase";
import { requireSession } from "./session";
import { isAvatarId } from "./avatars";

export async function saveProfileAvatar(avatarId, expectedUserId) {
  if (!isAvatarId(avatarId)) throw new Error("Choose one of the available avatars.");
  if (!expectedUserId) throw new Error("Please sign in to change your avatar.");
  const session = await requireSession(expectedUserId);
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: session.user.id, avatar_id: avatarId, updated_at: new Date().toISOString() }, { onConflict: "id" })
    .select()
    .setHeader("Authorization", `Bearer ${session.access_token}`)
    .single();
  if (error) throw error;
  return data;
}
