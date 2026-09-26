/// <reference types="vite/client" />
import type { GameHooks } from './debug/hooks.ts';

declare global {
  interface Window {
    __game?: GameHooks;
    // tw (threewright) contract: tw check waits for ready before it reads the scene.
    __tw?: { ready?: Promise<unknown>; [key: string]: unknown };
  }
}
