import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { recoverUnconfirmedWrites } from './db/repo';
import './styles/tokens.css';
import './styles/base.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

/* Replay anything the last teardown could not confirm before the first read
   happens, so a force-quit in the millisecond after a Return cannot cost a line.
   Normally this is one synchronous localStorage read that finds nothing. */
void recoverUnconfirmedWrites().finally(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
