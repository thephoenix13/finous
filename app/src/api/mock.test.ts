import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { describeApiContract } from "./contract.suite";
import { ApiError, isApiError } from "./errors";
import { createMockApi } from "./mock";
import type { Api } from "./types";

describeApiContract("mock", () => createMockApi());

describe("mock API", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is an Api, plus failNext", () => {
    expectTypeOf(createMockApi()).toExtend<Api>();
    expectTypeOf(createMockApi().failNext).parameters.toEqualTypeOf<[ApiError]>();
  });

  describe("latency", () => {
    it("answers immediately by default", async () => {
      vi.useFakeTimers();
      await expect(createMockApi().getProfile()).resolves.toMatchObject({ firstName: "Aarav" });
      expect(vi.getTimerCount()).toBe(0);
    });

    it("holds every call back for the simulated delay, no more and no less", async () => {
      vi.useFakeTimers();
      let done = false;
      void createMockApi({ latencyMs: 300 })
        .getProfile()
        .then(() => (done = true));
      await vi.advanceTimersByTimeAsync(299);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(done).toBe(true);
    });
  });

  describe("cancellation", () => {
    it("rejects the moment the signal aborts mid-flight, and leaves no timer behind", async () => {
      vi.useFakeTimers();
      const controller = new AbortController();
      const call = createMockApi({ latencyMs: 500 }).getHome({ signal: controller.signal });
      const outcome = expect(call).rejects.toMatchObject({ name: "AbortError" });
      await vi.advanceTimersByTimeAsync(100);
      controller.abort();
      await outcome;
      expect(vi.getTimerCount()).toBe(0);
    });

    it("rejects with the reason the caller gave", async () => {
      const controller = new AbortController();
      const reason = new Error("navigated away");
      controller.abort(reason);
      await expect(createMockApi().getProfile({ signal: controller.signal })).rejects.toBe(reason);
    });

    it("lets a call finish when its signal never aborts", async () => {
      const controller = new AbortController();
      await expect(createMockApi({ latencyMs: 1 }).getProfile({ signal: controller.signal })).resolves.toBeDefined();
    });
  });

  describe("failNext", () => {
    it("fails the next call with exactly that error, then recovers", async () => {
      const api = createMockApi();
      const error = new ApiError("unavailable", "HDFC is not responding");
      api.failNext(error);
      await expect(api.getAccount("hdfc")).rejects.toBe(error);
      await expect(api.getAccount("hdfc")).resolves.toMatchObject({ id: "hdfc" });
    });

    it("fails any method, not just one", async () => {
      const api = createMockApi();
      api.failNext(new ApiError("unauthorized"));
      await expect(api.listGoals()).rejects.toMatchObject({ code: "unauthorized", status: 401 });
    });

    it("queues: two failures hit the next two calls, in order", async () => {
      const api = createMockApi();
      api.failNext(new ApiError("unauthorized"));
      api.failNext(new ApiError("unavailable"));
      await expect(api.getProfile()).rejects.toMatchObject({ code: "unauthorized" });
      await expect(api.getProfile()).rejects.toMatchObject({ code: "unavailable" });
      await expect(api.getProfile()).resolves.toBeDefined();
    });

    it("hits the next call made, not whichever call happens to finish first", async () => {
      const api = createMockApi({ latencyMs: 5 });
      const alreadyInFlight = api.getProfile(); // made before failNext, finishes after it
      api.failNext(new ApiError("unavailable"));
      const nextCall = api.getProfile();
      await expect(alreadyInFlight).resolves.toBeDefined();
      await expect(nextCall).rejects.toMatchObject({ code: "unavailable" });
    });

    it("is private to each instance", async () => {
      const a = createMockApi();
      const b = createMockApi();
      a.failNext(new ApiError("unavailable"));
      await expect(b.getProfile()).resolves.toBeDefined();
      await expect(a.getProfile()).rejects.toBeInstanceOf(ApiError);
    });
  });

  describe("ApiError", () => {
    it.each([
      ["unauthorized", 401],
      ["not_found", 404],
      ["unavailable", 503],
    ] as const)("%s carries HTTP status %i", (code, status) => {
      const e = new ApiError(code);
      expect(e.code).toBe(code);
      expect(e.status).toBe(status);
      expect(e.name).toBe("ApiError");
    });

    it("uses the code as the message unless told otherwise", () => {
      expect(new ApiError("not_found").message).toBe("not_found");
      expect(new ApiError("not_found", "No such goal").message).toBe("No such goal");
    });

    it("is an Error, and isApiError tells it from other failures", () => {
      expect(new ApiError("unavailable")).toBeInstanceOf(Error);
      expect(isApiError(new ApiError("unavailable"))).toBe(true);
      expect(isApiError(new Error("boom"))).toBe(false);
      expect(isApiError("unavailable")).toBe(false);
      expect(isApiError(null)).toBe(false);
    });

    it("names the missing id in a not_found message", async () => {
      await expect(createMockApi().getAccount("nope")).rejects.toThrow('No account with id "nope"');
      await expect(createMockApi().getGoal("nope")).rejects.toThrow('No goal with id "nope"');
    });
  });
});
