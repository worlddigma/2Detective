import * as Phaser from 'phaser';
import { Scene } from 'phaser';

interface InteractableData {
    name: string;
    cost: number;
    text: string;
    isClue: boolean;
}

export class Game extends Scene {
    private player!: Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private walls!: Phaser.Physics.Arcade.StaticGroup;
    private keys!: { E: Phaser.Input.Keyboard.Key, V: Phaser.Input.Keyboard.Key }; // Добавляем клавишу E
    

    private clueLogText!: Phaser.GameObjects.Text;
    private foundClues: string[] = [];
    
    private points: number = 25;
    private pointsText!: Phaser.GameObjects.Text;
    private currentInteractable: Phaser.GameObjects.Rectangle | null = null; // Текущий объект рядом с игроком

    // Переменная для хранения текста-подсказки
    private hintText!: Phaser.GameObjects.Text;

    constructor() {
        super('Game');
    }

       create() {
        this.cameras.main.setBackgroundColor('#2d2d2d');
        this.points = 25;
        this.foundClues = [];

        // 1. Создаем игрока (красный квадрат)
        const playerRect = this.add.rectangle(400, 300, 32, 32, 0xff0000);
        this.player = this.physics.add.existing(playerRect) as Phaser.Types.Physics.Arcade.GameObjectWithDynamicBody;
        this.player.body.setCollideWorldBounds(true);

        // 2. Создаем стены (тоже через прямоугольники, но статические)
        this.walls = this.physics.add.staticGroup();
        
        // Верхняя стена
        const wallTop = this.add.rectangle(510, 10, 1024, 20, 0x555555);
        this.walls.add(wallTop); // Добавляем в группу. Phaser сам сделает её твердой!
        
        // Нижняя стена
        const wallBottom = this.add.rectangle(510, 760, 1024, 20, 0x555555);
        this.walls.add(wallBottom);
        
        // Левая стена
        const wallLeft = this.add.rectangle(10, 400, 20, 800, 0x555555);
        this.walls.add(wallLeft);
        
        // Правая стена
        const wallRight = this.add.rectangle(1015, 400, 20, 800, 0x555555);
        this.walls.add(wallRight);

        // Включаем столкновения
        this.physics.add.collider(this.player, this.walls);

        // 3. UI ЖУРНАЛА (Слева)
        this.add.text(20, 20, 'Журнал улик', { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' });
        this.clueLogText = this.add.text(20, 50, 'Открыть на V', { fontSize: '16px', color: '#aaaaaa', wordWrap: { width: 250 } });

        // 4. UI ОЧКОВ (Справа) 
        this.pointsText = this.add.text(1000, 20, `Очки: ${this.points}`, { fontSize: '24px', color: '#ffaa00', fontStyle: 'bold' }).setOrigin(1, 0);

        
        // 4. Управление
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.keys = this.input.keyboard.addKeys('E, V') as { E: Phaser.Input.Keyboard.Key, V: Phaser.Input.Keyboard.Key };
        }

        // 5. Текст
        this.hintText = this.add.text(500, 700, 'Нажмите E, чтобы осмотреть', {
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5).setVisible(false);

        
        this.createInteractable(200, 150, 0xffff00, { name: 'Труп', cost: 2, text: 'Найден труп. Узнайте свежие подробности.', isClue: true });
        this.createInteractable(600, 150, 0x0000ff, { name: 'Газета', cost: 1, text: 'В газете написано: "Пропал человек".', isClue: false });
        this.createInteractable(200, 450, 0x888888, { name: 'Старый чайник', cost: 1, text: 'Просто старый чайник. Пустышка.', isClue: false });
        this.createInteractable(600, 450, 0xffff00, { name: 'Записка', cost: 3, text: 'Записка с адресом.', isClue: true });
    }

    private createInteractable(x: number, y: number, color: number, data: InteractableData) {
        const rect = this.add.rectangle(x, y, 24, 24, color);
        this.physics.add.existing(rect, true); // Делаем статичным
        
        // Сохраняем данные прямо в объект (в Phaser можно добавлять свои свойства через any)
        (rect as any).interactData = data;

        // Добавляем пересечение
        this.physics.add.overlap(this.player, rect, () => {
            if (this.currentInteractable !== rect) {
                this.currentInteractable = rect;
                this.hintText.setText(`\t${data.name}\nНажмите E (Цена: ${data.cost})`).setVisible(true);
                this.time.delayedCall(5000, () => {
                    this.hintText.setVisible(false);
                });
            }
        });
    }
    private updateClueLog() {
        if (this.foundClues.length === 0) {
            this.clueLogText.setText('Пока пусто...');
        } else {
            const logString = this.foundClues.map(clue => `- ${clue}`).join('\n');
            this.clueLogText.setText(logString).setColor('#00ff00');
        }
    }

    // Конец игры (Квиз)
    private triggerQuiz() {
        this.physics.pause(); // Останавливаем игрока

        // Затемняем экран
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);

        // Выводим сообщение
        this.add.text(400, 300, 'Время вышло!\nПора ответить на вопросы.\n(Пока что просто перезапустите страницу, чтобы начать заново)', {
            fontSize: '32px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
    }
    private interact() {
        if (!this.currentInteractable) return;

        const data = (this.currentInteractable as any).interactData as InteractableData;

        // Проверяем, хватает ли очков
        if (this.points >= data.cost) {
            // Тратим очки
            this.points -= data.cost;
            this.pointsText.setText(`Очки: ${this.points}`);
            
            // Если объект полезный, пишем в журнал
            if (data.isClue) {
                this.foundClues.push(data.name);
                this.updateClueLog();
            }

            // Показываем текст объекта
            this.hintText.setText(`${data.text} (Осталось: ${this.points})`).setColor('#00ff00');
            
            // Уничтожаем объект
            this.currentInteractable.destroy();
            this.currentInteractable = null;

            // Прячем текст через 2 секунды
            this.time.delayedCall(2500, () => {
                this.hintText.setVisible(false);
            });

            // Проверяем, не закончились ли очки
            if (this.points <= 0) {
                this.triggerQuiz();
            }

        } else {
            // Не хватает очков
            this.hintText.setText('Не хватает очков!').setColor('#ff0000');
            this.time.delayedCall(1500, () => {
                this.hintText.setText(`Нажмите E (Цена: ${data.cost})`).setColor('#ffffff');
            });
        }
    }

    update() {
        // Логика движения
        const speed = 200;
        this.player.body.setVelocity(0);

        if (this.cursors.left.isDown) {
            this.player.body.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.player.body.setVelocityX(speed);
        }

        if (this.cursors.up.isDown) {
            this.player.body.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
            this.player.body.setVelocityY(speed);
        }
        if (this.currentInteractable && Phaser.Input.Keyboard.JustDown(this.keys.E)) {
            this.interact();
        }
        if (Phaser.Input.Keyboard.JustDown(this.keys.V)) {
            this.hintText.setVisible(true);
                this.hintText.setText('Открыт журнал').setColor('#00ff00');
                
                this.time.delayedCall(2000, () => {
                    this.hintText.setVisible(false);
                });
            }
    }
}