// Arquivo: src/scenes/Level1Scene.js
// LEVEL 1 (EXTERIOR): Intro Cinematográfica, Chuva, Splash e Binds de Debug.

class Level1Scene extends Phaser.Scene {

    constructor() {
        super({ key: 'Level1Scene' });
        this.player = null;
        this.map = null;
        this.groundLayer = null;
        this.detalhesLayer = null;
        this.passablePlatforms = null;
        this.playerEnemyCollider = null; 
        
        this.groundCollider = null;

        this.keyR = null;
        this.keyF = null; 
        // [NOVO]
        this.key1 = null;
        this.key2 = null;
        this.key3 = null;

        this.gameOver = false;
        this.playerBarWidth = 200;
        this.introEvent = null;
        
        this.enemies = null;
        this.towerReactionPlayed = false;
        this.lastStepTime = 0;
        this.rain = null;
    }

    preload() {
        if (typeof Player !== 'undefined') {
            Player.preload(this);
        }

        this.load.tilemapTiledJSON('level1MapKey', 'assets/maps/level1.json');
        
        this.load.image('chaoTilesetImg', 'assets/images/mundo/chao1.png');
        this.load.image('decorImg', 'assets/images/mundo/Decor.png');
        this.load.image('wallsImg', 'assets/images/mundo/Pixel2DCastle1.1/walls.png');
        this.load.image('envImg', 'assets/images/mundo/Pixel2DCastle1.1/env_objects.png');
        this.load.image('groundTowerImg', 'assets/images/mundo/Pixel2DCastle1.1/ground.png');
        this.load.image('sidescrollerImg', 'assets/images/mundo/dungeon_sidescroller-Raou/Tilesetv3.png'); 

        const bgBasePath = 'assets/images/mundo/GandalfHardcore Background layers/Autumn BG/';
        this.load.image('bg1Img', bgBasePath + 'back1.png');
        this.load.image('bg2Img', bgBasePath + 'back2.png');
        this.load.image('bg3Img', bgBasePath + 'back3.png');
        this.load.image('bg4Img', bgBasePath + 'back4.png');
        this.load.image('bg5Img', bgBasePath + 'back5.png');
        
        let graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 1); graphics.fillRect(0, 0, 8, 8);
        graphics.generateTexture('sparkle_tex', 8, 8); graphics.destroy();
    }

    create() {
        try {
            this.gameOver = false;
            this.towerReactionPlayed = false;

            // --- MAPA ---
            this.map = this.make.tilemap({ key: 'level1MapKey' });

            const tilesetChao = this.map.addTilesetImage('chao_tileset', 'chaoTilesetImg');
            const tilesetWalls = this.map.addTilesetImage('wallsTower', 'wallsImg');
            const tilesetEnv = this.map.addTilesetImage('env_objectsTower', 'envImg');
            const tilesetDecor = this.map.addTilesetImage('Decor', 'decorImg');
            const tilesetGround = this.map.addTilesetImage('groundTower', 'groundTowerImg');
            const tilesetSidescroller = this.map.addTilesetImage('sidescroller', 'sidescrollerImg');

            const terrainTilesets = [tilesetChao, tilesetWalls, tilesetEnv, tilesetDecor, tilesetGround, tilesetSidescroller].filter(t => t !== null);

            // Backgrounds
            const tilesetBg1 = this.map.addTilesetImage('background', 'bg1Img');
            const tilesetBg2 = this.map.addTilesetImage('background2', 'bg2Img');
            const tilesetBg3 = this.map.addTilesetImage('background3', 'bg3Img');
            const tilesetBg4 = this.map.addTilesetImage('background4', 'bg4Img');
            const tilesetBg5 = this.map.addTilesetImage('background5', 'bg5Img');

            if(tilesetBg5) this.map.createLayer('fundo/layer5', tilesetBg5, 0, 0).setScrollFactor(0.2);
            if(tilesetBg4) this.map.createLayer('fundo/layer4', tilesetBg4, 0, 0).setScrollFactor(0.4);
            if(tilesetBg3) this.map.createLayer('fundo/layer3', tilesetBg3, 0, 0).setScrollFactor(0.6);
            if(tilesetBg2) this.map.createLayer('fundo/layer2', tilesetBg2, 0, 0).setScrollFactor(0.8);
            if(tilesetBg1) this.map.createLayer('fundo/layer1', tilesetBg1, 0, 0).setScrollFactor(1);
            
            this.groundLayer = this.map.createLayer('ChaoSolido', terrainTilesets, 0, 0);
            this.groundLayer.setCollisionByProperty({ collides: true });

            this.detalhesLayer = this.map.createLayer('Detalhes', terrainTilesets, 0, 0);

            this.passablePlatforms = this.physics.add.staticGroup();

            // --- 2. JOGADOR ---
            this.player = new Player(this, -60, 480);
            this.enemies = this.physics.add.group();

            // --- 3. COLISÕES ---
            this.groundCollider = this.physics.add.collider(this.player, this.groundLayer);
            this.physics.add.collider(this.player, this.passablePlatforms);

            // --- CONFIGURAÇÃO CUTSCENE ---
            this.player.setCollideWorldBounds(false); 
            this.player.body.allowGravity = false;    
            this.groundCollider.active = false;       

            // --- CÂMERA ---
            this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
            this.cameras.main.startFollow(this.player, true, 1, 1);
            this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

            this.createHUD();
            
            this.keyR = this.input.keyboard.addKey('R');
            this.keyF = this.input.keyboard.addKey('F');
            
            // [NOVO] Binds de Debug
            this.key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
            this.key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
            this.key3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
            this.key4 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);

            // --- EFEITOS ---
            this.rain = this.add.particles(0, 0, 'sparkle_tex', {
                x: { min: -200, max: 1000 }, 
                y: -50,
                lifespan: 1200, speedY: { min: 600, max: 900 }, speedX: { min: -20, max: 20 }, scaleY: { min: 5, max: 8 }, scaleX: 0.05, quantity: 2, tint: 0xaaccff, alpha: { start: 0.3, end: 0 }, blendMode: 'ADD'
            });
            this.rain.setDepth(50);

            this.splashEmitter = this.add.particles(0, 0, 'sparkle_tex', {
                lifespan: 350, speedY: { min: -150, max: -50 }, speedX: { min: -50, max: 50 }, scale: { start: 0.3, end: 0 }, gravityY: 800, tint: 0xaaddff, blendMode: 'ADD', emitting: false                 
            });

            this.time.addEvent({
                delay: 5000, loop: true,
                callback: () => { if (Math.random() > 0.6) this.cameras.main.flash(150, 200, 200, 255); }
            });
            
            // TELA DE "CLIQUE PARA INICIAR"
            const clickText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, "CLIQUE PARA INICIAR", {
                fontSize: '24px', fill: '#ffffff', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 4
            }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

            this.tweens.add({ targets: clickText, alpha: 0.5, duration: 800, yoyo: true, repeat: -1 });

            this.player.playerState = 'CUTSCENE'; 
            this.player.setVelocity(0, 0);
            this.player.anims.play('idle'); 

            this.input.once('pointerdown', () => {
                clickText.destroy();
                this.game.canvas.focus();
                this.startIntroCutscene();
            });

            this.events.on('shutdown', this.shutdownCleanup, this);

        } catch (error) { console.error("Create Error Level 1:", error); }
    }

    startIntroCutscene() {
        this.cameras.main.fadeIn(2500, 0, 0, 0);
        this.player.playerState = 'CUTSCENE'; 
        this.player.anims.play('run', true);  
        this.player.setVelocityX(120); 

        const titleText = this.add.text(this.cameras.main.width / 2, 200, "TOWER OF ECHOES", { 
            fontSize: '42px', fontFamily: 'Georgia, serif', 
            fill: '#ffffff', stroke: '#000000', strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 5, fill: true }
        }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(100);

        this.tweens.add({
            targets: titleText, alpha: 1, duration: 2000, yoyo: true, hold: 2500, 
            onComplete: () => titleText.destroy()
        });

        this.time.delayedCall(3800, () => {
            this.showFloatingText(this.player.x, this.player.y - 60, "Onde... estou?", 2000);
        });

        this.time.delayedCall(7000, () => {
            this.showFloatingText(this.player.x, this.player.y - 60, "Não me lembro de nada...", 2000);
        });

        this.introEvent = this.time.addEvent({
            delay: 10, loop: true,
            callback: () => {
                if (this.splashEmitter && this.time.now > this.lastStepTime + 350) {
                    this.lastStepTime = this.time.now;
                    this.splashEmitter.explode(4, this.player.x, this.player.body.bottom + 10); 
                }

                if (this.player.x >= 180) {
                    this.player.setVelocityX(0);
                    this.player.anims.play('idle', true);
                    
                    this.player.setCollideWorldBounds(true);  
                    this.player.body.allowGravity = true;     
                    this.groundCollider.active = true;        
                    
                    this.introEvent.remove(); 
                    
                    this.time.delayedCall(100, () => {
                        this.player.playerState = 'IDLE'; 
                        this.showTutorial();
                    });
                }
            }
        });
    }

    triggerTowerReaction() {
        this.towerReactionPlayed = true;
        this.player.setVelocity(0, 0);
        this.player.playerState = 'CUTSCENE';
        this.player.anims.play('hurt', true); 

        this.cameras.main.shake(200, 0.005);
        this.player.setTint(0xddbbff); 

        this.showFloatingText(this.player.x, this.player.y - 60, "A Torre...", 2000);

        this.time.delayedCall(1300, () => {
            const startColor = Phaser.Display.Color.ValueToColor(0xddbbff); 
            const endColor = Phaser.Display.Color.ValueToColor(0xffffff);        

            this.tweens.addCounter({
                from: 0, to: 100, duration: 1000, 
                onUpdate: (tween) => {
                    const value = tween.getValue();
                    const colorObject = Phaser.Display.Color.Interpolate.ColorWithColor(startColor, endColor, 100, value);
                    const color = Phaser.Display.Color.GetColor(colorObject.r, colorObject.g, colorObject.b);
                    this.player.setTint(color);
                },
                onComplete: () => {
                    this.player.clearTint();
                    this.player.anims.play('idle', true);
                    this.player.playerState = 'IDLE'; 
                }
            });
        });
    }

    showFloatingText(x, y, message, duration) {
        const text = this.add.text(x, y, message, {
            fontSize: '14px', fontFamily: 'Arial', fontStyle: 'italic',
            fill: '#cccccc', stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setAlpha(0).setDepth(90);

        this.tweens.add({
            targets: text, y: y - 30, alpha: { from: 0, to: 1 }, duration: duration / 2, yoyo: true, hold: 500, onComplete: () => text.destroy()
        });
    }

    showTutorial() {
        this.tweens.add({
            targets: this.hudContainer, alpha: 1, duration: 1000
        });

        const tutorialText = this.add.text(this.player.x, this.player.y - 120, 
            "WASD: Mover | W: Pular\nJ: Atacar | K: Defender | L: Dash\nF: Interagir", 
            { fontSize: '16px', fill: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 3 }
        ).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: tutorialText, alpha: 0, delay: 6000, duration: 2000, onComplete: () => tutorialText.destroy()
        });
    }

    update(time, delta) {
        // [NOVO] Checagem de teclas de debug

        if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
            this.scene.restart();
            return;
        }

        if (this.player && this.player.active) {
            this.player.update(time, delta);
            
            if (Phaser.Input.Keyboard.JustDown(this.keyF)) {
                this.handleDoorInteraction();
            }

            if (!this.towerReactionPlayed && this.player.x > 2000) {
                this.triggerTowerReaction();
            }

            if (this.player.body.onFloor() && Math.abs(this.player.body.velocity.x) > 10) {
                if (time > this.lastStepTime + 350) { 
                    this.lastStepTime = time;
                    this.splashEmitter.explode(5, this.player.x, this.player.body.bottom - 5);
                }
            }

            if (this.rain) {
                this.rain.setPosition(this.cameras.main.scrollX, this.cameras.main.scrollY);
            }
        }
        this.updateHUD();
    }

    handleDoorInteraction() {
        if (!this.detalhesLayer) return;
        const tiles = this.detalhesLayer.getTilesWithinWorldXY(this.player.body.x, this.player.body.y, this.player.body.width, this.player.body.height);
        const doorTile = tiles.find(tile => tile.properties && tile.properties.door);

        if (doorTile) {
            this.player.setVelocity(0, 0);
            this.player.playerState = 'CUTSCENE'; 
            this.player.anims.play('idle');
            this.cameras.main.fade(1000, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('Level2Scene'); 
            });
        }
    }

    createHUD() {
        const margin = 20;
        const bottomY = 600 - margin - 15;

        this.hudContainer = this.add.container(0, 0);
        this.hudContainer.setScrollFactor(0);
        this.hudContainer.setAlpha(0); 

        this.playerHealthBarBG = this.add.rectangle(margin, bottomY, this.playerBarWidth, 15, 0x000000, 0.5).setOrigin(0);
        this.playerHealthBar = this.add.rectangle(margin, bottomY, this.playerBarWidth, 15, 0x00ff00).setOrigin(0);
        this.playerStaminaBarBG = this.add.rectangle(margin, 600 - margin, this.playerBarWidth, 10, 0x000000, 0.5).setOrigin(0);
        this.playerStaminaBar = this.add.rectangle(margin, 600 - margin, this.playerBarWidth, 10, 0xffff00).setOrigin(0);
        this.healChargesText = this.add.text(margin + this.playerBarWidth + 10, bottomY, 'x3', { fontSize: '20px' }).setOrigin(0);

        this.hudContainer.add([this.playerHealthBarBG, this.playerHealthBar, this.playerStaminaBarBG, this.playerStaminaBar, this.healChargesText]);
    }

    updateHUD() {
        if(!this.player) return;
        this.playerHealthBar.width = (Math.max(0, this.player.health) / this.player.maxHealth) * this.playerBarWidth;
        this.playerStaminaBar.width = (Math.max(0, this.player.stamina) / this.player.maxStamina) * this.playerBarWidth;
        this.healChargesText.setText('x' + this.player.healCharges);
    }

    shutdownCleanup() {
        this.input.keyboard.removeAllListeners();
        this.time.removeAllEvents();
    }
}