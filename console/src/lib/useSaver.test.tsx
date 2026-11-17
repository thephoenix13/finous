import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSaver } from "./useSaver";

/** A save the test finishes by hand, so it can look at the hook while the save is still running. */
function openSave<T = void>() {
  let done!: (value: T) => void;
  let fail!: (reason: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    done = resolve;
    fail = reject;
  });
  return { promise, done, fail };
}

describe("useSaver", () => {
  it("starts idle, then saving, then saved, and says whether it worked", async () => {
    const { result } = renderHook(() => useSaver());
    expect(result.current.state).toEqual({ status: "idle" });
    const gate = openSave();
    let outcome: Promise<boolean>;
    act(() => {
      outcome = result.current.run(() => gate.promise);
    });
    expect(result.current.state).toEqual({ status: "saving" });
    await act(async () => {
      gate.done();
      expect(await outcome).toBe(true);
    });
    expect(result.current.state).toEqual({ status: "saved" });
  });

  it("ignores a second press while a save is running, however many come", async () => {
    const { result } = renderHook(() => useSaver());
    const gate = openSave();
    const save = vi.fn(() => gate.promise);
    let outcomes: Promise<boolean>[] = [];
    act(() => {
      outcomes = [result.current.run(save), result.current.run(save), result.current.run(save)];
    });
    await act(async () => {
      gate.done();
      await Promise.all(outcomes);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(await Promise.all(outcomes)).toEqual([true, false, false]);
  });

  it("can save again once the first one has finished", async () => {
    const { result } = renderHook(() => useSaver());
    const save = vi.fn(async () => {});
    await act(async () => void (await result.current.run(save)));
    await act(async () => void (await result.current.run(save)));
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("reports a failure with the message for that error, and can try again", async () => {
    const { result } = renderHook(() => useSaver());
    const describe = vi.fn((e: unknown) => `Nope: ${(e as Error).message}`);
    await act(async () => {
      expect(await result.current.run(async () => { throw new Error("boom"); }, describe)).toBe(false);
    });
    expect(result.current.state).toEqual({ status: "error", message: "Nope: boom" });
    await act(async () => {
      expect(await result.current.run(async () => {})).toBe(true);
    });
    expect(result.current.state).toEqual({ status: "saved" });
  });

  it("falls back to a plain message that says the changes are still there", async () => {
    const { result } = renderHook(() => useSaver());
    await act(async () => void (await result.current.run(async () => { throw new Error("x"); })));
    expect(result.current.state).toMatchObject({ status: "error", message: expect.stringContaining("Your changes are still here") });
  });

  it("goes quiet on reset, but never in the middle of a save", async () => {
    const { result } = renderHook(() => useSaver());
    await act(async () => void (await result.current.run(async () => {})));
    act(() => result.current.reset());
    expect(result.current.state).toEqual({ status: "idle" });

    const gate = openSave();
    let outcome: Promise<boolean>;
    act(() => {
      outcome = result.current.run(() => gate.promise);
    });
    act(() => result.current.reset());
    expect(result.current.state).toEqual({ status: "saving" });
    await act(async () => {
      gate.done();
      await outcome;
    });
  });

  it("does not touch the screen if the save finishes after it has gone", async () => {
    const { result, unmount } = renderHook(() => useSaver());
    const gate = openSave();
    let outcome!: Promise<boolean>;
    act(() => {
      outcome = result.current.run(() => gate.promise);
    });
    unmount();
    gate.done();
    await expect(outcome).resolves.toBe(true);
  });
});
