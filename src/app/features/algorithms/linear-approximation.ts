export default function lineApprox(vec: { x: number, y: number }[]) {
  const n = vec.length;

  if (n === 0) {
    return {
      a: 0, b: 0, ua: 0, ub: 0, n
    }
  }

  const sumX = vec.reduce((acc, curr) => acc + curr.x, 0);
  const sumY = vec.reduce((acc, curr) => acc + curr.y, 0);
  const sumXY = vec.reduce((acc, curr) => acc + curr.x * curr.y, 0);
  const sumXSq = vec.reduce((acc, curr) => acc + curr.x ** 2, 0);
  const sumYSq = vec.reduce((acc, curr) => acc + curr.y ** 2, 0);

  const upperA = sumX * sumY - n * sumXY;
  const upperB = sumX * sumXY - sumY * sumXSq;
  const bottom = sumX ** 2 - n * sumXSq;

  const a = upperA / bottom;
  let b = upperB / bottom;

  // Stosuję tutaj Object.is tylko po to, żeby zasrany warning dał mi spokój
  if (Object.is(b, -0)) {
    b = 0; // fuckin -0
  }

  const sumDSq = sumYSq - a * sumXY - b * sumY;
  const firstSqrt = Math.sqrt(1 / (n - 2) * sumDSq);
  const uBottom = n * sumXSq - sumX ** 2;

  const ua = firstSqrt * Math.sqrt(n / uBottom);
  const ub = firstSqrt * Math.sqrt(sumXSq / uBottom);

  return { a, b, ua, ub, sumX, sumY, sumXY, sumXSq, sumYSq, sumDSq, upperA, upperB, bottom, firstSqrt, uBottom, n };
}
