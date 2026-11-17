import { Component, type ReactNode } from "react";
import { useLocation } from "react-router";
import { ErrorState } from "../ui/States";

type Props = { children: ReactNode };
type State = { failed: boolean };

class Boundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <ErrorState onRetry={() => this.setState({ failed: false })} />;
    return this.props.children;
  }
}

/** Catches a screen that crashed, shows the error screen, and starts clean again when the staff member goes elsewhere. */
export default function ErrorBoundary({ children }: Props) {
  const { pathname } = useLocation();
  return <Boundary key={pathname}>{children}</Boundary>;
}
