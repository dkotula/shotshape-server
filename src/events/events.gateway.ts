import { OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

const sqrt_2 = Math.sqrt(2);
const bonuses = ['Bullet_minus', 'Bullet_plus', 'Bullet_strength_minus', 'Bullet_strength_plus', 'life_full', 'life_full_now', 'life_minus', 'Speed_x2_minus', 'Speed_x2_plus', 'Speed_x3_minus', 'Speed_x3_plus'];

@WebSocketGateway()
export class EventsGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private wsClients = [];
  private players = [];
  private mapElements = {
    players: [],
    bullets: [],
    bonuses: [],
  };
  private time = 0;
  private colors = ['red', 'yellow', 'blue', 'brown', 'purple', 'fuchsia', 'green', 'navy', 'aqua', 'cornflowerblue', 'crimson', 'darkgoldenrod', 'orange', 'darkorange', 'darkviolet', 'gold', 'indianred', 'lightslategrey'];
  private logger: Logger = new Logger('EventsGateway');

  private intervalEmit = setInterval(() => {
    this.server.emit('position', this.mapElements);
  }, 10);

  private intervalRun = setInterval(() => {
    if (this.mapElements.bonuses.length < 6 && this.time % 100 === 0) {
      this.mapElements.bonuses.push({
        src: bonuses[Math.floor(Math.random() * bonuses.length)],
        position: { x: Math.floor(Math.random() * 1000 + 50), y: Math.floor(Math.random() * 800 + 50) },
      });
    }
    for (let player in this.players) {
      if (this.players[player].isAlive) {
        if (this.players[player].controls.isKeyDown.a) {
          if (this.mapElements.players[player].position.x < 2 * this.mapElements.players[player].speed) this.mapElements.players[player].position.x = 0;
          else this.mapElements.players[player].position.x -= 2 * this.mapElements.players[player].speed;
        }
        if (this.players[player].controls.isKeyDown.d) this.mapElements.players[player].position.x += 2 * this.mapElements.players[player].speed;
        if (this.players[player].controls.isKeyDown.w) {
          if (this.mapElements.players[player].position.y < 2 * this.mapElements.players[player].speed) this.mapElements.players[player].position.y = 0;
          else this.mapElements.players[player].position.y -= 2 * this.mapElements.players[player].speed;
        }
        if (this.players[player].controls.isKeyDown.s) this.mapElements.players[player].position.y += 2 * this.mapElements.players[player].speed;

        this.mapElements.players[player].rotation = (this.mapElements.players[player].rotation + 2) % 720;
        if (this.mapElements.players[player].speedTime > 0) {
          this.mapElements.players[player].speedTime--;
          if (this.mapElements.players[player].speedTime === 0) {
            this.mapElements.players[player].speed = 1;
          }
        }
        if (this.mapElements.players[player].bulletSpeedTime > 0) {
          this.mapElements.players[player].bulletSpeedTime--;
          if (this.mapElements.players[player].bulletSpeedTime === 0) {
            this.mapElements.players[player].bulletSpeed = 1;
          }
        }
        if (this.mapElements.players[player].strengthTime > 0) {
          this.mapElements.players[player].strengthTime--;
          if (this.mapElements.players[player].strengthTime === 0) {
            this.mapElements.players[player].strength = 1;
          }
        }
        if (this.mapElements.players[player].regenerationTime > 0) {
          this.mapElements.players[player].regenerationTime--;
          if (this.mapElements.players[player].regenerationTime % 100 === 0) {
            if (this.mapElements.players[player].hp > 90) {
              this.mapElements.players[player].hp = 100;
            } else {
              this.mapElements.players[player].hp += 10;
            }
          }
        }
        for (let i = 0; i < this.mapElements.bonuses.length; i++) {
          const sideA = this.mapElements.players[player].position.x - this.mapElements.bonuses[i].position.x;
          const sideB = this.mapElements.players[player].position.y - this.mapElements.bonuses[i].position.y;
          if (Math.sqrt(sideA * sideA + sideB * sideB) < 45) {
            switch (this.mapElements.bonuses[i].src) {
              case 'Bullet_minus':
                this.mapElements.players[player].bulletSpeed = 0.5;
                this.mapElements.players[player].bulletSpeedTime = 1000;
                break;
              case 'Bullet_plus':
                this.mapElements.players[player].bulletSpeed = 2;
                this.mapElements.players[player].bulletSpeedTime = 1000;
                break;
              case 'Bullet_strength_minus':
                this.mapElements.players[player].strength = 0.5;
                this.mapElements.players[player].strengthTime = 1000;
                break;
              case 'Bullet_strength_plus':
                this.mapElements.players[player].strength = 2;
                this.mapElements.players[player].strengthTime = 1000;
                break;
              case 'life_full':
                this.mapElements.players[player].regenerationTime = 1000;
                break;
              case 'life_full_now':
                this.mapElements.players[player].hp = 100;
                break;
              case 'life_minus':
                this.mapElements.players[player].hp /= 2;
                break;
              case 'Speed_x2_minus':
                this.mapElements.players[player].speed = 0.5;
                this.mapElements.players[player].speedTime = 1000;
                break;
              case 'Speed_x2_plus':
                this.mapElements.players[player].speed = 2;
                this.mapElements.players[player].speedTime = 1000;
                break;
              case 'Speed_x3_minus':
                this.mapElements.players[player].speed = 1. / 3.;
                this.mapElements.players[player].speedTime = 1000;
                break;
              case 'Speed_x3_plus':
                this.mapElements.players[player].speed = 3;
                this.mapElements.players[player].speedTime = 1000;
                break;
            }
            this.mapElements.bonuses.splice(i, 1);
          }
        }

        if (this.players[player].controls.isMouseDown || this.players[player].controls.autofire) {
          if (this.mapElements.players[player].lastShot !== -1 && (this.time - this.mapElements.players[player].lastShot + 1000) % 1000 < 50) {
          } else {
            const sideA = this.players[player].controls.x - this.mapElements.players[player].position.x;
            const sideB = this.players[player].controls.y - this.mapElements.players[player].position.y;
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
              id: this.mapElements.players[player].id,
              color: this.mapElements.players[player].color,
              position: {
                x: this.mapElements.players[player].position.x,
                y: this.mapElements.players[player].position.y,
              },
              time: this.time,
              lifeTime: 100,
              direction: { x: directionX, y: directionY },
              speed: this.mapElements.players[player].bulletSpeed,
              strength: this.mapElements.players[player].strength,

            });
            this.mapElements.players[player].lastShot = this.time;
          }
        }
      }
    }
    for (let bullet in this.mapElements.bullets) {
      if (this.mapElements.bullets[bullet].lifeTime <= 0) {
        this.mapElements.bullets.splice(parseInt(bullet), 1);
      } else {
        this.mapElements.bullets[bullet].position.x += this.mapElements.bullets[bullet].direction.x * this.mapElements.bullets[bullet].speed;
        this.mapElements.bullets[bullet].position.y += this.mapElements.bullets[bullet].direction.y * this.mapElements.bullets[bullet].speed;
        this.mapElements.bullets[bullet].lifeTime--;
        let removedBullet = false;
        for (let i = 0; i < this.mapElements.players.length; i++) {
          if (this.mapElements.players[i].hp > 0) {
            const sideA = this.mapElements.players[i].position.x - this.mapElements.bullets[bullet].position.x;
            const sideB = this.mapElements.players[i].position.y - this.mapElements.bullets[bullet].position.y;
            if (this.mapElements.players[i].id !== this.mapElements.bullets[bullet].id && Math.sqrt(sideA * sideA + sideB * sideB) < 25) {
              this.mapElements.players[i].hp -= this.mapElements.bullets[bullet].lifeTime * this.mapElements.bullets[bullet].strength / 2;
              if (this.mapElements.players[i].hp <= 0) {
                this.players[i].isAlive = false;
                const found = this.mapElements.players.find(el => el.id === this.mapElements.bullets[bullet].id);
                found.points += 10;
                const found2 = this.wsClients.find(el => el.id === this.players[i].id);
                found2.emit('dead', this.mapElements.players[i].points);
              }
              this.mapElements.bullets.splice(parseInt(bullet), 1);
              removedBullet = true;
              break;
            }
          }
        }
      }
    }
    this.time = (this.time + 1) % 1000;
  }, 10);

  @SubscribeMessage('position')
  handlePosition(client: Socket, data: unknown): void {
    for (let player in this.players) {
      if (this.players[player].id === client.id) {
        this.players[player].controls = data;
        break;
      }
    }
  }

  @SubscribeMessage('start')
  handleStart(client: Socket, name: string): void {
    const found = this.mapElements.players.find(el => el.id === client.id);
    found.hp = 100;
    found.name = name;
    found.position = { x: Math.floor(Math.random() * 500 + 50), y: Math.floor(Math.random() * 500 + 50) }
    const found2 = this.players.find(el => el.id === client.id);
    found2.isAlive = true;
    client.emit('start');
  }

  @SubscribeMessage('client')
  handleEvent(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    this.players.push({
      id: client.id,
      controls: {
        x: 0,
        y: 0,
        isMouseDown: false,
        isKeyDown: { a: false, d: false, w: false, s: false },
        autofire: false,
      },
      isAlive: false,
    });
    this.wsClients.push(client);
    this.mapElements.players.push({
      id: client.id,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      position: { x: Math.floor(Math.random() * 500 + 50), y: Math.floor(Math.random() * 500 + 50) },
      rotation: 0,
      hp: 0,
      lastShot: -1,
      regenerationTime: 0,
      speed: 1,
      speedTime: 0,
      bulletSpeed: 1,
      bulletSpeedTime: 0,
      strength: 1,
      strengthTime: 0,
      points: 0,
      name: '',
    });
  }

  handleDisconnect(client: any): any {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.players = this.players.filter(function(obj) {
      return obj.id !== client.id;
    });
    this.mapElements.players = this.mapElements.players.filter(function(obj) {
      return obj.id !== client.id;
    });
    this.wsClients = this.wsClients.filter(function(obj) {
      return obj.id !== client.id;
    });
  }
}