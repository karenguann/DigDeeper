export function formatSeconds(seconds: number) {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  return `${seconds} seconds`;
}
