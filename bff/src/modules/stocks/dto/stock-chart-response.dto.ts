import { ApiProperty } from '@nestjs/swagger';

class StockChartItemDto {
  @ApiProperty({ description: '日付 (YYYY-MM-DD)' })
  date!: string;

  @ApiProperty({ description: '円建て株価' })
  priceJpy!: number;
}

class StockChartDataDto {
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

class MetaDto {
  @ApiProperty({ description: 'レスポンス生成日時 (ISO 8601)' })
  timestamp!: string;
}

export class StockChartResponseDto {
  @ApiProperty({ description: 'チャートデータ', type: StockChartDataDto })
  data!: StockChartDataDto;

  @ApiProperty({ description: 'メタ情報', type: MetaDto })
  meta!: MetaDto;
}
