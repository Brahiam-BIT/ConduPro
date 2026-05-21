import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { NotificationsService } from '../notifications.service';

@Injectable()
export class ScheduleReminderCron {
  private readonly logger = new Logger(ScheduleReminderCron.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /** Todos los días a las 8:00 AM — recordatorio de clases CONFIRMED del día siguiente. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleDailyReminders(): Promise<void> {
    this.logger.log('Ejecutando cron de recordatorios de clases...');

    try {
      const count = await this.notificationsService.sendTomorrowReminders();
      this.logger.log(`Recordatorios enviados para ${count} clase(s)`);
    } catch (error) {
      this.logger.error('Error en cron de recordatorios', error);
    }
  }
}
