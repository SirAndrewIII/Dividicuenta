import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom no implementa estas APIs del navegador
Element.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
