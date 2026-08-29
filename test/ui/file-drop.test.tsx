import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { useFileDrop } from "@/app/hooks/use-file-drop";

function Zone({ onFile }: { onFile: (file: File) => void }) {
  const drop = useFileDrop(onFile);
  return (
    <section aria-label="documento" {...drop.handlers}>
      {drop.dragging ? "Solte para abrir" : "documento"}
    </section>
  );
}

const withFiles = (files: File[]): DataTransfer =>
  ({ types: files.length > 0 ? ["Files"] : ["text/plain"], files, dropEffect: "none" }) as unknown as DataTransfer;

const fire = (type: string, dataTransfer: DataTransfer): boolean => {
  const zone = screen.getByRole("region", { name: "documento" });
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  act(() => {
    zone.dispatchEvent(event);
  });
  return event.defaultPrevented;
};

const pdf = () => new File(["%PDF"], "edital.pdf", { type: "application/pdf" });

describe("dropping a file on the document", () => {
  it("hands the file over and stops the browser from opening it", () => {
    const onFile = vi.fn();
    render(<Zone onFile={onFile} />);

    expect(fire("dragover", withFiles([pdf()]))).toBe(true);
    fire("drop", withFiles([pdf()]));

    expect(onFile).toHaveBeenCalledOnce();
    expect(onFile.mock.calls[0][0].name).toBe("edital.pdf");
  });

  it("says where the file will land while it is held over the document", () => {
    render(<Zone onFile={vi.fn()} />);
    expect(screen.queryByText(/solte para abrir/i)).not.toBeInTheDocument();

    fire("dragenter", withFiles([pdf()]));

    expect(screen.getByText(/solte para abrir/i)).toBeInTheDocument();
  });

  it("keeps the invitation up while the file crosses the text inside", () => {
    render(<Zone onFile={vi.fn()} />);
    const files = withFiles([pdf()]);

    fire("dragenter", files);
    fire("dragenter", files);
    fire("dragleave", files);

    expect(screen.getByText(/solte para abrir/i)).toBeInTheDocument();

    fire("dragleave", files);

    expect(screen.queryByText(/solte para abrir/i)).not.toBeInTheDocument();
  });

  it("ignores a drag that carries no file — selecting text is not importing", () => {
    const onFile = vi.fn();
    render(<Zone onFile={onFile} />);
    const text = withFiles([]);

    expect(fire("dragover", text)).toBe(false);
    fire("dragenter", text);
    fire("drop", text);

    expect(screen.queryByText(/solte para abrir/i)).not.toBeInTheDocument();
    expect(onFile).not.toHaveBeenCalled();
  });
});
