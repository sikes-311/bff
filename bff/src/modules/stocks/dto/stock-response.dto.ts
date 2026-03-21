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

export type PopularStocksResponseDto = StockRateDto[];
