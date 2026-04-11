export function maskName(name) {
  if (!name || name.length === 0) return "****";
  if (name.length <= 2) return name[0] + " _";

  const middle = "_ ".repeat(name.length - 2);
  return `${name[0]} ${middle}${name[name.length - 1]}`;
}
