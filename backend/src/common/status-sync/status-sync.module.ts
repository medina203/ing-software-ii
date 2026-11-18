import { Module } from '@nestjs/common';
import { StatusSyncService } from './status-sync.service';

@Module({
  providers: [StatusSyncService],
  exports: [StatusSyncService],
})
export class StatusSyncModule {}
