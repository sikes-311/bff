import { ApiProperty } from '@nestjs/swagger';

export class StockRateDto {
  @ApiProperty({ description: '銘柄名' })
  name!: string;

  @ApiProperty({ description: '100株あたり円建て株価' })
  priceJpy!: number;

  @ApiProperty({ description: '100株あたりドル建て株価' })
  priceUsd!: number;

  @ApiProperty({ description: '前日比(%)' })
  changePercent!: number;
}

class MetaDto {
  @ApiProperty({ description: 'レスポンス生成日時 (ISO 8601)' })
  timestamp!: string;
}

export class PopularStocksResponseDto {
  @ApiProperty({ description: '株価レート一覧', type: [StockRateDto] })
  data!: StockRateDto[];

  @ApiProperty({ description: 'メタ情報', type: MetaDto })
  meta!: MetaDto;
}
