export function getInitials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) {
    return "?";
  }

  return words.map((word) => word[0]?.toUpperCase() || "").join("");
}

export function hexToRgba(hexColor, alpha = 1) {
  const normalizedColor = String(hexColor || "")
    .trim()
    .replace(/^#/, "");

  const expandedColor =
    normalizedColor.length === 3
      ? normalizedColor
          .split("")
          .map((character) => `${character}${character}`)
          .join("")
      : normalizedColor;

  if (expandedColor.length !== 6) {
    return `rgba(148, 163, 184, ${alpha})`;
  }

  const red = Number.parseInt(expandedColor.slice(0, 2), 16);
  const green = Number.parseInt(expandedColor.slice(2, 4), 16);
  const blue = Number.parseInt(expandedColor.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}