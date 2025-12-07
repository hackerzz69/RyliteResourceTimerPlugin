export default function createPie(settings: any, time: number, onEndCallback: Function): SVGElement {
        const radius = Number(settings.radius?.value);
        const strokeWidth = radius / Number(settings.borderRatio?.value);

        const borderRadius = radius - strokeWidth / 2;
        const wedgeRadius  = borderRadius - strokeWidth / 2;

        const diameter = (radius * 2);
        const cx = diameter / 2;
        const cy = diameter / 2;

        const pie = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        pie.setAttribute("width", diameter.toString());
        pie.setAttribute("height", diameter.toString());
        pie.style.position = "absolute";
        pie.style.pointerEvents = "none";
        pie.style.opacity = settings.opacity.value?.toString();

        const border = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        border.setAttribute("cx", cx.toString());
        border.setAttribute("cy", cy.toString());
        border.setAttribute("r", borderRadius.toString());
        border.setAttribute("fill", "transparent");
        border.setAttribute("stroke", settings.borderColor.value?.toString());
        border.setAttribute("stroke-width", strokeWidth.toString());
        pie.appendChild(border);

        const wedge = document.createElementNS("http://www.w3.org/2000/svg", "path");
        wedge.setAttribute("fill", settings.fillColor.value?.toString());
        pie.appendChild(wedge);

        const start = performance.now();

        const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / time, 1);

            const angle = -progress * 2 * Math.PI;
            const x = cx + wedgeRadius * Math.sin(angle);
            const y = cy - wedgeRadius * Math.cos(angle);
            const largeArc = progress > 0.5 ? 1 : 0;

            // Start from inner top point (noon), expand anti-clockwise
            const d = `M${cx},${cy} L${cx},${cy - wedgeRadius} A${wedgeRadius},${wedgeRadius} 0 ${largeArc} 0 ${x},${y} Z`;
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