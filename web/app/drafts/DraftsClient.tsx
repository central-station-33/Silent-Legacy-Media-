"use client";

import { useState } from "react";
import type { Draft } from "@/lib/types";
import { createDraft, updateDraft, approveDraft, rejectDraft } from "./actions";

const PILLARS = ["Pro", "W", "Proof"] as const;

export function NewDraftButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-slate-900 text-white text-sm font-medium px-3 py-1.5 hover:bg-slate-800"
      >
        New draft
      </button>
      {open && (
        <Modal title="New draft" onClose={() => setOpen(false)}>
          <form
            action={async (fd) => {
              await createDraft(fd);
              setOpen(false);
            }}
            className="space-y-3"
          >
            <DraftFields />
            <FormActions onCancel={() => setOpen(false)} submitLabel="Create draft" />
          </form>
        </Modal>
      )}
    </>
  );
}

export function EditDraftButton({ draft }: { draft: Draft }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm text-slate-600 hover:underline">
        Edit
      </button>
      {open && (
        <Modal title={`Edit: ${draft.title}`} onClose={() => setOpen(false)}>
          <form
            action={async (fd) => {
              await updateDraft(draft.id, fd);
              setOpen(false);
            }}
            className="space-y-3"
          >
            <DraftFields draft={draft} />
            <FormActions onCancel={() => setOpen(false)} submitLabel="Save changes" />
          </form>
        </Modal>
      )}
    </>
  );
}

export function ApproveButton({ id }: { id: number }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="text-right">
      <button
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            await approveDraft(id);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to approve draft.");
          } finally {
            setPending(false);
          }
        }}
        className="text-sm text-emerald-700 hover:underline disabled:opacity-50"
      >
        Approve
      </button>
      {error && <div className="text-xs text-red-600 mt-0.5 max-w-xs">{error}</div>}
    </div>
  );
}

export function RejectButton({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-sm text-red-700 hover:underline">
        Reject
      </button>
      {open && (
        <Modal title="Reject draft" onClose={() => setOpen(false)}>
          <form
            action={async (fd) => {
              try {
                await rejectDraft(id, fd);
                setOpen(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to reject draft.");
              }
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rejection reason</label>
              <textarea
                name="rejection_reason"
                required
                rows={3}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <FormActions onCancel={() => setOpen(false)} submitLabel="Reject" danger />
          </form>
        </Modal>
      )}
    </>
  );
}

function DraftFields({ draft }: { draft?: Draft }) {
  return (
    <>
      <Field label="Title" name="title" defaultValue={draft?.title} required />
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Pillar</label>
        <select
          name="pillar"
          defaultValue={draft?.pillar ?? "Pro"}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {PILLARS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <TextArea label="Body content" name="body_content" defaultValue={draft?.body_content} required rows={5} />
      <TextArea label="X thread text" name="x_thread_text" defaultValue={draft?.x_thread_text ?? ""} rows={3} />
      <TextArea label="Video script" name="video_script" defaultValue={draft?.video_script ?? ""} rows={3} />
      <Field label="Primary source URL" name="primary_source_url" defaultValue={draft?.primary_source_url ?? ""} />
      <Field label="Subject name" name="subject_name" defaultValue={draft?.subject_name ?? ""} />
    </>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function TextArea({
  label,
  name,
  defaultValue,
  required,
  rows,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  rows: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        rows={rows}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function FormActions({
  onCancel,
  submitLabel,
  danger,
}: {
  onCancel: () => void;
  submitLabel: string;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
          danger ? "bg-red-600 hover:bg-red-500" : "bg-slate-900 hover:bg-slate-800"
        }`}
      >
        {submitLabel}
      </button>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
