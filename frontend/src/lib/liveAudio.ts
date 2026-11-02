// Builds the capture graph: mic (raw, no voice processing) or a playing <audio> element → PCM worklet.
export type LiveSource = { kind: "mic" } | { kind: "file"; element: HTMLMediaElement };

export interface Capture {
  context: AudioContext;
  stop: () => Promise<void>;
}

export async function startCapture(
  source: LiveSource,
  onFrame: (pcm: Int16Array) => void,
): Promise<Capture> {
  const stream =
    source.kind === "mic"
      ? await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        })
      : null;
  const context = new AudioContext();
  await context.audioWorklet.addModule("/worklets/pcm-processor.js");
  const worklet = new AudioWorkletNode(context, "pcm-processor");
  worklet.port.onmessage = (e: MessageEvent<Int16Array>) => onFrame(e.data);
  // The worklet writes no output; connecting it to the destination just keeps it scheduled in every browser.
  worklet.connect(context.destination);

  if (stream) {
    context.createMediaStreamSource(stream).connect(worklet);
  } else if (source.kind === "file") {
    const node = context.createMediaElementSource(source.element);
    node.connect(worklet);
    node.connect(context.destination);
    await source.element.play();
  }
  await context.resume();

  return {
    context,
    stop: async () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (source.kind === "file") source.element.pause();
      worklet.port.onmessage = null;
      await context.close();
    },
  };
}
