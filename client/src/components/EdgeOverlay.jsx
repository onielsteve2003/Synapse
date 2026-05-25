function getCurveGeometry(start, end) {
  const curveStrength = Math.max(120, Math.abs(end.x - start.x) * 0.45);
  const controlStart = {
    x: start.x + curveStrength,
    y: start.y,
  };
  const controlEnd = {
    x: end.x - curveStrength,
    y: end.y,
  };

  return {
    controlEnd,
    controlStart,
    d: [
      `M ${start.x} ${start.y}`,
      `C ${controlStart.x} ${controlStart.y}, ${controlEnd.x} ${controlEnd.y}, ${end.x} ${end.y}`,
    ].join(" "),
  };
}

function getBezierPoint(start, controlStart, controlEnd, end, t) {
  const inverse = 1 - t;

  return {
    x:
      inverse ** 3 * start.x +
      3 * inverse ** 2 * t * controlStart.x +
      3 * inverse * t ** 2 * controlEnd.x +
      t ** 3 * end.x,
    y:
      inverse ** 3 * start.y +
      3 * inverse ** 2 * t * controlStart.y +
      3 * inverse * t ** 2 * controlEnd.y +
      t ** 3 * end.y,
  };
}

export default function EdgeOverlay({
  anchors,
  edges,
  onDeleteEdge,
  onSelectEdge,
  previewConnection,
  selectedEdgeId,
}) {

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full">
      {edges.map((edge) => {
        const sourcePoint = anchors[edge.source]?.source;
        const targetPoint = anchors[edge.target]?.target;

        if (!sourcePoint || !targetPoint) {
          return null;
        }

        const geometry = getCurveGeometry(sourcePoint, targetPoint);
        const midpoint = getBezierPoint(
          sourcePoint,
          geometry.controlStart,
          geometry.controlEnd,
          targetPoint,
          0.5,
        );
        const isSelected = selectedEdgeId === edge.id;

        return (
          <g key={edge.id} className="pointer-events-auto">
            <path
              className="cursor-pointer"
              d={geometry.d}
              fill="none"
              onClick={(event) => {
                event.stopPropagation();
                onSelectEdge(edge.id);
              }}
              stroke="transparent"
              strokeLinecap="round"
              strokeWidth="18"
            />
            <path
              d={geometry.d}
              fill="none"
              stroke={isSelected ? "rgba(251, 113, 133, 0.95)" : "rgba(103, 232, 249, 0.48)"}
              strokeLinecap="round"
              strokeWidth={isSelected ? "4" : "3"}
            />
            <circle
              cx={sourcePoint.x}
              cy={sourcePoint.y}
              fill={isSelected ? "rgba(251, 146, 180, 0.95)" : "rgba(103, 232, 249, 0.9)"}
              r="4"
            />
            <circle
              cx={targetPoint.x}
              cy={targetPoint.y}
              fill={isSelected ? "rgba(251, 146, 180, 0.95)" : "rgba(103, 232, 249, 0.9)"}
              r="4"
            />

            {isSelected ? (
              <g
                className="cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteEdge(edge.id);
                }}
              >
                <circle
                  cx={midpoint.x}
                  cy={midpoint.y}
                  fill="rgba(15, 23, 42, 0.96)"
                  r="13"
                  stroke="rgba(251, 113, 133, 0.85)"
                  strokeWidth="1.5"
                />
                <path
                  d={`M ${midpoint.x - 4} ${midpoint.y - 4} L ${midpoint.x + 4} ${midpoint.y + 4} M ${midpoint.x + 4} ${midpoint.y - 4} L ${midpoint.x - 4} ${midpoint.y + 4}`}
                  stroke="rgba(251, 113, 133, 0.98)"
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </g>
            ) : null}
          </g>
        );
      })}

      {previewConnection ? (
        <g>
          {(() => {
            const geometry = getCurveGeometry(previewConnection.source, previewConnection.target);

            return (
              <path
                d={geometry.d}
                fill="none"
                stroke="rgba(165, 243, 252, 0.72)"
                strokeDasharray="10 8"
                strokeLinecap="round"
                strokeWidth="3"
              />
            );
          })()}
          <path
            d={getCurveGeometry(previewConnection.source, previewConnection.target).d}
            fill="none"
            opacity="0"
          />
          <circle
            cx={previewConnection.source.x}
            cy={previewConnection.source.y}
            fill="rgba(165, 243, 252, 0.95)"
            r="5"
          />
          <circle
            cx={previewConnection.target.x}
            cy={previewConnection.target.y}
            fill="rgba(165, 243, 252, 0.85)"
            r="5"
          />
        </g>
      ) : null}
    </svg>
  );
}

