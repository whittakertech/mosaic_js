import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { emit } from '../src/events';

describe("emit()", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches a CustomEvent with the given name", () => {
    const spy = vi.spyOn(window, "dispatchEvent");
    const eventName = "mosaic:test";

    emit(eventName);

    expect(spy).toHaveBeenCalledTimes(1);

    const eventArg = spy.mock.calls[0][0];
    expect(eventArg).toBeInstanceOf(CustomEvent);
    expect(eventArg.type).toBe(eventName);
  });

  it("passes detail into the CustomEvent", () => {
    const spy = vi.spyOn(window, "dispatchEvent");
    const detail = { value: 42 };

    emit("mosaic:data", detail)

    const eventArg = spy.mock.calls[0][0];
    expect(eventArg.detail).toEqual(detail);
  });

  it("can be listened to by consumers", () => {
    const listener = vi.fn();
    const payload = { msg: "hello" };

    window.addEventListener("mosaic:listen", listener);
    emit("mosaic:listen", payload);

    expect(listener).toHaveBeenCalledTimes(1);
    const evt = listener.mock.calls[0][0];
    expect(evt.detail).toEqual(payload);

    window.removeEventListener("mosaic:listen", listener);
  })
});
