import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ClientsModule } from './clients/clients.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { StatusSyncModule } from './common/status-sync/status-sync.module';
import { SettingsModule } from './settings/settings.module';
import { UploadsModule } from './uploads/uploads.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ItemsModule } from './items/items.module';
import { PrismaModule } from './prisma/prisma.module';
import { RentalsModule } from './rentals/rentals.module';
import { ReportsModule } from './reports/reports.module';
import { ReturnsModule } from './returns/returns.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    StatusSyncModule,
    UploadsModule,
    SettingsModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    CategoriesModule,
    ItemsModule,
    RentalsModule,
    ReturnsModule,
    InvoicesModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
