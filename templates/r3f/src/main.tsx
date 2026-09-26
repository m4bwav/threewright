import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { setConsoleFunction } from 'three';
import { App } from './App.tsx';

// @react-three/fiber 9 still creates a THREE.Clock for state.clock, and three
// warns once per <Canvas> that Clock is deprecated (r183). The app cannot fix
// that, so drop that one message and pass every other three.js message on.
// Remove this once fiber stops using Clock (the fiber 10 alphas already have).
setConsoleFunction((type, message, ...params) => {
  if (message.startsWith('THREE.Clock:')) return;
  console[type](message, ...params);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
