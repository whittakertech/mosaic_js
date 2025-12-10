export function emit(name: string, detail?: any) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
