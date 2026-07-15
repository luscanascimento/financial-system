import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  CashFlowPoint,
  CategoryBreakdownItem,
  FinancialOverview,
  NetWorthSummary,
} from '@financehub/shared-types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CashFlowQueryDto } from './dto/cash-flow-query.dto';
import { CategoryBreakdownQueryDto } from './dto/category-breakdown-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Headline financial KPIs for the dashboard' })
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FinancialOverview> {
    return this.reports.getOverview(user.userId);
  }

  @Get('net-worth')
  @ApiOperation({ summary: 'Net-worth snapshot grouped by currency' })
  getNetWorth(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NetWorthSummary[]> {
    return this.reports.getNetWorth(user.userId);
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Income vs. expense over trailing months' })
  getCashFlow(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CashFlowQueryDto,
  ): Promise<CashFlowPoint[]> {
    return this.reports.getCashFlow(user.userId, query.months);
  }

  @Get('category-breakdown')
  @ApiOperation({ summary: 'Spend or income grouped by category' })
  getCategoryBreakdown(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CategoryBreakdownQueryDto,
  ): Promise<CategoryBreakdownItem[]> {
    return this.reports.getCategoryBreakdown(user.userId, query);
  }
}
