import { describe, it, expect, beforeEach } from "vitest";
import { applyClasses, removeClasses } from "../src/css/apply";

describe("applyClasses / removeClasses", () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement("div");
  });

  it("applies a single class", () => {
    applyClasses(el, "foo");
    expect(el.classList.contains("foo")).toBe(true);
  });

  it("applies multiple space-separated classes", () => {
    applyClasses(el, "foo bar baz");

    expect(el.classList.contains("foo")).toBe(true);
    expect(el.classList.contains("bar")).toBe(true);
    expect(el.classList.contains("baz")).toBe(true);
  });

  it("ignores extra whitespace", () => {
    applyClasses(el, "  foo   bar  ");

    expect(el.classList.contains("foo")).toBe(true);
    expect(el.classList.contains("bar")).toBe(true);
    expect(el.classList.length).toBe(2);
  });

  it("removes multiple space-separated classes", () => {
    el.classList.add("foo", "bar", "baz");

    removeClasses(el, "foo bar");

    expect(el.classList.contains("foo")).toBe(false);
    expect(el.classList.contains("bar")).toBe(false);
    expect(el.classList.contains("baz")).toBe(true);
  });

  it("is a no-op for empty or undefined strings", () => {
    applyClasses(el, "");
    removeClasses(el, "");

    expect(el.classList.length).toBe(0);
  });
});