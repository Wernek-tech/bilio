// ponytail: root-level safety net — a render error anywhere used to blank the whole page (no boundary existed).
// Catches it, shows a recoverable screen instead, and logs the real error for debugging.
import {Component, ReactNode} from 'react';

type Props = {children: ReactNode};
type State = {error: Error | null};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {error: null};

  static getDerivedStateFromError(error: Error): State {
    return {error};
  }

  componentDidCatch(error: Error, info: {componentStack: string}) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#050403', color: '#f2e6d8', fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif', textAlign: 'center', padding: 24}}>
          <h1 style={{margin: 0, fontSize: 22}}>Bir şeyler ters gitti.</h1>
          <p style={{margin: 0, opacity: 0.75, maxWidth: 420}}>Sayfa beklenmedik bir hatayla karşılaştı. Yeniden yüklemek genelde çözer.</p>
          <button
            onClick={() => window.location.reload()}
            style={{padding: '10px 22px', borderRadius: 8, border: '1px solid #825b38', background: '#130d09', color: '#f0d8b4', cursor: 'pointer', fontSize: 15}}
          >
            Yeniden Dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
