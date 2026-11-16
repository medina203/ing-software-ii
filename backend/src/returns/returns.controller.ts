import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsQueryDto } from './dto/list-returns-query.dto';
import { ReturnsService } from './returns.service';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get('pending')
  findPending() {
    return this.returnsService.findPending();
  }

  @Get()
  findAll(@Query() query: ListReturnsQueryDto) {
    return this.returnsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.returnsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateReturnDto, @CurrentUser() user: AuthenticatedUser) {
    return this.returnsService.create(dto, user.id);
  }
}
