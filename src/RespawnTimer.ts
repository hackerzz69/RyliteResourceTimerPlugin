export default function createTimer(settings: any, entityId: number, durationMillis: number, onEndCallback: Function): HTMLElement {
        const start = Date.now();
        const end = start + durationMillis;

        const container = document.createElement("div");
        container.style.borderRadius = "100%";
        container.style.border = "2px solid " + settings?.borderColor?.value?.toString();
        container.style.position = "absolute";
        container.style.minWidth = "0";
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.justifyContent = "center";
        container.style.color = settings?.fillColor?.value?.toString();
        container.style.fontSize = settings?.respawnTimerFontSize?.value?.toString();
        container.style.fontFamily = "Courier New, Inter";
        container.style.aspectRatio = "1 / 1";
        container.style.padding = "6px";

        const timer = document.createElement("span");
        container.appendChild(timer);

        const tick = (now: number) => {
            const remainingMs = end - Date.now(); // ignore 'now' if you prefer
            const remaining = Math.max(0, Math.round((remainingMs / 1000) * 10) / 10);
            timer.innerHTML = remaining.toFixed(1);

            if (remaining > 0) {
                requestAnimationFrame(tick);
            } else {
                container.remove();
                onEndCallback(entityId);
            }
        };

        requestAnimationFrame(tick);
        return container;
    }