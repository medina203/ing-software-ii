import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Rol } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateItemBatchDto } from './dto/create-item-batch.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { ItemGroupKeyDto, UpdateItemGroupDto } from './dto/item-group.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemsService } from './items.service';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  findAll(@Query() query: ListItemsQueryDto) {
    return this.itemsService.findAll(query);
  }

  /** Inventario agrupado por tipo con stock por estado. */
  @Get('groups')
  findGroups(@Query() query: ListItemsQueryDto) {
    return this.itemsService.findGroups(query);
  }

  @Roles(Rol.ADMIN)
  @Patch('group')
  updateGroup(@Body() dto: UpdateItemGroupDto) {
    return this.itemsService.updateGroup(dto);
  }

  @Roles(Rol.ADMIN)
  @Delete('group')
  removeGroup(@Query() dto: ItemGroupKeyDto) {
    return this.itemsService.removeGroup(dto);
  }

  @Get('available')
  findAvailable() {
    return this.itemsService.findAvailable();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.findOne(id);
  }

  @Roles(Rol.ADMIN)
  @Post()
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  @Roles(Rol.ADMIN)
  @Post('batch')
  createBatch(@Body() dto: CreateItemBatchDto) {
    return this.itemsService.createBatch(dto);
  }

  @Roles(Rol.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateItemDto) {
    return this.itemsService.update(id, dto);
  }

  @Roles(Rol.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.remove(id);
  }
}
