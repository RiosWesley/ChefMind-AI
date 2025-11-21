import { TicketService } from './ticket-service';
import { OrderService } from './order-service';
import { MenuService } from './menu-service';
import { RestaurantService } from './restaurant-service';
import { Tool, ToolExecution, ToolResult } from '../types/tool';
import { OrderStatus, DeliveryType } from '../types/order';

export class ToolService {
  private ticketService: TicketService;
  private orderService: OrderService;
  private menuService: MenuService;
  private restaurantService: RestaurantService;

  constructor(
    ticketService: TicketService,
    orderService: OrderService,
    menuService: MenuService,
    restaurantService: RestaurantService
  ) {
    this.ticketService = ticketService;
    this.orderService = orderService;
    this.menuService = menuService;
    this.restaurantService = restaurantService;
  }

  getAvailableTools(): Tool[] {
    return [
      {
        name: 'close_ticket',
        description: 'Fecha um ticket específico. Use quando o atendimento for concluído ou quando o usuário não responder mais.',
        parameters: {
          type: 'object',
          properties: {
            ticketId: {
              type: 'string',
              description: 'O ID do ticket que deve ser fechado',
            },
          },
          required: ['ticketId'],
        },
      },
      {
        name: 'create_order',
        description: 'Cria um novo pedido com itens do cardápio. Valida disponibilidade dos itens e horário de funcionamento.',
        parameters: {
          type: 'object',
          properties: {
            ticketId: {
              type: 'string',
              description: 'O ID do ticket associado ao pedido',
            },
            items: {
              type: 'array',
              description: 'Lista de itens do pedido',
              items: {
                type: 'object',
                properties: {
                  menuItemId: { type: 'string', description: 'ID do item do cardápio' },
                  quantity: { type: 'number', description: 'Quantidade do item' },
                  notes: { type: 'string', description: 'Observações sobre o item (opcional)' },
                },
                required: ['menuItemId', 'quantity'],
              },
            },
            deliveryType: {
              type: 'string',
              enum: ['delivery', 'pickup'],
              description: 'Tipo de entrega: delivery ou pickup',
            },
            deliveryAddress: {
              type: 'string',
              description: 'Endereço de entrega (obrigatório para delivery)',
            },
          },
          required: ['ticketId', 'items', 'deliveryType'],
        },
      },
      {
        name: 'get_order',
        description: 'Consulta o status e detalhes completos de um pedido, incluindo itens e valores.',
        parameters: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'O ID do pedido a ser consultado',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'update_order',
        description: 'Atualiza um pedido existente: adiciona, remove ou modifica itens. Só pode ser usado em pedidos pendentes ou confirmados.',
        parameters: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'O ID do pedido a ser atualizado',
            },
            itemsToAdd: {
              type: 'array',
              description: 'Itens a serem adicionados ao pedido',
              items: {
                type: 'object',
                properties: {
                  menuItemId: { type: 'string' },
                  quantity: { type: 'number' },
                  notes: { type: 'string' },
                },
                required: ['menuItemId', 'quantity'],
              },
            },
            itemsToRemove: {
              type: 'array',
              description: 'IDs dos itens do pedido a serem removidos',
              items: { type: 'string' },
            },
            itemsToUpdate: {
              type: 'array',
              description: 'Itens do pedido a serem atualizados (quantidade)',
              items: {
                type: 'object',
                properties: {
                  orderItemId: { type: 'string' },
                  quantity: { type: 'number' },
                },
                required: ['orderItemId', 'quantity'],
              },
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'cancel_order',
        description: 'Cancela um pedido. Só pode cancelar pedidos que ainda não foram entregues.',
        parameters: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'O ID do pedido a ser cancelado',
            },
            reason: {
              type: 'string',
              description: 'Motivo do cancelamento (opcional)',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'list_orders',
        description: 'Lista os pedidos de um cliente associados a um ticket. Pode filtrar por status.',
        parameters: {
          type: 'object',
          properties: {
            ticketId: {
              type: 'string',
              description: 'O ID do ticket para listar pedidos',
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
              description: 'Filtrar pedidos por status (opcional)',
            },
            limit: {
              type: 'number',
              description: 'Número máximo de pedidos a retornar (padrão: 10)',
            },
          },
          required: ['ticketId'],
        },
      },
      {
        name: 'get_menu',
        description: 'Busca o cardápio completo ou filtrado por categoria. Retorna itens disponíveis agrupados.',
        parameters: {
          type: 'object',
          properties: {
            categoryId: {
              type: 'string',
              description: 'ID da categoria para filtrar (opcional, retorna tudo se não informado)',
            },
          },
        },
      },
      {
        name: 'search_menu_item',
        description: 'Busca itens específicos no cardápio por nome ou descrição. Pode filtrar por categoria.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Termo de busca (nome ou descrição do item)',
            },
            categoryId: {
              type: 'string',
              description: 'ID da categoria para filtrar (opcional)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_menu_item_details',
        description: 'Obtém detalhes completos de um item do cardápio: preço, ingredientes, alergênicos, disponibilidade, imagem.',
        parameters: {
          type: 'object',
          properties: {
            menuItemId: {
              type: 'string',
              description: 'O ID do item do cardápio',
            },
          },
          required: ['menuItemId'],
        },
      },
      {
        name: 'get_restaurant_hours',
        description: 'Consulta os horários de funcionamento do restaurante e verifica se está aberto no momento.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_delivery_info',
        description: 'Obtém informações sobre entrega: área de cobertura, taxa de entrega, valor mínimo, tempo estimado. Valida se endereço está na área.',
        parameters: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              description: 'Endereço para verificar se está na área de entrega (opcional)',
            },
          },
        },
      },
      {
        name: 'get_promotions',
        description: 'Lista todas as promoções ativas no momento, com descrição, desconto e validade.',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async executeTool(execution: ToolExecution): Promise<ToolResult> {
    try {
      switch (execution.tool) {
        case 'close_ticket':
          return await this.executeCloseTicket(execution.parameters);
        case 'create_order':
          return await this.executeCreateOrder(execution.parameters);
        case 'get_order':
          return await this.executeGetOrder(execution.parameters);
        case 'update_order':
          return await this.executeUpdateOrder(execution.parameters);
        case 'cancel_order':
          return await this.executeCancelOrder(execution.parameters);
        case 'list_orders':
          return await this.executeListOrders(execution.parameters);
        case 'get_menu':
          return await this.executeGetMenu(execution.parameters);
        case 'search_menu_item':
          return await this.executeSearchMenuItem(execution.parameters);
        case 'get_menu_item_details':
          return await this.executeGetMenuItemDetails(execution.parameters);
        case 'get_restaurant_hours':
          return await this.executeGetRestaurantHours(execution.parameters);
        case 'get_delivery_info':
          return await this.executeGetDeliveryInfo(execution.parameters);
        case 'get_promotions':
          return await this.executeGetPromotions(execution.parameters);
        
        default:
          return {
            success: false,
            error: `Tool '${execution.tool}' not found`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async executeCloseTicket(parameters: Record<string, unknown>): Promise<ToolResult> {
    const ticketId = parameters.ticketId;

    if (!ticketId || typeof ticketId !== 'string') {
      return {
        success: false,
        error: 'ticketId is required and must be a string',
      };
    }

    const closed = await this.ticketService.closeTicket(ticketId);

    if (!closed) {
      return {
        success: false,
        error: `Ticket with id '${ticketId}' not found`,
      };
    }

    return {
      success: true,
      result: {
        message: `Ticket ${ticketId} closed successfully`,
        ticketId,
      },
    };
  }

  private async executeCreateOrder(parameters: Record<string, unknown>): Promise<ToolResult> {
    const ticketId = parameters.ticketId;
    const items = parameters.items;
    const deliveryType = parameters.deliveryType;
    const deliveryAddress = parameters.deliveryAddress;

    if (!ticketId || typeof ticketId !== 'string') {
      return {
        success: false,
        error: 'ticketId is required and must be a string',
      };
    }

    if (!Array.isArray(items) || items.length === 0) {
      return {
        success: false,
        error: 'items is required and must be a non-empty array',
      };
    }

    if (!deliveryType || typeof deliveryType !== 'string' || !['delivery', 'pickup'].includes(deliveryType)) {
      return {
        success: false,
        error: 'deliveryType is required and must be "delivery" or "pickup"',
      };
    }

    if (deliveryType === 'delivery' && (!deliveryAddress || typeof deliveryAddress !== 'string')) {
      return {
        success: false,
        error: 'deliveryAddress is required when deliveryType is "delivery"',
      };
    }

    try {
      const order = await this.orderService.createOrder({
        ticketId,
        items: items as Array<{ menuItemId: string; quantity: number; notes?: string }>,
        deliveryType: deliveryType as DeliveryType,
        deliveryAddress: deliveryAddress as string | undefined,
      });

      return {
        success: true,
        result: {
          orderId: order.id,
          status: order.status,
          total: order.total,
          estimatedTimeMinutes: order.estimatedTimeMinutes,
          message: 'Order created successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async executeGetOrder(parameters: Record<string, unknown>): Promise<ToolResult> {
    const orderId = parameters.orderId;

    if (!orderId || typeof orderId !== 'string') {
      return {
        success: false,
        error: 'orderId is required and must be a string',
      };
    }

    const order = await this.orderService.getOrder(orderId);

    if (!order) {
      return {
        success: false,
        error: `Order with id '${orderId}' not found`,
      };
    }

    return {
      success: true,
      result: order,
    };
  }

  private async executeUpdateOrder(parameters: Record<string, unknown>): Promise<ToolResult> {
    const orderId = parameters.orderId;
    const itemsToAdd = parameters.itemsToAdd;
    const itemsToRemove = parameters.itemsToRemove;
    const itemsToUpdate = parameters.itemsToUpdate;

    if (!orderId || typeof orderId !== 'string') {
      return {
        success: false,
        error: 'orderId is required and must be a string',
      };
    }

    if (!itemsToAdd && !itemsToRemove && !itemsToUpdate) {
      return {
        success: false,
        error: 'At least one of itemsToAdd, itemsToRemove, or itemsToUpdate must be provided',
      };
    }

    try {
      const order = await this.orderService.updateOrder(orderId, {
        itemsToAdd: itemsToAdd as Array<{ menuItemId: string; quantity: number; notes?: string }> | undefined,
        itemsToRemove: itemsToRemove as string[] | undefined,
        itemsToUpdate: itemsToUpdate as Array<{ orderItemId: string; quantity: number }> | undefined,
      });

      return {
        success: true,
        result: {
          orderId: order.id,
          status: order.status,
          total: order.total,
          message: 'Order updated successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async executeCancelOrder(parameters: Record<string, unknown>): Promise<ToolResult> {
    const orderId = parameters.orderId;
    const reason = parameters.reason;

    if (!orderId || typeof orderId !== 'string') {
      return {
        success: false,
        error: 'orderId is required and must be a string',
      };
    }

    try {
      const order = await this.orderService.cancelOrder(orderId, reason as string | undefined);

      return {
        success: true,
        result: {
          orderId: order.id,
          status: order.status,
          message: 'Order cancelled successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async executeListOrders(parameters: Record<string, unknown>): Promise<ToolResult> {
    const ticketId = parameters.ticketId;
    const status = parameters.status;
    const limit = parameters.limit;

    if (!ticketId || typeof ticketId !== 'string') {
      return {
        success: false,
        error: 'ticketId is required and must be a string',
      };
    }

    const orders = await this.orderService.listOrdersByTicket(
      ticketId,
      status ? (status as OrderStatus) : undefined,
      limit ? Number(limit) : 10
    );

    return {
      success: true,
      result: {
        orders,
        count: orders.length,
      },
    };
  }

  private async executeGetMenu(parameters: Record<string, unknown>): Promise<ToolResult> {
    const categoryId = parameters.categoryId;

    const menu = await this.menuService.getMenu(
      categoryId && typeof categoryId === 'string' ? categoryId : undefined
    );

    return {
      success: true,
      result: {
        items: menu,
        count: menu.length,
      },
    };
  }

  private async executeSearchMenuItem(parameters: Record<string, unknown>): Promise<ToolResult> {
    const query = parameters.query;
    const categoryId = parameters.categoryId;

    if (!query || typeof query !== 'string') {
      return {
        success: false,
        error: 'query is required and must be a string',
      };
    }

    const items = await this.menuService.searchMenuItem(
      query,
      categoryId && typeof categoryId === 'string' ? categoryId : undefined
    );

    return {
      success: true,
      result: {
        items,
        count: items.length,
      },
    };
  }

  private async executeGetMenuItemDetails(parameters: Record<string, unknown>): Promise<ToolResult> {
    const menuItemId = parameters.menuItemId;

    if (!menuItemId || typeof menuItemId !== 'string') {
      return {
        success: false,
        error: 'menuItemId is required and must be a string',
      };
    }

    const item = await this.menuService.getMenuItemDetails(menuItemId);

    if (!item) {
      return {
        success: false,
        error: `Menu item with id '${menuItemId}' not found`,
      };
    }

    return {
      success: true,
      result: item,
    };
  }

  private async executeGetRestaurantHours(parameters: Record<string, unknown>): Promise<ToolResult> {
    const hours = await this.restaurantService.getRestaurantHours();

    if (!hours) {
      return {
        success: false,
        error: 'Restaurant hours information not available',
      };
    }

    return {
      success: true,
      result: hours,
    };
  }

  private async executeGetDeliveryInfo(parameters: Record<string, unknown>): Promise<ToolResult> {
    const address = parameters.address;

    const info = await this.restaurantService.getDeliveryInfo(
      address && typeof address === 'string' ? address : undefined
    );

    if (!info) {
      return {
        success: false,
        error: 'Delivery information not available',
      };
    }

    return {
      success: true,
      result: info,
    };
  }

  private async executeGetPromotions(parameters: Record<string, unknown>): Promise<ToolResult> {
    const promotions = await this.restaurantService.getActivePromotions();

    return {
      success: true,
      result: {
        promotions,
        count: promotions.length,
      },
    };
  }
}




