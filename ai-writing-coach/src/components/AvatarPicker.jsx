import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { AVATARS, getAvatar } from "../lib/avatars";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "./Toast";
import { Button } from "./Button";
import { UserAvatar } from "./UserAvatar";

export function AvatarPicker({ open, onClose }) {
  const { profile, updateAvatar } = useAuth();
  const { show } = useToast();
  const titleId = useId();
  const radioName = useId();
  const dialogRef = useRef(null);
  const savedId = getAvatar(profile?.avatar_id).id;
  const [selectedId, setSelectedId] = useState(savedId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedId(savedId);
    setError("");
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
    };
  }, [open, savedId]);

  if (!open) return null;

  const handleSave = async () => {
    if (saving || selectedId === savedId) return;
    setSaving(true);
    setError("");
    try {
      await updateAvatar(selectedId);
      show("Avatar updated.", { tone: "success" });
      onClose();
    } catch (err) {
      setError(err?.message ?? "Couldn't save your avatar. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
      className="w-[calc(100%-2rem)] max-w-xl max-h-[90dvh] overflow-y-auto m-auto p-0 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl backdrop:bg-slate-950/65 backdrop:backdrop-blur-sm"
    >
      <div className="p-5 sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">A little more you</p>
            <h2 id={titleId} className="mt-1 text-xl font-bold tracking-tight">Choose your avatar</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pick a character to make your profile your own.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close avatar chooser" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-6 flex items-center gap-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4">
          <UserAvatar avatarId={selectedId} className="w-20 h-20 ring-4 ring-white dark:ring-slate-700 shadow-sm" label={`${getAvatar(selectedId).name} avatar preview`} />
          <div>
            <p className="font-bold text-base">Meet {getAvatar(selectedId).name}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Your new face around SabiWrite.<br />You can change it any time.</p>
          </div>
        </div>

        <fieldset disabled={saving} className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          <legend className="sr-only">Available avatar characters</legend>
          {AVATARS.map((avatar) => (
            <label key={avatar.id} className="relative cursor-pointer">
              <input type="radio" name={radioName} value={avatar.id} checked={selectedId === avatar.id} onChange={() => setSelectedId(avatar.id)} className="peer sr-only" aria-label={avatar.name} />
              <span className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-2.5 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-slate-900 ${selectedId === avatar.id ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-transparent bg-slate-50 dark:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-600"}`}>
                <UserAvatar avatarId={avatar.id} className="w-full max-w-[72px] aspect-square" />
                <span className={`text-xs font-semibold ${selectedId === avatar.id ? "text-brand-600 dark:text-brand-100" : "text-slate-600 dark:text-slate-300"}`}>{avatar.name}</span>
              </span>
              {selectedId === avatar.id && <span className="absolute top-1.5 right-1.5 rounded-full bg-brand-500 p-0.5 text-white"><Check className="w-3 h-3" strokeWidth={3} /></span>}
            </label>
          ))}
        </fieldset>

        {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-300">{error}</p>}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={saving || selectedId === savedId}>{saving ? "Saving…" : "Use avatar"}</Button>
        </div>
      </div>
    </dialog>,
    document.body
  );
}
