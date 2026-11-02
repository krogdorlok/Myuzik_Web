import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DropZone } from "@/components/upload/DropZone";
import { UploadProgress } from "@/components/upload/UploadProgress";

const file = new File(["x"], "song.wav", { type: "audio/wav" });

describe("DropZone", () => {
  it("accepts a file from the keyboard-reachable input", async () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);
    await userEvent.upload(screen.getByLabelText(/Drop a track/), file);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("highlights on drag-over and accepts drops", () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);
    const zone = screen.getByText("Drop a track or browse").closest("label")!;
    fireEvent.dragOver(zone);
    expect(zone.className).toContain("scale-[1.02]");
    fireEvent.dragLeave(zone);
    expect(zone.className).not.toContain("scale-[1.02]");
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("announces errors and links them to the input", () => {
    render(<DropZone onFile={() => undefined} error="Too big" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Too big");
    expect(screen.getByLabelText(/Drop a track/)).toHaveAccessibleDescription("Too big");
  });
});

describe("UploadProgress", () => {
  it("shows upload percentage, then an indeterminate analysing state", () => {
    const { rerender } = render(
      <UploadProgress file={file} progress={0.42} onCancel={() => undefined} />,
    );
    expect(screen.getByText("Uploading 42%")).toBeInTheDocument();
    rerender(<UploadProgress file={file} progress={null} onCancel={() => undefined} />);
    expect(screen.getByText("Analysing…")).toBeInTheDocument();
    expect(screen.getByLabelText("Analysing…")).not.toHaveAttribute("value");
  });

  it("can be cancelled", async () => {
    const onCancel = vi.fn();
    render(<UploadProgress file={file} progress={0.1} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
