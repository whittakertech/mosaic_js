export function applyClasses(el: HTMLElement, classes: string): void {
  if (!classes) return;
  el.classList.add(...classes.split(/\s+/).filter(Boolean));
}

export function removeClasses(el: HTMLElement, classes: string): void {
  if (!classes) return;
  el.classList.remove(...classes.split(/\s+/).filter(Boolean));
}
