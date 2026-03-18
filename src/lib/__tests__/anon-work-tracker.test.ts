import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "../anon-work-tracker";

const STORAGE_KEY = "uigen_has_anon_work";
const DATA_KEY = "uigen_anon_data";

describe("anon-work-tracker", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe("setHasAnonWork", () => {
    test("sets storage when messages are present", () => {
      setHasAnonWork([{ role: "user", content: "hello" }], {});
      expect(sessionStorage.getItem(STORAGE_KEY)).toBe("true");
    });

    test("sets storage when fileSystemData has more than root", () => {
      setHasAnonWork([], { "/": {}, "/App.jsx": {} });
      expect(sessionStorage.getItem(STORAGE_KEY)).toBe("true");
    });

    test("does not set storage when both empty (only root in fs)", () => {
      setHasAnonWork([], { "/": {} });
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    test("does not set storage when both completely empty", () => {
      setHasAnonWork([], {});
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    test("serializes messages and fileSystemData to DATA_KEY", () => {
      const messages = [{ role: "user", content: "hi" }];
      const fileSystemData = { "/App.jsx": { type: "file" } };
      setHasAnonWork(messages, fileSystemData);
      const stored = JSON.parse(sessionStorage.getItem(DATA_KEY)!);
      expect(stored.messages).toEqual(messages);
      expect(stored.fileSystemData).toEqual(fileSystemData);
    });

    test("is a no-op in SSR (no window)", () => {
      const windowSpy = vi.spyOn(global, "window", "get");
      windowSpy.mockReturnValue(undefined as any);
      expect(() =>
        setHasAnonWork([{ role: "user", content: "hi" }], {})
      ).not.toThrow();
      windowSpy.mockRestore();
    });
  });

  describe("getHasAnonWork", () => {
    test("returns true when storage key is 'true'", () => {
      sessionStorage.setItem(STORAGE_KEY, "true");
      expect(getHasAnonWork()).toBe(true);
    });

    test("returns false when storage key is absent", () => {
      expect(getHasAnonWork()).toBe(false);
    });

    test("returns false when storage key is not 'true'", () => {
      sessionStorage.setItem(STORAGE_KEY, "false");
      expect(getHasAnonWork()).toBe(false);
    });

    test("returns false in SSR (no window)", () => {
      const windowSpy = vi.spyOn(global, "window", "get");
      windowSpy.mockReturnValue(undefined as any);
      expect(getHasAnonWork()).toBe(false);
      windowSpy.mockRestore();
    });
  });

  describe("getAnonWorkData", () => {
    test("returns parsed data when present", () => {
      const data = {
        messages: [{ role: "user", content: "hi" }],
        fileSystemData: { "/App.jsx": {} },
      };
      sessionStorage.setItem(DATA_KEY, JSON.stringify(data));
      expect(getAnonWorkData()).toEqual(data);
    });

    test("returns null when DATA_KEY is absent", () => {
      expect(getAnonWorkData()).toBeNull();
    });

    test("returns null when DATA_KEY contains invalid JSON", () => {
      sessionStorage.setItem(DATA_KEY, "not-json{{{");
      expect(getAnonWorkData()).toBeNull();
    });

    test("returns null in SSR (no window)", () => {
      const windowSpy = vi.spyOn(global, "window", "get");
      windowSpy.mockReturnValue(undefined as any);
      expect(getAnonWorkData()).toBeNull();
      windowSpy.mockRestore();
    });
  });

  describe("clearAnonWork", () => {
    test("removes both storage keys", () => {
      sessionStorage.setItem(STORAGE_KEY, "true");
      sessionStorage.setItem(DATA_KEY, "{}");
      clearAnonWork();
      expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(sessionStorage.getItem(DATA_KEY)).toBeNull();
    });

    test("is a no-op in SSR (no window)", () => {
      const windowSpy = vi.spyOn(global, "window", "get");
      windowSpy.mockReturnValue(undefined as any);
      expect(() => clearAnonWork()).not.toThrow();
      windowSpy.mockRestore();
    });
  });
});
