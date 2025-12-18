import { OrderModel } from '../models/order.model';
import { QueueService } from '../services/queue.service';
import { OrderProcessor } from '../services/order.processor';

declare module 'fastify' {
  interface FastifyInstance {
    orderModel: OrderModel;
    queueService: QueueService;
    orderProcessor: OrderProcessor;
  }
}

