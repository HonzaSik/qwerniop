/** On-screen keyboards report an empty or "Unidentified" code; only a hardware key has a real one. */
export function isPhysicalCode(code: string): boolean {
  return code !== "" && code !== "Unidentified";
}
