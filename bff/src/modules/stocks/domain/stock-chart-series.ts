import { StockChartPoint } from './stock-chart-point';

export class StockChartSeries {
  static merge(pointsA: StockChartPoint[], pointsB: StockChartPoint[]): StockChartPoint[] {
    const mapB = new Map(pointsB.map((p) => [p.date, p]));
    const result: StockChartPoint[] = [];

    for (const pointA of pointsA) {
      const pointB = mapB.get(pointA.date);
      result.push(pointB ? StockChartPoint.average(pointA, pointB) : pointA);
      if (pointB) mapB.delete(pointA.date);
    }
    for (const pointB of mapB.values()) {
      result.push(pointB);
    }
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }
}
