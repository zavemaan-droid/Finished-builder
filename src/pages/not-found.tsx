import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, ArrowLeft, RefreshCw, Layers, Wifi, Terminal } from "lucide-react";
import { motion } from "motion/react";

export default function NotFound() {
  const [location, setLocation] = useLocation();
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [diagnosticStep, setDiagnosticStep] = useState(0);

  const startSelfDiagnostics = () => {
    if (runningDiagnostics) return;
    setRunningDiagnostics(true);
    setDiagnosticStep(0);
    setDiagnosticLogs([
      "Initializing J.A.R.V.I.S. self-diagnostic protocols...",
      "Pinging main workspace containers on port 3000... [OK]",
    ]);
  };

  useEffect(() => {
    if (!runningDiagnostics) return;

    const interval = setInterval(() => {
      setDiagnosticStep((prev) => {
        const next = prev + 1;
        if (next === 1) {
          setDiagnosticLogs((logs) => [
            ...logs,
            "Scanning directory routes and active mainframes... [RESOLVED]",
          ]);
        } else if (next === 2) {
          setDiagnosticLogs((logs) => [
            ...logs,
            "Checking local database security layers... [SAFE]",
          ]);
        } else if (next === 3) {
          setDiagnosticLogs((logs) => [
            ...logs,
            "Localizing offline fallback nodes... PWA Service Worker manifest active! [READY]",
          ]);
        } else if (next === 4) {
          setDiagnosticLogs((logs) => [
            ...logs,
            "Diagnostics complete, sir. System is operating at peak capacity.",
          ]);
          setRunningDiagnostics(false);
          clearInterval(interval);
        }
        return next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [runningDiagnostics]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-12 font-sans text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.06),transparent_65%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-xl z-10"
      >
        <Card className="border-border bg-card/60 backdrop-blur-xl glow-violet overflow-hidden shadow-2xl relative">
          {/* Top aesthetic bar */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-violet-500/0 via-violet-500/50 to-violet-500/0" />

          <CardContent className="p-8">
            {/* Pulsing J.A.R.V.I.S. Circular Voice Core */}
            <div className="flex flex-col items-center justify-center mb-8 relative">
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Outermost pulsing ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border border-violet-500/20"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.1, 0.4, 0.1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                {/* Secondary pulsing ring */}
                <motion.div
                  className="absolute inset-3 rounded-full border-2 border-violet-500/30"
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                />
                {/* Inner J.A.R.V.I.S core glow */}
                <div className="w-16 h-16 rounded-full bg-violet-950/40 border border-violet-500/60 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 border-2 border-violet-400 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-violet-400 animate-ping" />
                  </div>
                </div>
              </div>

              <div className="text-center mt-4">
                <span className="font-mono text-[10px] tracking-widest text-violet-400 font-bold uppercase bg-violet-500/10 px-2.5 py-1 rounded-full border border-violet-500/20">
                  SYSTEM DIAGNOSTIC 404
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground mt-3 font-sans">
                  "Ah, looking for something that isn't quite there, sir?"
                </h1>
              </div>
            </div>

            {/* Jarvis Persona Dialogue Block */}
            <div className="bg-secondary/40 border border-border rounded-xl p-5 mb-6 text-sm text-foreground/90 leading-relaxed font-sans relative">
              <div className="absolute top-2.5 right-3 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground bg-background/50 px-2 py-0.5 rounded border border-border">
                <Wifi className="h-3 w-3 text-emerald-500" /> LOCAL CORE ACTIVE
              </div>
              
              <p className="font-medium text-violet-300 font-mono mb-1">J.A.R.V.I.S.</p>
              <p className="text-muted-foreground">
                "Apologies, sir. The coordinates you designated: <code className="text-violet-400 font-mono px-1 bg-background/80 rounded border border-border text-xs">{location}</code> are currently not active within our system mainframe. Rest assured, our local servers on port 3000 are running beautifully. 
              </p>
              <p className="text-muted-foreground mt-2">
                As for offline usage, with our newly configured Web Manifest, you can permanently install this studio on your Android device and access our localized capabilities untethered!"
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <button
                id="back_to_dashboard_btn"
                onClick={() => setLocation("/dashboard")}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/95 shadow-md hover:shadow-violet-500/10 transition-all text-sm cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Dashboard
              </button>

              <button
                id="run_diagnostics_btn"
                onClick={startSelfDiagnostics}
                disabled={runningDiagnostics}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors text-sm cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${runningDiagnostics ? "animate-spin text-violet-400" : ""}`} />
                {runningDiagnostics ? "Running Tests..." : "Run Diagnostic Scan"}
              </button>
            </div>

            {/* Diagnostic Logs Visualizer */}
            {(diagnosticLogs.length > 0 || runningDiagnostics) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="border border-border/80 rounded-xl bg-background/90 p-4 font-mono text-xs overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/60">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Terminal className="h-3.5 w-3.5 text-violet-500" />
                    <span>Diagnostics Feed</span>
                  </div>
                  <span className="text-[10px] text-violet-400 animate-pulse font-bold">LIVE STREAM</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {diagnosticLogs.map((log, index) => (
                    <div key={index} className="flex gap-2 text-muted-foreground">
                      <span className="text-violet-500/80">&gt;</span>
                      <span className={index === diagnosticLogs.length - 1 ? "text-foreground font-medium" : ""}>
                        {log}
                      </span>
                    </div>
                  ))}
                  {runningDiagnostics && (
                    <div className="flex items-center gap-1 text-violet-400 ml-4 italic">
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce delay-100" />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce delay-200" />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Android Permanent Info Box */}
            <div className="mt-8 border-t border-border/40 pt-6 flex gap-3 text-xs text-muted-foreground leading-relaxed">
              <div className="p-2 h-max rounded-lg bg-violet-500/5 border border-violet-500/10">
                <ShieldCheck className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Android Installation Guide</p>
                <p>
                  To install Builder Studio permanently on your Android device with instant local launch and no connection latency: Tap the three dots (<span className="text-foreground">⋮</span>) key in Chrome's browser menu, then select <strong className="text-violet-400">"Add to Home Screen"</strong> or <strong className="text-violet-400">"Install App"</strong>. This launches it directly like any native application.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
