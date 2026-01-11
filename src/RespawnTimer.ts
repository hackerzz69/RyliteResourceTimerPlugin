type TimerSettings = {
    borderColor?: { value?: string };
    fillColor?: { value?: string };
    respawnTimerFontSize?: { value?: number };
};

export default function createTimer(
    settings: TimerSettings,
    durationMillis: number,
    onEndCallback: () => void
): HTMLElement {
    const start = Date.now();
    const end = start + durationMillis;

    const container = document.createElement("div");
    container.style.borderRadius = "100%";
    container.style.border = `1px solid ${settings?.borderColor?.value ?? ""}`;
    container.style.position = "absolute";
    container.style.minWidth = "0";
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.style.color = settings?.fillColor?.value ?? "";
    container.style.fontSize = `${
        settings?.respawnTimerFontSize?.value ?? 14
    }px`;
    container.style.fontFamily = "Courier New, Inter";
    container.style.fontWeight = "bold";
    container.style.aspectRatio = "1 / 1";
    container.style.padding = "6px";
    container.style.pointerEvents = "none";

    const timer = document.createElement("span");
    container.appendChild(timer);

    const tick = () => {
        const remainingMs = end - Date.now();
        const remaining = Math.max(
            0,
            Math.round((remainingMs / 1000) * 10) / 10
        );

        timer.textContent = remaining.toFixed(1);

        if (remaining > 0) {
            requestAnimationFrame(tick);
        } else {
            container.remove();
            onEndCallback();
        }
    };

    requestAnimationFrame(tick);
    return container;
}
