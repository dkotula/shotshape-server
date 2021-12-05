import { OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

const sqrt_2 = Math.sqrt(2);

@WebSocketGateway()
export class EventsGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private players = [];
  private mapElements = {
    bullets: [],
  };
  private time = 0;
  private colors = ['red', 'yellow', 'blue', 'brown', 'purple', 'fuchsia', 'green', 'navy', 'aqua', 'cornflowerblue', 'crimson', 'darkgoldenrod', 'orange', 'darkorange', 'darkviolet', 'gold', 'indianred', 'lightslategrey'];
  private logger: Logger = new Logger('EventsGateway');

  private intervalEmit = setInterval(() => {
    const object = {
      players: this.players,
      mapElements: this.mapElements,
    };
    this.server.emit('position', object);
  }, 10);

  private intervalRun = setInterval(() => {
    for (let player in this.players) {
      if (this.players[player].controls.isKeyDown.a) this.players[player].position.x -= 2;
      if (this.players[player].controls.isKeyDown.d) this.players[player].position.x += 2;
      if (this.players[player].controls.isKeyDown.w) this.players[player].position.y -= 2;
      if (this.players[player].controls.isKeyDown.s) this.players[player].position.y += 2;

      if (this.players[player].controls.isMouseDown) {
        const found = this.mapElements.bullets.reverse().find(bullet => bullet.id === this.players[player].id);
        this.mapElements.bullets.reverse();
        if (found && (this.time - found.time + 1000) % 1000 < 50) {
        } else {
          const sideA = this.players[player].controls.x - this.players[player].position.x;
          const sideB = this.players[player].controls.y - this.players[player].position.y;
          const sideC = Math.sqrt(sideA * sideA + sideB * sideB);
          let directionX;
          let directionY;
          if (sideC === 0) {
            directionX = 3 * sqrt_2;
            directionY = 3 * sqrt_2;
          } else {
            directionX = 6 * sideA / sideC;
            directionY = 6 * sideB / sideC;
          }
          this.mapElements.bullets.push({
            id: this.players[player].id,
            color: this.players[player].color,
            position: { x: this.players[player].position.x, y: this.players[player].position.y },
            time: this.time,
            lifeTime: 100,
            direction: { x: directionX, y: directionY },
          });
        }
      }
    }
    for (let bullet in this.mapElements.bullets) {
      if (this.mapElements.bullets[bullet].lifeTime <= 0) {
        this.mapElements.bullets.splice(parseInt(bullet), 1);
      } else {
        this.mapElements.bullets[bullet].position.x += this.mapElements.bullets[bullet].direction.x;
        this.mapElements.bullets[bullet].position.y += this.mapElements.bullets[bullet].direction.y;
        this.mapElements.bullets[bullet].lifeTime--;
      }
    }
    this.time = (this.time + 1) % 1000;
  }, 10);

  @SubscribeMessage('position')
  handleMessage(client: Socket, data: unknown): void {
    for (let player in this.players) {
      if (this.players[player].id === client.id) {
        this.players[player].controls = data;
        break;
      }
    }
  }

  @SubscribeMessage('client')
  handleEvent(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    this.players.push({
      id: client.id,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      controls: { x: 0, y: 0, isMouseDown: false, isKeyDown: { a: false, d: false, w: false, s: false } },
      position: { x: Math.floor(Math.random() * 500), y: Math.floor(Math.random() * 500) },
    });
  }

  handleDisconnect(client: any): any {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.players = this.players.filter(function(obj) {
      return obj.id !== client.id;
    });
  }
}