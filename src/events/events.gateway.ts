import { OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway()
export class EventsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private positions = [];
  private logger: Logger = new Logger('EventsGateway');

  @SubscribeMessage('position')
  handleMessage(client: Socket, data: unknown): void {
    for (let player in this.positions) {
      if (this.positions[player].id === client.id) {
        this.positions[player].positions = data;
        this.server.emit('position', this.positions[player]);
        break;
      }
    }
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    this.positions.push({
      id: client.id,
      color: 'rgb(' + (Math.floor(Math.random() * 256) + ',' + Math.floor(Math.random() * 256) + ',' + Math.floor(Math.random() * 256)) + ')',
      positions: { x: 0, y: 0 },
    });
  }
}