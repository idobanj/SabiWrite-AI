import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Edit3,
  Compass,
  GraduationCap,
  LogOut,
  Save,
  X,
} from "lucide-react";
import { Card } from "../components/Card";
import { Pill } from "../components/Pill";
import { Button } from "../components/Button";
import { IconBadge } from "../components/IconBadge";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../components/Toast";
import { supabase } from "../lib/supabase";

/**
 * Phase 1: shows real auth profile, lets user edit full_name,
 * target_goal, cgpa; sign out.
 */
export function ProfilePage() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();

  const fullName =
    profile?.full_name ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.email?.split("@")[0] ||
    "You";
  const email = session?.user?.email ?? "";
  const initials = fullName.slice(0, 1).toUpperCase();

  const blankForm = {
    full_name: profile?.full_name || "",
    target_goal: profile?.target_goal || "",
    cgpa: profile?.cgpa ?? "",
  };

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blankForm);

  const startEdit = () => {
    setForm(blankForm);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!supabase || !session?.user?.id) {
      show("Profile editing requires a Supabase session.");
      return;
    }
    setSaving(true);
    try {
      // cgpa is numeric in the schema. Coerce empty string -> null, anything
      // else -> number. Anything non-numeric will be rejected by Postgres.
      const cgpaRaw = String(form.cgpa).trim();
      const cgpa = cgpaRaw === "" ? null : Number(cgpaRaw);
      if (cgpaRaw !== "" && Number.isNaN(cgpa)) {
        show("CGPA needs to be a number (or leave it blank).");
        setSaving(false);
        return;
      }
      const updates = {
        id: session.user.id,
        full_name: form.full_name.trim() || null,
        target_goal: form.target_goal.trim() || null,
        cgpa,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("profiles")
        .upsert(updates, { onConflict: "id" });
      if (error) throw error;
      await refreshProfile();
      show("Profile saved.");
      setEditing(false);
    } catch (err) {
      show(err?.message ?? "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (err) {
      show(err?.message ?? "Sign-out failed.");
    }
  };

  return (
    <div className="py-6 px-6 max-w-4xl mx-auto space-y-8">
      <Card>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border border-slate-100 dark:border-slate-700 bg-brand-500 flex items-center justify-center text-white text-3xl font-bold">
              {initials}
            </div>
            <span className="absolute bottom-0 right-0 p-1.5 bg-brand-500 rounded-full border-2 border-white dark:border-slate-800 text-white">
              <User className="w-3 h-3" />
            </span>
          </div>
          <div className="flex-1 text-center sm:text-left space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              {fullName}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{email}</p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
              <Pill color="emerald">Signed in</Pill>
            </div>
          </div>
          {editing ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={cancelEdit}
                leftIcon={<X className="w-3.5 h-3.5" />}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                form="profile-form"
                type="submit"
                leftIcon={<Save className="w-3.5 h-3.5" />}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          ) : (
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              onClick={startEdit}
            >
              Edit
            </Button>
          )}
        </div>
      </Card>

      <form
        id="profile-form"
        onSubmit={handleSave}
        className="grid md:grid-cols-12 gap-6 items-start"
      >
        <Card className="md:col-span-7 space-y-6">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">
              {editing ? "Your details" : "What you're working on"}
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {editing
                ? "Change anything below and hit Save."
                : "These help the coach focus its suggestions on what's actually useful to you."}
            </p>
          </div>

          {editing ? (
            <div className="space-y-4">
              <ProfileField
                label="Your name"
                value={form.full_name}
                onChange={(v) => setForm({ ...form, full_name: v })}
                placeholder="Bola Alabi"
              />
              <ProfileField
                label="What are you trying to get better at?"
                value={form.target_goal}
                onChange={(v) => setForm({ ...form, target_goal: v })}
                placeholder="e.g. Pass IELTS, write better emails…"
              />
              <ProfileField
                label="CGPA (optional)"
                value={form.cgpa}
                onChange={(v) => setForm({ ...form, cgpa: v })}
                placeholder="4.32"
                type="number"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <ProfileRow
                icon={<Compass className="w-4 h-4" />}
                tone="brand"
                title="Goal"
                value={profile?.target_goal || "Not set yet."}
              />
              {/* <ProfileRow
                icon={<GraduationCap className="w-4 h-4" />}
                tone="indigo"
                title="CGPA"
                value={
                  profile?.cgpa != null && profile?.cgpa !== ""
                    ? String(profile.cgpa)
                    : "Not set yet."
                }
              /> */}
            </div>
          )}
        </Card>

        <Card className="md:col-span-5 space-y-6">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 dark:text-white text-base">
              Your session
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sign out when you're done. Your data is yours alone.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="danger"
              fullWidth
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
              onClick={handleSignOut}
            >
              Sign out
            </Button>
            <p className="text-xs text-slate-400 leading-relaxed pt-2">
              Your mistakes, history, and profile are protected by Supabase
              Row Level Security — no other account can see them.
            </p>
          </div>
        </Card>
      </form>
    </div>
  );
}

function ProfileRow({ icon, tone, title, value }) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-start gap-3">
      <IconBadge tone={tone} size="sm">
        {icon}
      </IconBadge>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{value}</p>
      </div>
    </div>
  );
}

function ProfileField({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={type === "number" ? "0.01" : undefined}
        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 transition"
      />
    </div>
  );
}