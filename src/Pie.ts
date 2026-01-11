type PieSettings = {
    radius?: { value?: number };
    borderRatio?: { value?: number };
    fillColor?: { value?: string };
    borderColor?: { value?: string };
    opacity?: { value?: number };
};

export default function createPie(
    settings: PieSettings,
    time: number,
    onEndCallback: () => void
): SVGElement {
    const radius = Number(settings.radius?.value ?? 0);
    const borderRatio = Number(settings.borderRatio?.value ?? 1);
    const strokeWidth = radius / borderRatio;

    const borderRadius = radius - strokeWidth / 2;
    const wedgeRadius = borderRadius - strokeWidth / 2;

    const diameter = radius * 2;
    const cx = diameter / 2;
    const cy = diameter / 2;

    const pie = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
    );
    pie.setAttribute("width", diameter.toString());
    pie.setAttribute("height", diameter.toString());
    pie.style.position = "absolute";
    pie.style.pointerEvents = "none";
    pie.style.opacity = String(settings.opacity?.value ?? 1);

    const border = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
    );
    border.setAttribute("cx", cx.toString());
    border.setAttribute("cy", cy.toString());
    border.setAttribute("r", borderRadius.toString());
    border.setAttribute("fill", "transparent");
    border.setAttribute(
        "stroke",
        settings.borderColor?.value ?? ""
    );
    border.setAttribute("stroke-width", strokeWidth.toString());
    pie.appendChild(border);

    const wedge = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
    );
    wedge.setAttribute("fill", settings.fillColor?.value ?? "");
    pie.appendChild(wedge);

    const start = performance.now();

    const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / time, 1);

        const angle = -progress * 2 * Math.PI;
        const x = cx + wedgeRadius * Math.sin(angle);
        const y = cy - wedgeRadius * Math.cos(angle);
        const largeArc = progress > 0.5 ? 1 : 0;

        const d = `M${cx},${cy} L${cx},${cy - wedgeRadius}
                   A${wedgeRadius},${wedgeRadius} 0 ${largeArc} 0 ${x},${y} Z`;
        wedge.setAttribute("d", d);

        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            pie.remove();
            onEndCallback();
        }
    };

    requestAnimationFrame(tick);
    return pie;
}
