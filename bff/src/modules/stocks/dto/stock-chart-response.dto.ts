import { ApiProperty } from '@nestjs/swagger';

export class StockChartItemDto {
  @ApiProperty({ description: '日付 (YYYY-MM-DD)' })
  date!: string;

  @ApiProperty({ description: '円建て株価' })
  priceJpy!: number;
}

export class StockChartResponseDto {
  @ApiProperty({ description: '銘柄名' })
  name!: string;

  @ApiProperty({ description: '表示期間' })
  period!: string;

  @ApiProperty({
    description: 'チャートデータポイント',
    type: [StockChartItemDto],
  })
  items!: StockChartItemDto[];
}
