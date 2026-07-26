import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Globe, ArrowRight, Loader2, Lock, UserCheck, ShieldAlert, KeyRound } from "lucide-react";
import { HoloAmbient } from "@/components/three/HoloAmbient";
import { GlassPanel, Button, Badge } from "@/components/ui/Primitives";
import { useNavigate } from "react-router-dom";
import { getStoredUsers, setCurrentUser, PoliceUser } from "@/services/authStore";

type Stage = "credentials" | "mfa" | "loading";

export default function Login() {
  const users = getStoredUsers();
  const [selectedUser, setSelectedUser] = useState<PoliceUser>(users[0]); // Default DSP
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<Stage>("credentials");
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [attempts, setAttempts] = useState(0);
  const navigate = useNavigate();

  function handleSelectUser(u: PoliceUser) {
    setSelectedUser(u);
    setPassword(""); // Clear password field on officer select
    setError(null);
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError("Please enter your official security password to proceed.");
      return;
    }

    // Validate security password (Demo passcodes: 1234, password123, drishti)
    const validPasscodes = ["1234", "password123", "drishti", "admin", "123456"];
    if (!validPasscodes.includes(password.trim())) {
      setError("INVALID SECURITY PASSCODE: Incorrect password. (Demo Officer Passcode: 1234)");
      return;
    }

    // Check if account is suspended by DSP
    const latestUsers = getStoredUsers();
    const freshUser = latestUsers.find((x) => x.id === selectedUser.id) || selectedUser;

    if (freshUser.status === "suspended") {
      setError(`ACCOUNT SUSPENDED: ${freshUser.name} (${freshUser.rank}) account has been suspended by the DSP. Contact Range HQ for reinstatement.`);
      return;
    }

    setCurrentUser(freshUser);
    setStage("mfa");
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim() || (otp !== "123456" && otp !== "1234")) {
      setAttempts((a) => a + 1);
      setError(attempts >= 4 ? "Account locked. Contact your Admin to reset." : "Incorrect 2FA code. (Demo 2FA OTP: 123456)");
      return;
    }
    setStage("loading");
    setTimeout(() => navigate("/dashboard"), 900);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg py-8">
      <HoloAmbient />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-bg/40 to-bg" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-xl px-4"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-elevated">
            <ShieldCheck size={26} />
          </div>
          <h1 className="text-2xl font-bold">Project Drishti</h1>
          <p className="text-sm text-muted">Karnataka State Police · Multi-Tier Intelligence Platform</p>
        </div>

        <GlassPanel className="p-6 space-y-5">
          {/* Police Hierarchy Selector */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted flex items-center justify-between">
              <span>Select Officer Login Profile</span>
              <span className="text-[10px] text-primary font-mono lowercase">demo pin: 1234</span>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {users.map((u) => {
                const isSelected = selectedUser.id === u.id;
                const isSuspended = u.status === "suspended";
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                        : "border-line bg-white/60 hover:bg-white"
                    }`}
                  >
                    <img src={u.avatar} alt={u.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold truncate text-ink">{u.name}</p>
                        <Badge tone={u.rank === "DSP" ? "accent" : isSuspended ? "danger" : "info"}>
                          {u.rank}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted truncate">{u.station}</p>
                      {isSuspended && (
                        <p className="text-[10px] text-danger font-semibold flex items-center gap-1 mt-0.5">
                          <ShieldAlert size={10} /> Account Suspended
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {stage === "credentials" && (
              <motion.form
                key="creds"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                onSubmit={submitCredentials}
                className="space-y-4 pt-2 border-t border-line"
              >
                <div className="rounded-lg bg-bg/60 p-3 border border-line flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-ink">{selectedUser.name}</span>
                    <span className="text-muted"> · {selectedUser.roleTitle}</span>
                  </div>
                  <Badge tone={selectedUser.rank === "DSP" ? "accent" : "primary"}>
                    {selectedUser.forceId}
                  </Badge>
                </div>

                <Field label="Officer Security Password / Passcode">
                  <div className="relative">
                    <input
                      required
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      placeholder="Enter passcode (Demo PIN: 1234)"
                      className="input pl-9"
                    />
                    <KeyRound size={16} className="absolute left-3 top-3 text-muted pointer-events-none" />
                  </div>
                </Field>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-danger/10 border border-danger/20 p-3 text-xs text-danger font-mono">
                    <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button className="w-full" type="submit">
                  Sign in as {selectedUser.name} ({selectedUser.rank}) <ArrowRight size={15} />
                </Button>
              </motion.form>
            )}

            {stage === "mfa" && (
              <motion.form
                key="mfa"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                onSubmit={submitOtp}
                className="space-y-4 pt-2 border-t border-line"
              >
                <div className="text-center">
                  <p className="text-sm font-semibold text-ink">Two-Factor Authentication (2FA)</p>
                  <p className="text-xs text-muted mt-0.5">
                    Security verification code sent to {selectedUser.name}'s official terminal. (Demo OTP: 123456)
                  </p>
                </div>

                <input
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  placeholder="123456"
                  className="input text-center font-mono text-xl tracking-[0.5em] py-3"
                />

                {error && <p className="text-xs text-danger text-center">{error}</p>}

                <Button className="w-full" type="submit" disabled={attempts >= 5}>
                  Verify &amp; Launch Drishti Platform
                </Button>
              </motion.form>
            )}

            {stage === "loading" && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="animate-spin text-primary" size={26} />
                <p className="text-sm font-medium text-ink">Verifying {selectedUser.name} ({selectedUser.rank}) Role &amp; Jurisdiction Scope…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassPanel>

        <p className="mt-4 text-center text-xs text-muted">
          DSP role grants complete multi-station oversight and account management across all Inspectors, SIs, and Constables.
        </p>
      </motion.div>

      <style>{`.input{ width:100%; border:1px solid #E5E9F0; background:#fff; border-radius:10px; padding:10px 12px; font-size:14px; outline:none; } .input:focus{ border-color:#2563EB; box-shadow:0 0 0 3px rgba(37,99,235,0.12); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
