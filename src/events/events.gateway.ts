import { OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway()
export class EventsGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private positions = [];
  private colors = ['red', 'yellow', 'blue', 'brown', 'purple', 'fuchsia', 'green', 'navy', 'aqua', 'cornflowerblue', 'crimson', 'darkgoldenrod', 'orange', 'darkorange', 'darkviolet', 'gold', 'indianred', 'lightslategrey'];
  private logger: Logger = new Logger('EventsGateway');

  private intervalEmit = setInterval(() => {
    this.server.emit('position', this.positions);
  }, 20);

  private intervalRun = setInterval(() => {
    for (let player in this.positions) {
      if (this.positions[player].controls.isKeyDown.a) this.positions[player].position.x -= 2;
      if (this.positions[player].controls.isKeyDown.d) this.positions[player].position.x += 2;
      if (this.positions[player].controls.isKeyDown.w) this.positions[player].position.y -= 2;
      if (this.positions[player].controls.isKeyDown.s) this.positions[player].position.y += 2;
    }
  }, 10);

  @SubscribeMessage('position')
  handleMessage(client: Socket, data: unknown): void {
    for (let player in this.positions) {
      if (this.positions[player].id === client.id) {
        this.positions[player].controls = data;
        break;
      }
    }
  }

  @SubscribeMessage('client')
  handleEvent(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    this.positions.push({
      id: client.id,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      controls: { x: 0, y: 0, isMouseDown: false, isKeyDown: { a: false, d: false, w: false, s: false } },
      position: { x: Math.floor(Math.random() * 500), y: Math.floor(Math.random() * 500) },
    });
  }

  handleDisconnect(client: any): any {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.positions = this.positions.filter(function(obj) {
      return obj.id !== client.id;
    });
  }
}