type LiveSyncDetail = { key: string; value: string | null };

const eventName = "staysync:live-sync";

export function publishBrowserState(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new CustomEvent<LiveSyncDetail>(eventName, { detail: { key, value } }));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(eventName);
    channel.postMessage({ key, value } satisfies LiveSyncDetail);
    channel.close();
  }
}

export function subscribeBrowserState(key: string, onValue: (value: string | null) => void) {
  if (typeof window === "undefined") return;
  const browserWindow = window;
  let lastValue = browserWindow.localStorage.getItem(key);
  const receive = (value: string | null) => {
    if (value === lastValue) return;
    lastValue = value;
    onValue(value);
  };
  browserWindow.addEventListener("storage", (event) => {
    if (event.key === key) receive(event.newValue);
  });
  browserWindow.addEventListener(eventName, (event) => {
    const detail = (event as CustomEvent<LiveSyncDetail>).detail;
    if (detail?.key === key) receive(detail.value);
  });
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(eventName);
    channel.addEventListener("message", (event: MessageEvent<LiveSyncDetail>) => {
      if (event.data?.key === key) receive(event.data.value);
    });
  }
}
