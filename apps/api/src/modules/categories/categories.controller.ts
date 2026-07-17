import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type {
  Category as CategoryDto,
  CategoryNode,
  FlowType,
} from '@financehub/shared-types';

/** Runtime enum for validating the optional `type` query parameter. */
enum FlowTypeParam {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List categories (flat or as a tree)' })
  @ApiQuery({ name: 'type', required: false, enum: ['INCOME', 'EXPENSE'] })
  @ApiQuery({ name: 'tree', required: false, type: Boolean })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type', new ParseEnumPipe(FlowTypeParam, { optional: true }))
    type?: FlowType,
    @Query('tree') tree?: string,
  ): Promise<CategoryDto[] | CategoryNode[]> {
    if (tree === 'true') {
      return this.categories.buildTree(user.userId, { type });
    }
    return this.categories.list(user.userId, { type });
  }

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categories.create(user.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one category by id' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryDto> {
    return this.categories.get(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categories.update(user.userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a category' })
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryDto> {
    return this.categories.archive(user.userId, id);
  }
}
