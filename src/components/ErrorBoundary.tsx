import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4" dir="rtl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl font-bold">
            ⚠️
          </div>
          <h1 className="text-xl font-bold text-rose-400">حدث خطأ في تحميل التمريرات أو الإعدادات</h1>
          <p className="text-xs text-slate-400 max-w-md bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono dir-ltr text-left overflow-auto max-h-32">
            {this.state.error?.message || "Unknown Application Error"}
          </p>
          <Button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            className="bg-primary hover:bg-primary/90 text-white font-bold text-xs px-6 py-2 rounded-xl"
          >
            تحديث وإعادة تحميل التطبيق 🔄
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
