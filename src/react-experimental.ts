import * as React from "react";
import * as ReactDOM from "react-dom";

/**
 * Typing hacks for experimental concurrent mode features in React
 */

export const createRoot = (ReactDOM as any).unstable_createRoot;

export const useTransition: () => [
  (fn: Function) => void,
  boolean
] = (React as any).unstable_useTransition;
