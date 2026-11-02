import { afterEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "@/lib/api";

const respond = (status: number, body?: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })),
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("request", () => {
  it("builds query strings without undefined params", async () => {
    respond(200, { items: [], total: 0 });
    await api.history({ genre: undefined, limit: 10, offset: 20 });
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("/api/proxy/history?limit=10&offset=20");
  });

  it.each([
    [{ detail: "Email already registered" }, 409, "Email already registered"],
    [
      { detail: [{ msg: "Value error, Password must be at most 72 bytes" }] },
      422,
      "Password must be at most 72 bytes",
    ],
    [{}, 502, "Something went wrong on our side. Try again."],
    [{}, 400, "Request failed."],
  ])("maps %j (%d) to a readable ApiError", async (body, status, message) => {
    respond(status, body);
    await expect(api.tasteProfile()).rejects.toEqual(new ApiError(status, message));
  });

  it("treats 204 as an empty success", async () => {
    respond(204);
    await expect(api.deletePrediction("x")).resolves.toBeUndefined();
  });
});

class FakeXHR {
  static last: FakeXHR;
  upload = { onprogress: null as null | ((e: Partial<ProgressEvent>) => void) };
  status = 0;
  response: unknown = null;
  responseType = "";
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  open = vi.fn();
  abort = vi.fn();
  send = vi.fn();
  constructor() {
    FakeXHR.last = this;
  }
}

describe("upload", () => {
  const start = (onProgress = vi.fn(), signal = new AbortController().signal) => {
    vi.stubGlobal("XMLHttpRequest", FakeXHR);
    return api.upload(new Blob(["x"]), "a.wav", onProgress, signal);
  };

  it("reports progress and resolves with the prediction", async () => {
    const onProgress = vi.fn();
    const pending = start(onProgress);
    FakeXHR.last.upload.onprogress!({ lengthComputable: true, loaded: 5, total: 10 });
    Object.assign(FakeXHR.last, { status: 201, response: { genre: "jazz" } });
    FakeXHR.last.onload!();
    await expect(pending).resolves.toEqual({ genre: "jazz" });
    expect(onProgress).toHaveBeenCalledWith(0.5);
    expect(FakeXHR.last.open).toHaveBeenCalledWith("POST", "/api/proxy/predict");
  });

  it("rejects with the server's message, on network errors, and on abort", async () => {
    let pending = start();
    Object.assign(FakeXHR.last, { status: 413, response: { detail: "File exceeds 50 MB" } });
    FakeXHR.last.onload!();
    await expect(pending).rejects.toEqual(new ApiError(413, "File exceeds 50 MB"));

    pending = start();
    FakeXHR.last.onerror!();
    await expect(pending).rejects.toEqual(new ApiError(0, "Network error. Check your connection."));

    const controller = new AbortController();
    pending = start(vi.fn(), controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(FakeXHR.last.abort).toHaveBeenCalled();
  });
});
