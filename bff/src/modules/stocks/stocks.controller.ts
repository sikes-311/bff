import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetPopularStocksUsecase } from './usecase/get-popular-stocks.usecase';
import { StockRateDto } from './dto/stock-response.dto';
import { GetStockChartUsecase } from './usecase/get-stock-chart.usecase';
import { StockChartResponseDto } from './dto/stock-chart-response.dto';

@ApiTags('stocks')
@ApiBearerAuth()
@Controller('stocks')
@UseGuards(JwtAuthGuard)
export class StocksController {
  constructor(
    private readonly getPopularStocksUsecase: GetPopularStocksUsecase,
    private readonly getStockChartUsecase: GetStockChartUsecase,
  ) {}

  @Get('popular')
  @ApiOperation({ summary: '人気上位5銘柄の株価レート一覧取得' })
  @ApiResponse({ status: 200, type: [StockRateDto] })
  async getPopularStocks(): Promise<StockRateDto[]> {
    return this.getPopularStocksUsecase.execute();
  }

  @Get(':name/chart')
  @ApiOperation({ summary: '銘柄の株価チャートデータ取得' })
  @ApiParam({ name: 'name', description: '銘柄名' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['6m', '1y', '2y', '10y'],
    description: '表示期間（デフォルト: 6m）',
  })
  @ApiResponse({ status: 200, type: StockChartResponseDto })
  async getStockChart(
    @Param('name') name: string,
    @Query('period') period: string = '6m',
  ): Promise<StockChartResponseDto> {
    return this.getStockChartUsecase.execute(name, period);
  }
}
