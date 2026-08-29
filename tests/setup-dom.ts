import "@testing-library/dom";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import "./mocks/next-navigation";
import { mockPush, mockRefresh, mockSearchParams } from "./mocks/next-navigation";
import { resetUiComponentsStore } from "./mocks/handlers/ui-components";
import { server } from "./mocks/server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });

  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  }

  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterAll(() => server.close());

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetUiComponentsStore();
  mockPush.mockReset();
  mockRefresh.mockReset();
  mockSearchParams.forEach((_, key) => mockSearchParams.delete(key));
  vi.clearAllMocks();
});
