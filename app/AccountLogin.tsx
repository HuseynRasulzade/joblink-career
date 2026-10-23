"use client";
import { useState } from "react";
import { ArrowRight, Building2, LockKeyhole, UserPlus, UserRound } from "lucide-react";
import { Field } from "./components";
import { localizeTree } from "./i18n";

export default function AccountLogin({
  onComplete,
  resetToken = "",
  onResetDone,
}: {
  onComplete: (role: "candidate" | "company" | "admin") => Promise<void>;
  resetToken?: string;
  onResetDone?: () => void;
}) {
  // "forgot" asks for a reset link by e-mail; "reset" sets the new password from that link.
  const [view, setView] = useState<"" | "forgot" | "reset">(resetToken ? "reset" : "");
  const [code, setCode] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const [info, setInfo] = useState("");
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [role, setRole] = useState<"candidate" | "company">("candidate");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submitSpecial() {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (view === "forgot") {
        await post("forgot", { email });
        setInfo("Bu e-poçtla hesab varsa, şifrəni yeniləmək üçün link göndərildi. Qutunuzu (və spam qovluğunu) yoxlayın.");
      } else {
        if (password !== passwordConfirmation) throw new Error("Şifrələr uyğun gəlmir.");
        await post("reset", { token: resetToken, password });
        setPassword("");
        setPasswordConfirmation("");
        setInfo("Şifrə yeniləndi. İndi yeni şifrə ilə daxil ola bilərsiniz.");
        setView("");
        onResetDone?.();
      }
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function post(action: string, payload: unknown) {
    const response = await fetch(`/api/joblink/auth/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(body.error || "Əməliyyat tamamlanmadı.");
    return body;
  }
  async function submit() {
    setError("");
    if (register && password !== passwordConfirmation) {
      setError("Şifrələr uyğun gəlmir.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/joblink/auth/${register ? "register" : "login"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role, code }),
        },
      );
      const body = (await response.json()) as {
        error?: string;
        twoFactor?: boolean;
        role?: "candidate" | "company" | "admin";
      };
      if (body.twoFactor) setTwoFactor(true);
      if (!response.ok) throw new Error(body.error || "Giriş tamamlanmadı.");
      await onComplete(body.role || role);
    } catch (caught) {
      setError((caught as Error).message || "Giriş alınmadı.");
    } finally {
      setBusy(false);
    }
  }

  return localizeTree(
    <div className="account-login">
      <div className="assistant-icon">
        <LockKeyhole size={28} />
      </div>
      <h3>
        {register ? "Joblink hesabınızı yaradın" : "Hesabınıza daxil olun"}
      </h3>
      <p>
        E-poçt və şifrənizlə istənilən müasir brauzerdən daxil ola bilərsiniz.
      </p>
      {view ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submitSpecial();
          }}
        >
          {view === "forgot" ? (
            <Field label="E-poçt">
              <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
            </Field>
          ) : (
            <>
              <Field label="Yeni şifrə">
                <input type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />
              </Field>
              <Field label="Yeni şifrəni təkrar yazın">
                <input type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
              </Field>
            </>
          )}
          {info && <div className="notice" role="status">{info}</div>}
          {error && <div className="notice error" role="alert">{error}</div>}
          <button className="primary wide" disabled={busy}>
            {busy ? "Gözləyin…" : view === "forgot" ? "Sıfırlama linki göndər" : "Şifrəni yenilə"}
          </button>
          <button type="button" className="text-button" onClick={() => { setView(""); setError(""); setInfo(""); }}>Girişə qayıt</button>
        </form>
      ) : (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {register && (
          <>
            <div className="account-role-picker" role="radiogroup" aria-label="Hesab növü">
              <button
                type="button"
                role="radio"
                aria-checked={role === "candidate"}
                className={role === "candidate" ? "selected" : ""}
                onClick={() => setRole("candidate")}
              >
                <UserRound size={21} />
                <span><b>İş axtaran</b><small>CV yaradın və vakansiyalara müraciət edin</small></span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={role === "company"}
                className={role === "company" ? "selected" : ""}
                onClick={() => setRole("company")}
              >
                <Building2 size={21} />
                <span><b>Şirkət</b><small>Vakansiya yaradın və namizədləri idarə edin</small></span>
              </button>
            </div>
            <Field label={role === "company" ? "Şirkətin adı" : "Ad və soyad"}>
              <input
                autoComplete={role === "company" ? "organization" : "name"}
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
          </>
        )}
        <Field label="E-poçt">
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Şifrə">
          <input
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
            minLength={10}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        {!register && twoFactor && (
          <Field label="Doğrulama kodu (autentifikator və ya ehtiyat kod)">
            <input autoComplete="one-time-code" inputMode="numeric" required maxLength={20} value={code} onChange={(event) => setCode(event.target.value)} />
          </Field>
        )}
        {register && (
          <>
            <Field label="Şifrəni təkrar yazın">
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={10}
                maxLength={128}
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
              />
            </Field>
            <p className="fine-print muted">
              Şifrə ən azı 10 simvol olmalıdır.
            </p>
          </>
        )}
        {info && <div className="notice" role="status">{info}</div>}
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <button className="primary wide" disabled={busy}>
          <LockKeyhole size={17} />
          {busy ? "Gözləyin…" : register ? "Hesab yarat" : "Daxil ol"}
          <ArrowRight size={16} />
        </button>
        {!register && (
          <button type="button" className="text-button" onClick={() => { setView("forgot"); setError(""); setInfo(""); }}>
            Şifrəni unutmusunuz?
          </button>
        )}
      </form>
      )}
      <button
        type="button"
        className="text-button"
        disabled={busy}
        onClick={() => {
          setRegister(!register);
          setError("");
          setPasswordConfirmation("");
        }}
      >
        <UserPlus size={15} />
        {register ? "Hesabım var — daxil ol" : "Yeni hesab yarat"}
      </button>
      <p className="fine-print muted">
        Sessiya bu cihazda 7 gün qorunur. Şifrəniz açıq mətn kimi saxlanmır.
      </p>
    </div>,
  );
}
