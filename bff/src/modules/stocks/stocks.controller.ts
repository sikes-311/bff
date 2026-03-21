import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetPopularStocksUsecase } from './usecase/get-popular-stocks.usecase';
import { PopularStocksResponseDto } from './dto/stock-response.dto';

@ApiTags('stocks')
@ApiBearerAuth()
@Controller('stocks')
@UseGuards(JwtAuthGuard)
export class StocksController {
  constructor(
    private readonly getPopularStocksUsecase: GetPopularStocksUsecase,
  ) {}

  @Get('popular')
  @ApiOperation({ summary: '人気上位5銘柄の株価レート一覧取得' })
  @ApiResponse({ status: 200, type: PopularStocksResponseDto })
  async getPopularStocks(): Promise<PopularStocksResponseDto> {
    return this.getPopularStocksUsecase.execute();
  }
}
