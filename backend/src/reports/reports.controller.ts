import { Controller, Get, Query } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RevenueDailyQueryDto } from './dto/revenue-daily-query.dto';
import { RevenueMonthlyQueryDto } from './dto/revenue-monthly-query.dto';
import { TopItemsQueryDto } from './dto/top-items-query.dto';
import { ReportsService } from './reports.service';

@Roles(Rol.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.reportsService.getDashboard();
  }

  @Get('inventory-summary')
  getInventorySummary() {
    return this.reportsService.getInventorySummary();
  }

  @Get('top-items')
  getTopItems(@Query() query: TopItemsQueryDto) {
    return this.reportsService.getTopItems(query);
  }

  @Get('active-rentals')
  getActiveRentals() {
    return this.reportsService.getActiveRentals();
  }

  @Get('revenue/daily')
  getDailyRevenue(@Query() query: RevenueDailyQueryDto) {
    return this.reportsService.getDailyRevenue(query);
  }

  @Get('revenue/monthly')
  getMonthlyRevenue(@Query() query: RevenueMonthlyQueryDto) {
    return this.reportsService.getMonthlyRevenue(query);
  }
}
