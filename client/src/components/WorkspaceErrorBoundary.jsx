import React from "react";
import { RefreshCcw, TriangleAlert } from "lucide-react";

const initialState = {
  hasError: false,
};

export default class WorkspaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = initialState;
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Synapse workspace rendering boundary caught an error.", error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetToken !== this.props.resetToken && this.state.hasError) {
      this.setState(initialState);
    }
  }

  handleReset = () => {
    if (typeof this.props.onReset === "function") {
      this.props.onReset();
      return;
    }

    this.setState(initialState);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="rounded-[2rem] border border-amber-300/20 bg-slate-900/80 p-6 shadow-panel backdrop-blur-sm sm:p-8">
              <div className="mx-auto flex max-w-3xl flex-col items-start gap-5 rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-6 sm:p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-amber-100">
                  <TriangleAlert className="h-4 w-4" />
                  Workspace Recovery
                </div>

                <div>
                  <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Canvas layout encountered a rendering hitch
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                    Synapse caught the rendering failure before it could take down the entire workspace.
                    Reset the viewport to remount the canvas shell safely and continue working.
                  </p>
                </div>

                <button
                  className="inline-flex items-center gap-2 rounded-[1.2rem] border border-cyan-300/30 bg-cyan-400/15 px-5 py-3 text-sm font-semibold text-cyan-50 transition hover:border-cyan-200/50 hover:bg-cyan-400/20"
                  onClick={this.handleReset}
                  type="button"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset Viewport
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}