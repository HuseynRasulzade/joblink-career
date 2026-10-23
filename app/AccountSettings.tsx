"use client";
import { useCallback, useEffect, useState } from "react";
import { Bell, KeyRound, MailCheck, MonitorSmartphone, ShieldCheck, Trash2 } from "lucide-react";
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
      <SecurityPanel api={api} notify={notify} />
      <EmailPrefsPanel api={api} notify={notify} />
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
      <section className="account-settings-section">
        <h3>Məlumatlarımı yüklə</h3>
        <p className="muted">Profil, müraciətlər, mesajlar, testlər, bildirişlər və s. bir JSON faylında (iş axtaran hesabı üçün).</p>
        <a className="secondary" href="/api/joblink/account/export" download>Faylı yüklə</a>
      </section>
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

type Session = { id: string; current: boolean; created: string; agent: string };
const deviceName = (agent: string) => {
  const os = /Windows/.test(agent) ? "Windows" : /Android/.test(agent) ? "Android" : /iPhone|iPad/.test(agent) ? "iOS" : /Mac OS/.test(agent) ? "macOS" : /Linux/.test(agent) ? "Linux" : "Naməlum cihaz";
  const browser = /Edg\//.test(agent) ? "Edge" : /Chrome\//.test(agent) ? "Chrome" : /Firefox\//.test(agent) ? "Firefox" : /Safari\//.test(agent) ? "Safari" : "brauzer";
  return `${browser} · ${os}`;
};

// E-mail confirmation, two-step sign-in and the list of signed-in devices.
function SecurityPanel({ api, notify }: { api: (path: string, body?: unknown) => Promise<unknown>; notify: (s: string) => void }) {
  const [status, setStatus] = useState<{ enabled: boolean; verified: boolean; email: string } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [backup, setBackup] = useState<string[]>([]);
  const load = useCallback(async () => {
    try {
      setStatus((await api("auth/2fa-status", {})) as typeof status);
      setSessions(((await api("auth/sessions", {})) as { sessions: Session[] }).sessions);
    } catch {
      /* the panel stays empty */
    }
  }, [api]);
  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const run = async (action: () => Promise<void>) => {
    try { await action(); } catch (err) { notify((err as Error).message); }
  };
  if (!status) return null;
  return (
    <section className="account-settings-section">
      <h3><MailCheck size={17} /> E-poçt</h3>
      <p className="muted">
        {status.email}: {status.verified ? "təsdiqlənib" : "təsdiqlənməyib. Şifrəni unutsanız, bərpa linki bu ünvana gedir."}
      </p>
      {!status.verified && (
        <button type="button" className="secondary" onClick={() => run(async () => { await api("auth/resend-verification", {}); notify("Təsdiq linki göndərildi."); })}>
          Təsdiq linkini yenidən göndər
        </button>
      )}
      <h3><ShieldCheck size={17} /> İki mərhələli giriş (autentifikator)</h3>
      {backup.length > 0 && (
        <div className="notice">
          <b>Ehtiyat kodlar (yalnız indi göstərilir, hər biri bir dəfə işləyir):</b>
          <p style={{ fontFamily: "monospace" }}>{backup.join("  ")}</p>
        </div>
      )}
      {status.enabled ? (
        <>
          <p className="muted">Aktivdir: girişdə şifrədən sonra tətbiqdəki kod soruşulur.</p>
          <Field label="Söndürmək üçün hazırkı şifrə"><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Field label="Tətbiq kodu və ya ehtiyat kod"><input value={code} onChange={(e) => setCode(e.target.value)} /></Field>
          <button type="button" className="secondary" onClick={() => run(async () => { await api("auth/2fa-disable", { currentPassword: password, code }); setPassword(""); setCode(""); setBackup([]); notify("İki mərhələli giriş söndürüldü."); await load(); })}>Söndür</button>
        </>
      ) : setup ? (
        <>
          <p className="muted">Google Authenticator, Microsoft Authenticator və ya oxşar tətbiqdə “açar daxil et” seçin və bu açarı yazın:</p>
          <p style={{ fontFamily: "monospace", wordBreak: "break-all" }}><b>{setup.secret}</b></p>
          <p className="muted fine-print">Telefondan quraşdırırsınızsa: <a href={setup.uri}>tətbiqdə aç</a></p>
          <Field label="Tətbiqdəki 6 rəqəmli kod"><input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} /></Field>
          <button type="button" className="primary" onClick={() => run(async () => { const r = (await api("auth/2fa-enable", { code })) as { backupCodes: string[] }; setBackup(r.backupCodes); setSetup(null); setCode(""); notify("İki mərhələli giriş aktivdir. Ehtiyat kodları saxlayın."); await load(); })}>Təsdiqlə və aktiv et</button>
        </>
      ) : (
        <button type="button" className="secondary" onClick={() => run(async () => setSetup((await api("auth/2fa-setup", {})) as { secret: string; uri: string }))}>Qur</button>
      )}
      <h3><MonitorSmartphone size={17} /> Aktiv cihazlar</h3>
      <ul>
        {sessions.map((s) => (
          <li key={s.id}>
            {deviceName(s.agent)}{s.current ? " (bu cihaz)" : ""}
            {s.created && <small className="muted"> · {new Date(s.created).toLocaleString("az-AZ")}</small>}
            {!s.current && <button type="button" className="text-button" onClick={() => run(async () => { await api("auth/revoke-session", { id: s.id }); await load(); })}>Çıxart</button>}
          </li>
        ))}
      </ul>
      {sessions.length > 1 && (
        <button type="button" className="secondary" onClick={() => run(async () => { await api("auth/revoke-session", { all: true }); notify("Digər cihazlardan çıxış edildi."); await load(); })}>Digər bütün cihazlardan çıx</button>
      )}
    </section>
  );
}

// Which kinds of notification also arrive by e-mail.
function EmailPrefsPanel({ api, notify }: { api: (path: string, body?: unknown) => Promise<unknown>; notify: (s: string) => void }) {
  const [data, setData] = useState<{ emailOff: string[]; categories: { id: string; label: string }[] } | null>(null);
  useEffect(() => {
    api("notification-prefs").then((d) => setData(d as NonNullable<typeof data>)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!data) return null;
  const toggle = async (id: string, on: boolean) => {
    const emailOff = on ? data.emailOff.filter((x) => x !== id) : [...data.emailOff, id];
    setData({ ...data, emailOff });
    try { await api("notification-prefs", { emailOff }); } catch (err) { notify((err as Error).message); }
  };
  return (
    <section className="account-settings-section">
      <h3><Bell size={17} /> E-poçt bildirişləri</h3>
      <p className="muted">Sayt daxilində bildirişlər həmişə göstərilir. Aşağıdakılar e-poçtla da gəlsin?</p>
      {data.categories.map((c) => (
        <label key={c.id} className="checkline">
          <input type="checkbox" checked={!data.emailOff.includes(c.id)} onChange={(e) => toggle(c.id, e.target.checked)} /> {c.label}
        </label>
      ))}
    </section>
  );
}
