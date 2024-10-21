const units = ["B", "KiB", "MiB", "GiB", "TiB"];

export function bytesToHuman(bytes: number): string {
  if (bytes === 0) return '0 B';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = (bytes / Math.pow(1024, i)).toFixed(2);

  return `${size} ${units[i]}`;
}
