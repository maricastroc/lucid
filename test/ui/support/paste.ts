import { act } from "@testing-library/react";

export function pasteInto(field: HTMLTextAreaElement, flavours: { html?: string; plain: string }): void {
  act(() => {
    field.focus();
    field.setSelectionRange(0, field.value.length);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", {
      value: {
        types: flavours.html === undefined ? ["text/plain"] : ["text/plain", "text/html"],
        getData: (type: string) => (type === "text/html" ? (flavours.html ?? "") : flavours.plain),
      },
    });
    const notPrevented = field.dispatchEvent(event);

    if (notPrevented) {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
      setValue.call(field, flavours.plain);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
}
