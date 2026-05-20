import React, { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertOctagon, RefreshCw, Terminal, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-12 font-sans text-foreground">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.06),transparent_65%)] pointer-events-none" />

          <div className="w-full max-w-2xl z-10">
            <Card className="border-destructive/20 bg-card/60 backdrop-blur-xl overflow-hidden shadow-2xl relative">
              {/* Hot crimson top accent bar to signify exception */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-destructive/0 via-destructive/50 to-destructive/0" />

              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center text-destructive mb-4 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse">
                    <AlertOctagon className="h-8 w-8" />
                  </div>

                  <div className="text-center">
                    <span className="font-mono text-[10px] tracking-widest text-destructive font-bold uppercase bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/20">
                      CRITICAL FAULT SHIELDED
                    </span>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground mt-3 font-sans">
                      "I apologize, sir. A system exception has occurred."
                    </h1>
                  </div>
                </div>

                <div className="bg-secondary/40 border border-border rounded-xl p-5 mb-6 text-sm text-foreground/90 leading-relaxed font-sans">
                  <p className="font-medium text-destructive/80 font-mono mb-1">J.A.R.V.I.S.</p>
                  <p className="text-muted-foreground">
                    "I have intercepted a runtime mismatch within the active module. To prevent workspace corruption, I have engaged our local backup layers. You may reload our interface or return to safe coordinates immediately."
                  </p>
                </div>

                {/* Error Details Board */}
                {this.state.error && (
                  <div className="border border-border/80 rounded-xl bg-background/90 p-4 font-mono text-xs overflow-hidden mb-6">
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/60">
                      <div className="flex items-center gap-1.5 text-destructive/80">
                        <Terminal className="h-3.5 w-3.5" />
                        <span>Incident Log Record</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">EXCEPTION</span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                      <p className="text-destructive font-semibold">
                        {this.state.error.name}: {this.state.error.message}
                      </p>
                      {this.state.errorInfo && (
                        <pre className="text-muted-foreground/80 leading-relaxed font-mono whitespace-pre-wrap text-[10px] select-all">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

                {/* Response Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    id="err_boundary_reset_btn"
                    onClick={this.handleReset}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all text-sm cursor-pointer shadow-md"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Restart Interface
                  </button>

                  <button
                    id="err_boundary_home_btn"
                    onClick={() => { window.location.href = "/dashboard"; }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors text-sm cursor-pointer"
                  >
                    <Home className="h-4 w-4" />
                    Return Home
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
