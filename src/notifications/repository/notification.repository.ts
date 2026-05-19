import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from '../entity/notification.entity';

export interface NotificationFilterParams {
  userId: string;
  unreadOnly?: boolean;
  page: number;
  limit: number;
}

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repository: Repository<Notification>,
  ) {}

  create(data: Partial<Notification>): Notification {
    return this.repository.create(data);
  }

  async save(notification: Notification): Promise<Notification> {
    return this.repository.save(notification);
  }

  async findByUser(params: NotificationFilterParams): Promise<[Notification[], number]> {
    const qb = this.repository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId: params.userId });

    if (params.unreadOnly) {
      qb.andWhere('notification.is_read = false');
    }

    qb.orderBy('notification.created_at', 'DESC')
      .skip((params.page - 1) * params.limit)
      .take(params.limit);

    return qb.getManyAndCount();
  }

  async findByIdAndUser(id: string, userId: string): Promise<Notification | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.repository.update({ id, userId }, { isRead: true });
  }
}
