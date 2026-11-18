import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Global()
@Module({
  providers: [{ provide: MailService, useFactory: () => new MailService(process.env) }],
  exports: [MailService],
})
export class MailModule {}
