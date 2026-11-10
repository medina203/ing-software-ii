import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ClientsModule } from './clients/clients.module';
import { ItemsModule } from './items/items.module';
import { PrismaModule } from './prisma/prisma.module';
import { RentalsModule } from './rentals/rentals.module';
import { ReportsModule } from './reports/reports.module';
import { ReturnsModule } from './returns/returns.module';
import { UsersModule } from './users/users.module';

// Archivo de barril opcional para pruebas o imports externos.
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    CategoriesModule,
    ItemsModule,
    RentalsModule,
    ReturnsModule,
    ReportsModule,
  ],
})
export class ModulesModule {}
