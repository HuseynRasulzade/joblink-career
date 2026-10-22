"use client";
import { useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { Field, Modal } from "./components";

export default function AccountSettings({
  api,
  notify,
  onClose,
  onDeleted,
}: {
  api: (path: string, body?: unknown) => Promise<unknown>;
  notify: (s: string) => void;
  onClose: () => void;
  onDeleted: () => Promise<void> | void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== repeatPassword) {
      setError("Yeni şifrələr eyni deyil.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("auth/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      notify("Şifrə dəyişdirildi. Digər cihazlardakı sessiyalar bağlandı.");
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("auth/delete", { currentPassword: deletePassword });
      await onDeleted();
      notify("Hesabınız və bütün məlumatlarınız silindi.");
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Hesab təhlükəsizliyi" onClose={onClose} className="account-settings">
      {error && <div className="notice error">{error}</div>}
      <form className="account-settings-section" onSubmit={changePassword}>
        <h3>
          <KeyRound size={17} /> Şifrəni dəyiş
        </h3>
        <Field label="Hazırkı şifrə">
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
        <Field label="Yeni şifrə">
          <input
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
        <Field label="Yeni şifrəni təkrar yazın">
          <input
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            required
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
          />
        </Field>
        <button className="primary" disabled={busy}>
          Şifrəni yenilə
        </button>
      </form>
      <form className="account-settings-section danger" onSubmit={deleteAccount}>
        <h3>
          <Trash2 size={17} /> Hesabı sil
        </h3>
        <p className="muted">
          Profiliniz, CV mətniniz, müraciətləriniz, yadda saxlanmış və yayımlanmış
          vakansiyalarınız birdəfəlik silinəcək. Bu əməliyyat geri qaytarılmır.
        </p>
        <Field label="Hazırkı şifrə">
          <input
            type="password"
            autoComplete="current-password"
            required
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />
        </Field>
        <Field label="Təsdiq üçün SİL yazın">
          <input
            required
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
          />
        </Field>
        <button
          className="danger-button"
          disabled={busy || deleteText.trim().toLocaleUpperCase("az") !== "SİL"}
        >
          Hesabı birdəfəlik sil
        </button>
      </form>
    </Modal>
  );
}
