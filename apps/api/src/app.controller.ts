import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('rag')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('query')
  async askQuestion(
    @Body('tenantId') tenantId: string, 
    @Body('queryText') queryText: string
  ) {
    if (!tenantId || !queryText) {
      return { error: 'tenantId and queryText are required.' };
    }
    return this.appService.handleStudentQuery(tenantId, queryText);
  }
}