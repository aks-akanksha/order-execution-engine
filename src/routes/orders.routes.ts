import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { orderRequestSchema } from '../validators/order.validator';
import { OrderType, OrderStatus } from '../types/order';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export async function ordersRoutes(fastify: FastifyInstance) {
  const orderModel = fastify.orderModel;
  const queueService = fastify.queueService;

  // POST /api/orders/execute - Creates order and returns orderId
  // Client should then connect to WebSocket endpoint for status updates
  fastify.post('/api/orders/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body
      const validationResult = orderRequestSchema.safeParse(request.body);
      if (!validationResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
      }

      const orderRequest = validationResult.data;

      // Only support market orders for now
      if (orderRequest.type !== OrderType.MARKET) {
        return reply.status(400).send({
          error: 'Only market orders are currently supported',
        });
      }

      // Generate order ID
      const orderId = uuidv4();

      // Create order in database with PENDING status
      await orderModel.create({
        id: orderId,
        type: orderRequest.type,
        tokenIn: orderRequest.tokenIn,
        tokenOut: orderRequest.tokenOut,
        amountIn: orderRequest.amountIn,
        slippageTolerance: orderRequest.slippageTolerance || 1,
        status: OrderStatus.PENDING,
      });

      // Add status history
      await orderModel.addStatusHistory(orderId, OrderStatus.PENDING, 'Order created');

      // Add to queue (processing will start immediately)
      // Note: Status callbacks are registered when WebSocket connects
      await queueService.addOrder(orderId, orderRequest);

      // Return orderId and WebSocket endpoint
      return reply.send({
        orderId,
        status: 'pending',
        wsEndpoint: `/api/orders/${orderId}/status`,
        message: 'Order queued for processing. Connect to WebSocket endpoint for live updates.',
      });
    } catch (error) {
      logger.error('Error creating order', { error });
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // WebSocket endpoint for order status updates
  fastify.get('/api/orders/:orderId/status', { websocket: true }, (connection, req) => {
    const orderId = (req.params as { orderId: string }).orderId;
    const orderProcessor = fastify.orderProcessor;

    if (!orderId) {
      connection.socket.close(1008, 'Order ID required');
      return;
    }

    logger.info(`WebSocket connection established for order ${orderId}`, { orderId });

    // Status update callback
    const statusCallback = (update: { orderId: string; status: string; message?: string; data?: Record<string, unknown> }) => {
      try {
        if (connection.socket.readyState === 1) {
          // WebSocket.OPEN
          connection.socket.send(JSON.stringify(update));
        }
      } catch (error: unknown) {
        logger.error(`Error sending status update for order ${orderId}`, { orderId, error });
      }
    };

    // Register callback for status updates
    if (orderProcessor) {
      orderProcessor.registerStatusCallback(orderId, statusCallback);
    }

    // Send initial status
    orderModel
      .findById(orderId)
      .then(async (order) => {
        if (order) {
          connection.socket.send(
            JSON.stringify({
              orderId: order.id,
              status: order.status,
              message: `Current status: ${order.status}`,
            })
          );

          // If order is still pending and not in queue, add it
          if (order.status === OrderStatus.PENDING) {
            const orderRequest = {
              type: order.type,
              tokenIn: order.tokenIn,
              tokenOut: order.tokenOut,
              amountIn: order.amountIn,
              slippageTolerance: order.slippageTolerance,
            };
            // Re-add to queue if not already processing
            // Callback is already registered above
            try {
              await queueService.addOrder(orderId, orderRequest);
            } catch (error) {
              // Order might already be in queue, that's fine
              logger.debug(`Order ${orderId} may already be in queue`, { orderId, error });
            }
          }
        } else {
          connection.socket.send(
            JSON.stringify({
              orderId,
              status: 'not_found',
              message: 'Order not found',
            })
          );
        }
      })
      .catch((error: unknown) => {
        logger.error(`Error fetching initial status for order ${orderId}`, { orderId, error });
      });

    // Handle connection close
    connection.socket.on('close', () => {
      logger.info(`WebSocket connection closed for order ${orderId}`, { orderId });
      if (orderProcessor) {
        orderProcessor.unregisterStatusCallback(orderId);
      }
    });

    // Handle errors
    connection.socket.on('error', (error: unknown) => {
      logger.error(`WebSocket error for order ${orderId}`, { orderId, error });
      if (orderProcessor) {
        orderProcessor.unregisterStatusCallback(orderId);
      }
    });
  });

  // GET /api/orders/:orderId - Get order details
  fastify.get('/api/orders/:orderId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const orderId = (request.params as { orderId: string }).orderId;
      const order = await orderModel.findById(orderId);

      if (!order) {
        return reply.status(404).send({ error: 'Order not found' });
      }

      return reply.send(order);
    } catch (error) {
      const orderId = (request.params as { orderId: string }).orderId;
      logger.error('Error fetching order', { orderId, error });
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/orders - List orders (with pagination)
  fastify.get('/api/orders', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Simple implementation - in production, add pagination
      const query = 'SELECT *, created_at as "createdAt", updated_at as "updatedAt" FROM orders ORDER BY created_at DESC LIMIT 100';
      const result = await (orderModel as any).pool.query(query);
      return reply.send(result.rows);
    } catch (error: unknown) {
      logger.error('Error fetching orders', { error });
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /api/queue/stats - Get queue statistics
  fastify.get('/api/queue/stats', async (_request, reply: FastifyReply) => {
    try {
      const stats = await queueService.getQueueStats();
      return reply.send(stats);
    } catch (error) {
      logger.error('Error fetching queue stats', { error });
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}

