export function isDiffAddition(line: string) {
  return line.startsWith("+") && !line.startsWith("+++");
}

export function isDiffDeletion(line: string) {
  return line.startsWith("-") && !line.startsWith("---");
}
