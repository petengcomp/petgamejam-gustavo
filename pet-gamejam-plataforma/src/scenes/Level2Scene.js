// Arquivo: src/scenes/Level2Scene.js
// LEVEL 2 (INTERIOR): Boss Fight Completa e Corrigida

class Level2Scene extends Phaser.Scene {

    constructor() {
        super({ key: 'Level2Scene' });
        this.player = null;
        this.enemies = null; 
        this.flag = null;

        this.gameOver = false;
        this.bossFightStarted = false;
        this.bossIntroPlayed = false;

        this.winText = null;
        this.restartText = null;

        this.map = null;
        this.groundLayer = null;
        this.detalhesLayer = null;
        this.passablePlatforms = null;
        this.playerEnemyCollider = null;

        this.keyR = null;
        this.keyF = null; 

        this.playerBarWidth = 200;
        this.bossBarWidth = 300;

        this.sparkEmitter = null;
        this.enemyAttackTimer = null;
        this.bossLives = [];
        
        this.entranceEvent = null;
    }

    preload() {
        if (typeof Player !== 'undefined') {
            Player.preload(this);
        } else {
            console.error("ERRO: Classe Player não encontrada.");
        }

        this.load.tilemapTiledJSON('level2MapKey', 'assets/maps/level2.json');
        
        // Tilesets
        this.load.image('spriteTiles', 'assets/images/mundo/sprite.png'); 
        this.load.image('chaoTilesetImg', 'assets/images/mundo/chao1.png');
        this.load.image('decorImg', 'assets/images/mundo/Decor.png');
        this.load.image('wallsImg', 'assets/images/mundo/Pixel2DCastle1.1/walls.png');
        this.load.image('envImg', 'assets/images/mundo/Pixel2DCastle1.1/env_objects.png');
        this.load.image('groundTowerImg', 'assets/images/mundo/Pixel2DCastle1.1/ground.png');
        this.load.image('sidescrollerImg', 'assets/images/mundo/dungeon_sidescroller-Raou/Tilesetv3.png'); 
        
        this.load.image('platLeft', 'assets/images/mundo/Tiles/floor_tile_1.png');
        this.load.image('platMid', 'assets/images/mundo/Tiles/floor_tile_2.png');
        this.load.image('platRight', 'assets/images/mundo/Tiles/floor_tile_4.png');

        // Backgrounds
        const bgBasePath = 'assets/images/mundo/GandalfHardcore Background layers/Autumn BG/';
        this.load.image('bg1Img', bgBasePath + 'back1.png');
        this.load.image('bg2Img', bgBasePath + 'back2.png');
        
        this.load.spritesheet('nightborneSheet', 'assets/images/NightBorne.png', { frameWidth: 80, frameHeight: 80 });

        let graphics = this.add.graphics();
        graphics.fillStyle(0xffff00, 1); graphics.fillRect(0, 0, 8, 8);
        graphics.generateTexture('sparkle_tex', 8, 8); graphics.destroy();
    }

    create() {
        try {
            this.gameOver = false;
            this.bossFightStarted = false;
            this.bossIntroPlayed = false; 

            // --- MAPA ---
            this.map = this.make.tilemap({ key: 'level2MapKey' });
            
            const tilesetTiles = this.map.addTilesetImage('Tiles', 'spriteTiles'); 
            const tilesetChao = this.map.addTilesetImage('chao_tileset', 'chaoTilesetImg');
            const tilesetWalls = this.map.addTilesetImage('wallsTower', 'wallsImg');
            const tilesetEnv = this.map.addTilesetImage('env_objectsTower', 'envImg');
            const tilesetDecor = this.map.addTilesetImage('Decor', 'decorImg');
            const tilesetGround = this.map.addTilesetImage('groundTower', 'groundTowerImg');
            const tilesetSidescroller = this.map.addTilesetImage('sidescroller', 'sidescrollerImg');
            const tilesetBg1 = this.map.addTilesetImage('background', 'bg1Img');
            const tilesetBg2 = this.map.addTilesetImage('background2', 'bg2Img');
            
            const allTilesets = [tilesetTiles, tilesetChao, tilesetWalls, tilesetEnv, tilesetDecor, tilesetGround, tilesetSidescroller, tilesetBg1, tilesetBg2].filter(t => t !== null);

            const tintColor = 0x676767;

            const layer2 = this.map.createLayer('fundo/layer2', allTilesets, 0, 0);
            if (layer2) layer2.setScrollFactor(1).setTint(tintColor);
            
            const layer1 = this.map.createLayer('fundo/layer1', allTilesets, 0, 0);
            if (layer1) layer1.setScrollFactor(1).setTint(tintColor);
            
            this.groundLayer = this.map.createLayer('ChaoSolido', allTilesets, 0, 0);
            this.groundLayer.setCollisionByProperty({ collides: true });

            this.detalhesLayer = this.map.createLayer('Detalhes', allTilesets, 0, 0);

            // --- PLATAFORMAS FANTASMAS ---
            this.passablePlatforms = this.physics.add.staticGroup();
            this.addGhostPlatform(400, 450, 200, 0);
            this.addGhostPlatform(1100, 400, 200, 0);
            this.addGhostPlatform(1600, 300, 200, 3000);

            // --- JOGADOR ---
            this.player = new Player(this, 40, 450); 
            
            // --- BOSS ---
            this.enemies = this.physics.add.group();
            const boss = this.enemies.create(1000, 200, 'nightborneSheet');
            boss.setScale(2.5);
            boss.setImmovable(true);
            boss.setCollideWorldBounds(true);
            boss.body.setSize(35, 30);
            boss.body.setOffset(20, 32);
            
            // --- CONFIGURAÇÃO DE 2 VIDAS ---
            boss.health = 300; boss.maxHealth = 300; 
            boss.currentLives = 2; 
            boss.maxLives = 2; 
            boss.isGuarding = true; boss.isVulnerable = false; boss.isAttacking = false; 
            boss.isDying = false; boss.isEnraged = false;

            // --- COLISÕES ---
            this.physics.add.collider(this.player, this.groundLayer);
            this.physics.add.collider(this.player, this.passablePlatforms);
            this.physics.add.collider(this.enemies, this.groundLayer);
            this.physics.add.collider(this.enemies, this.passablePlatforms);
            
            this.playerEnemyCollider = this.physics.add.collider(this.player, this.enemies, this.handlePlayerBumpEnemy, null, this);
            this.physics.add.overlap(this.player.attackHitbox, this.enemies, this.handleAttackHitEnemy, null, this);

            this.enemyHitbox = this.add.rectangle(0, 0, 50, 50, 0xff0000, 0);
            this.physics.add.existing(this.enemyHitbox);
            this.enemyHitbox.body.setAllowGravity(false);
            this.enemyHitbox.body.enable = false;
            this.physics.add.overlap(this.enemyHitbox, this.player, (hitbox, player) => {
                const enemy = this.enemies.getFirstAlive();
                if(player && enemy) this.handlePlayerHitByEnemy(player, enemy);
            }, null, this);

            this.createAnimations();
            boss.play('nb_idle');

            // --- CÂMERA E HUD ---
            this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
            this.cameras.main.startFollow(this.player, true, 1, 1);
            this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

            // Textos de Game Over / Vitória
            const cx = this.cameras.main.width / 2;
            const cy = this.cameras.main.height / 2;
            this.winText = this.add.text(cx, cy - 50, 'VOCÊ VENCEU!', { fontSize: '48px', fill: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setVisible(false).setScrollFactor(0).setDepth(100);
            this.restartText = this.add.text(cx, cy + 50, 'Pressione R para Reiniciar', { fontSize: '24px', fill: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setVisible(false).setScrollFactor(0).setDepth(100);

            this.createHUD();

            this.keyR = this.input.keyboard.addKey('R');
            this.keyF = this.input.keyboard.addKey('F');

            this.enemyAttackTimer = this.time.addEvent({
                delay: 100, callback: this.bossAIUpdate, callbackScope: this, loop: true, paused: true
            });
            
            this.sparkEmitter = this.add.particles(0, 0, 'sparkle_tex', {
                lifespan: 300, speed: { min: 150, max: 350 }, scale: { start: 1.5, end: 0 }, alpha: { start: 1, end: 0 }, gravityY: 600, blendMode: 'ADD', emitting: false
            });
            
            this.startLevelEntrance();

            this.events.on('shutdown', this.shutdownCleanup, this);

        } catch (error) { console.error("Level 2 Create Error:", error); }
    }

    startLevelEntrance() {
        this.cameras.main.fadeIn(1500, 0, 0, 0);
        this.player.playerState = 'CUTSCENE';
        this.player.anims.play('run', true);
        this.player.setVelocityX(120);

        this.entranceEvent = this.time.addEvent({
            delay: 10, loop: true,
            callback: () => {
                if (this.player.x >= 200) {
                    this.player.setVelocityX(0);
                    this.player.anims.play('idle', true);
                    this.player.playerState = 'IDLE'; 
                    this.entranceEvent.remove();
                    this.time.delayedCall(500, () => {
                        this.showFloatingText(this.player.x, this.player.y - 60, "Está quieto demais...", 2000);
                    });
                }
            }
        });
    }

    triggerBossIntro(boss) {
        this.bossIntroPlayed = true;
        this.player.playerState = 'CUTSCENE';
        this.player.setVelocity(0, 0);
        this.player.anims.play('idle', true);
        this.cameras.main.stopFollow();
        this.cameras.main.pan(boss.x, boss.y, 1500, 'Power2');
        this.cameras.main.zoomTo(1.3, 1500, 'Power2');
        
        boss.setFlipX(this.player.x < boss.x);

        this.time.delayedCall(1500, () => {
            this.cameras.main.shake(200, 0.005);
            this.player.setTint(0xddbbff); 
            
            const bossName = this.add.text(boss.x, boss.y - 100, "VARG, O LEAL", { 
                fontSize: '32px', fontFamily: 'Georgia', fill: '#ff0000', stroke: '#000', strokeThickness: 4 
            }).setOrigin(0.5).setAlpha(0);

            this.tweens.add({ targets: bossName, alpha: 1, duration: 1000, yoyo: true, hold: 1500 });
            
            this.time.delayedCall(1000, () => {
                this.showFloatingText(this.player.x, this.player.y - 60, "A lâmina exige sangue...", 2000);
            });
            
            boss.play('nb_attack'); 

            this.time.delayedCall(2500, () => {
                this.player.clearTint(); 
                this.cameras.main.zoomTo(1, 500, 'Power2');
                this.cameras.main.startFollow(this.player, true, 1, 1);
                
                // Chamada da função de início de luta (que estava falhando)
                this.startBossFight(boss);
                
                if (this.player.active) this.player.playerState = 'IDLE'; 
            });
        }, [], this);
    }

    startBossFight(boss) {
        this.bossFightStarted = true;
        this.enemyAttackTimer.paused = false;
        this.bossHealthBarBG.setVisible(true);
        this.bossHealthBar.setVisible(true);
        
        if (this.bossLives) {
            this.bossLives.forEach(ball => ball.setVisible(true)); 
        }

        boss.setFlipX(this.player.x < boss.x);
        boss.canStab = true;
    }

    update(time, delta) {
        if (Phaser.Input.Keyboard.JustDown(this.keyR) && this.gameOver) {
            this.scene.restart();
            return;
        }

        if (this.gameOver) return;
        
        if (this.player && this.player.active) {
            this.player.update(time, delta);
            
            if (Phaser.Input.Keyboard.JustDown(this.keyF)) {
                this.handleDoorInteraction();
            }

            if (this.player.playerState === 'DASH') {
                if (this.playerEnemyCollider.active) this.playerEnemyCollider.active = false;
            } else {
                if (!this.playerEnemyCollider.active) this.playerEnemyCollider.active = true;
            }
        }

        this.updateHUD();

        if (!this.bossIntroPlayed) {
            const boss = this.enemies.getFirstAlive();
            if (boss && Phaser.Math.Distance.Between(this.player.x, this.player.y, boss.x, boss.y) <= 400) {
                this.triggerBossIntro(boss);
            }
        }
    }

    handleAttackHitEnemy(hitbox, enemy) {
        if (this.player.enemiesHitThisAttack.includes(enemy)) return;
        if (!hitbox.body.enable) return;

        if (enemy.isGuarding && !enemy.isVulnerable && !enemy.isAttacking) {
            this.player.enemiesHitThisAttack.push(enemy);
            let impactX = (this.player.playerFacing === 'right') ? hitbox.body.right : hitbox.body.left;
            impactX = Phaser.Math.Clamp(impactX, enemy.body.left, enemy.body.right);
            const impactY = Phaser.Math.Clamp(hitbox.y, enemy.body.top, enemy.body.bottom);
            this.createSparks(impactX, impactY, 200);

            enemy.blockCount = (enemy.blockCount || 0) + 1;
            if (enemy.blockCount >= 3) {
                enemy.blockCount = 0;
                this.bossAttackCombo(enemy);
            }
            return;
        }

        this.player.enemiesHitThisAttack.push(enemy);
        this.hitStop(50);
        this.cameras.main.shake(100, 0.01);

        let damage = 20;
        if (this.player.currentAttackAnim === 'specialAttack') damage = 50;
        if (enemy.isVulnerable) damage *= 1.5;

        enemy.health -= damage;
        this.updateHUD(); 

        if (enemy.health <= 0) {
            if (enemy.currentLives > 1) {
                enemy.currentLives--;
                enemy.health = enemy.maxHealth; 
                enemy.isEnraged = true;        
                
                this.updateHUD(); 
                this.cameras.main.flash(500, 255, 0, 0);
                this.cameras.main.shake(100, 0.01);
                this.hitStop(100);
                this.showFloatingText(enemy.x, enemy.y - 60, "TRAIDOR!!!", 2000);
                this.resetBossState(enemy); 
                enemy.play('nb_hurt'); 
                enemy.once('animationcomplete-nb_hurt', () => {
                    if (enemy.active) {
                        enemy.play('nb_idle');
                        enemy.isGuarding = true;
                    }
                });
                return; 
            }
            
            if (!enemy.isExecutionPhase) {
                this.triggerExecution(enemy);
            }
            return; 
        }

        if (enemy.isAttacking) {
            enemy.setTint(0xffaaaa);
            let impactX = (this.player.playerFacing === 'right') ? hitbox.body.right : hitbox.body.left;
            impactX = Phaser.Math.Clamp(impactX, enemy.body.left, enemy.body.right);
            const impactY = Phaser.Math.Clamp(hitbox.y, enemy.body.top, enemy.body.bottom);
            this.createSparks(impactX, impactY, 200);
            this.time.delayedCall(100, () => { 
                if(enemy.active && !enemy.isUnblockable && !enemy.isEnraged) enemy.clearTint(); 
            });
        } 
        else {
            enemy.setVelocityX(0);
            enemy.play('nb_hurt');
            enemy.once('animationcomplete', () => {
                if (!enemy.isDying) {
                    enemy.play('nb_idle');
                    if(!enemy.isVulnerable) enemy.isGuarding = true;
                }
            });
        }
    }

    triggerExecution(boss) {
        this.tweens.killTweensOf(boss);
        boss.isExecutionPhase = true;
        this.player.removeAllListeners(); 
        this.physics.world.timeScale = 0.1; 
        this.player.playerState = 'CUTSCENE'; 
        this.player.playerInvulnerable = true;
        this.player.body.stop(); 
        this.player.setVelocity(0, 0);
        this.tweens.killTweensOf(this.player);
        this.player.setAlpha(1);
        this.player.clearTint();
        boss.setVelocity(0, 0);
        boss.isAttacking = false;
        boss.anims.stop();
        boss.setTint(0xff0000); 
        this.cameras.main.zoomTo(1.5, 1000, 'Power2', true);
        this.cameras.main.pan(boss.x, boss.y, 1000, 'Power2', true);
        this.time.delayedCall(150, () => { 
            this.cameras.main.flash(200, 255, 255, 255);
            this.physics.world.timeScale = 1;
            this.killBoss(boss);
        }, [], this);
    }

    killBoss(enemy) {
        enemy.removeAllListeners(); 
        enemy.isDying = true;
        enemy.body.enable = false;
        this.enemyHitbox.body.enable = false;
        enemy.play('nb_death');
        
        this.player.play({ key: 'parry', frameRate: 8, repeat: 0 }, true);
        
        const freezeParry = (anim, frame) => {
            if (anim.key === 'parry' && frame.index === 3) {
                this.player.anims.pause();
                this.player.off('animationupdate', freezeParry);
            }
        };
        this.player.on('animationupdate', freezeParry);
        
        this.enemyAttackTimer.paused = true;
        this.bossHealthBar.setVisible(false); 
        this.bossHealthBarBG.setVisible(false);
        if (this.bossLives) this.bossLives.forEach(ball => ball.setVisible(false));

        enemy.once('animationcomplete', () => { this.startSoulAbsorption(enemy); });
    }

    startSoulAbsorption(boss) {
        this.tweens.add({ targets: boss, alpha: 0, duration: 1500, ease: 'Power2', onComplete: () => { boss.destroy(); } });
        this.tweens.addCounter({
            from: 0, to: 100, duration: 1500,
            onUpdate: (tween) => {
                const val = tween.getValue();
                if (val % 20 < 10) this.player.setTint(0x8800ff);
                else this.player.clearTint();
            },
            onComplete: () => this.player.clearTint()
        });
        const soulParticles = this.add.group({ defaultKey: 'sparkle_tex' });
        this.time.addEvent({
            delay: 30, repeat: 30,
            callback: () => {
                if (!this.player.active) return;
                const spawnX = boss.x + Phaser.Math.Between(-30, 30);
                const spawnY = boss.y + Phaser.Math.Between(-40, 10);
                const part = soulParticles.get(spawnX, spawnY);
                if (part) {
                    part.setActive(true).setVisible(true);
                    part.setScale(Phaser.Math.FloatBetween(1.5, 2.5)); 
                    part.setTint(0x8800ff); 
                    const startPoint = new Phaser.Math.Vector2(spawnX, spawnY);
                    const swordOffset = this.player.flipX ? -25 : 25;
                    const endPoint = new Phaser.Math.Vector2(this.player.x + swordOffset, this.player.y + 10);
                    const midX = (startPoint.x + endPoint.x) / 2;
                    const midY = (startPoint.y + endPoint.y) / 2;
                    const controlPoint = new Phaser.Math.Vector2(midX + Phaser.Math.Between(-150, 150), midY - Phaser.Math.Between(100, 200));
                    const curve = new Phaser.Curves.QuadraticBezier(startPoint, controlPoint, endPoint);
                    const pathFollower = { t: 0 };
                    this.tweens.add({
                        targets: pathFollower, t: 1, duration: 800, ease: 'Sine.easeIn', 
                        onUpdate: () => {
                            if (!part.active) return;
                            const position = curve.getPoint(pathFollower.t);
                            part.setPosition(position.x, position.y);
                        },
                        onComplete: () => soulParticles.killAndHide(part)
                    });
                    this.tweens.add({ targets: part, scale: 0.5, duration: 800 });
                }
            }
        });

        // MOMENTO DA CURA
        this.time.delayedCall(2000, () => {
             this.player.anims.resume(); 
             this.player.playerState = 'IDLE';
             this.cameras.main.zoomTo(1, 500, 'Power2');

             // [MUDANÇA: CURA]
             this.player.health = this.player.maxHealth; 
             this.player.healCharges = 3; 
             this.updateHUD(); 

             // [MUDANÇA DE TEXTO]
             const tipText = this.add.text(this.player.x, this.player.y - 80, "Eco Silenciado.", { fontSize: '18px', fontFamily: 'Georgia', fill: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
             this.tweens.add({ targets: tipText, alpha: 0, duration: 3000, delay: 2000, onComplete: () => tipText.destroy() });
        });
    }

    killPlayer() {
        this.gameOver = true;
        this.player.clearAttackState();
        this.player.play('death');
        this.physics.pause();
        this.restartText.setVisible(true);
        this.winText.setText("VOCÊ MORREU"); // Opcional
        this.winText.setVisible(true);
    }

    hitStop(duration) {
        this.physics.world.pause();
        this.anims.pauseAll();
        setTimeout(() => {
            if(this.physics.world) this.physics.world.resume();
            if(this.anims) this.anims.resumeAll();
        }, duration);
    }

    handlePlayerHitByEnemy(player, enemy) {
        if (this.player.playerInvulnerable || this.player.playerState === 'DASH') return;

        // Calcula o dano base
        let damage = 25;
        
        // Se for Fase 2, o dano aumenta!
        if (enemy.isEnraged) damage = 40; 

        if (this.player.isParrying) {
            if (enemy.isUnblockable) {
                this.takeDamage(damage, enemy); // Dano cheio se for inbloqueável
            } else {
                // PARRY BEM SUCEDIDO
                this.player.parrySucceeded = true;
                this.hitStop(100);
                
                // (Lógica visual do parry continua igual...)
                const parrySparkOffsetX = 45; const parrySparkOffsetY = 10;
                let impactX = (this.player.playerFacing === 'right') ? player.x + parrySparkOffsetX : player.x - parrySparkOffsetY;
                const clampedX = Phaser.Math.Clamp(impactX, enemy.body.left + 5, enemy.body.right - 5);
                const clampedY = Phaser.Math.Clamp(player.y + parrySparkOffsetY, enemy.body.top + 10, enemy.body.bottom - 10);
                
                this.time.delayedCall(150, () => { if (enemy.active) this.createSparks(clampedX, clampedY); });
                
                enemy.isAttacking = false; enemy.isGuarding = false; enemy.isVulnerable = true;
                enemy.setTint(0x00ffff);
                this.enemyHitbox.body.enable = false;
                
                this.time.delayedCall(2000, () => { 
                    if(enemy.active && !enemy.isDying && !enemy.isExecutionPhase) { 
                        enemy.clearTint(); enemy.isVulnerable = false; enemy.isAttacking = true;
                        this.bossAttackFollowUp(enemy);
                    }
                });
            }
            return;
        }
        
        // Se tomou o hit direto
        this.takeDamage(damage, enemy);
    }

    handlePlayerBumpEnemy(player, enemy) {
        if (this.player.playerState === 'DASH') return;
        const distanceX = Math.abs(player.x - enemy.x);
        if (distanceX > 40) return;
        this.takeDamage(10, enemy);
    }

    takeDamage(amount, source) {
        if (this.player.playerInvulnerable || this.gameOver) return;
        this.player.health -= amount;
        this.updateHUD();
        this.cameras.main.shake(200, 0.02);
        this.player.clearAttackState();
        if (this.player.health <= 0) {
            this.killPlayer();
            return;
        }
        this.player.playerState = 'HURT';
        this.player.playerInvulnerable = true;
        this.player.play('hurt');
        const dir = (source.x < this.player.x) ? 1 : -1;
        this.player.setVelocity(dir * 300, -300);
        this.player.once('animationcomplete', () => {
            this.player.playerState = 'IDLE';
            this.time.delayedCall(1000, () => {
                this.player.playerInvulnerable = false;
                if(this.player.active) this.player.setAlpha(1);
            });
        });
        this.tweens.add({ targets: this.player, alpha: 0.2, duration: 100, repeat: 5, yoyo: true });
    }

    handleDoorInteraction() {
        const activeEnemies = this.enemies.getChildren().filter(e => e.active && !e.isDying);
        if (activeEnemies.length > 0) {
            const warning = this.add.text(this.player.x, this.player.y - 50, "Derrote o Guardião!", { fontSize: '16px', fill: '#ff0000', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
            this.tweens.add({ targets: warning, y: warning.y - 30, alpha: 0, duration: 1000, onComplete: () => warning.destroy() });
            return;
        }

        if (!this.detalhesLayer) return;
        const tiles = this.detalhesLayer.getTilesWithinWorldXY(this.player.body.x, this.player.body.y, this.player.body.width, this.player.body.height);
        const doorTile = tiles.find(tile => tile.properties && tile.properties.door);

        if (doorTile) {
            console.log("Vitória! Indo para Level 3.");
            this.player.setVelocity(0, 0);
            this.player.playerState = 'CUTSCENE'; 
            this.player.anims.play('idle');
            
            this.cameras.main.fade(2000, 0, 0, 0);
            
            const endText = this.add.text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, "Ecos Silenciados...", {
                fontSize: '40px', fontFamily: 'Georgia', fill: '#fff', fontStyle: 'italic'
            }).setOrigin(0.5).setAlpha(0).setDepth(200);
            this.tweens.add({ targets: endText, alpha: 1, duration: 2000 });

            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                // [CORREÇÃO] Vai para o Level 3
                this.scene.start('Level3Scene'); 
            });
        }
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

    addGhostPlatform(x, y, width = 200, startDelay = 0) {
        const tileSize = 32;
        const midWidth = width - (tileSize * 2);
        const midCount = Math.max(0, Math.floor(midWidth / tileSize));
        const totalWidth = (tileSize * 2) + (midCount * tileSize);
        const container = this.add.container(x, y);
        const leftTile = this.add.image(0, 0, 'platLeft').setOrigin(0, 0);
        container.add(leftTile);
        for (let i = 0; i < midCount; i++) {
            const midTile = this.add.image(tileSize + (i * tileSize), 0, 'platMid').setOrigin(0, 0);
            container.add(midTile);
        }
        const rightTile = this.add.image(tileSize + (midCount * tileSize), 0, 'platRight').setOrigin(0, 0);
        container.add(rightTile);
        this.physics.add.existing(container, true); 
        const hitHeight = 20; 
        const hitOffset = 35; 
        container.body.setSize(totalWidth, hitHeight);
        container.body.setOffset(32, hitOffset);
        container.body.checkCollision.down = false;
        container.body.checkCollision.left = false;
        container.body.checkCollision.right = false;
        container.body.checkCollision.up = true;
        this.passablePlatforms.add(container);
        container.alpha = 1;
        this.time.delayedCall(startDelay, () => {
            this.time.addEvent({
                delay: 6000, loop: true,
                callback: () => {
                    this.tweens.add({ targets: container, alpha: 1, duration: 500, onStart: () => { if (container.body) container.body.checkCollision.up = true; } });
                    this.time.delayedCall(3500, () => {
                        if (!this.sys) return;
                        this.tweens.add({ targets: container, alpha: 0.2, duration: 100, yoyo: true, repeat: 5, onComplete: () => { container.alpha = 0; if (container.body) container.body.checkCollision.up = false; } });
                    });
                }
            });
        });
    }

    bossAIUpdate() {
        const boss = this.enemies.getFirstAlive();
        if (!boss || !boss.active || boss.isDying || boss.isAttacking || boss.isVulnerable) return;

        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, boss.x, boss.y);
        const distY = Math.abs(this.player.y - boss.y); // Distância vertical (altura)
        
        boss.setFlipX(this.player.x < boss.x);

        // --- INTELIGÊNCIA DA FASE 2 (ENRAGED) ---
        if (boss.isEnraged) {
            
            // 1. PUNIÇÃO DE CURA (O "Estus Punish")
            // Se o jogador tentar curar, o boss quase sempre teleporta nas costas
            if (this.player.playerState === 'HEAL' && Math.random() < 0.8) {
                console.log("Boss detectou cura! Punindo...");
                this.bossTeleportBackstab(boss);
                return;
            }

            // 2. ANTI-CAMPER (Jogador na plataforma)
            // Se o jogador estiver alto demais (distY > 80) ou longe
            if (dist > 250 || distY > 80) {
                // Aumenta chance de 2% para 15% a cada tick (fica muito constante)
                if (Math.random() < 0.15) { 
                    this.bossTeleportBackstab(boss);
                    return;
                }
            }
        }

        // --- COMPORTAMENTO DE MOVIMENTO ---
        // Na fase 2, ele corre mais rápido (380 vs 250)
        if (dist > 250 || (dist > 150 && !boss.canStab)) {
            const speed = boss.isEnraged ? 380 : 250; 
            const dir = boss.flipX ? -1 : 1;
            boss.setVelocityX(dir * speed);
            boss.play('nb_run', true);
        } 
        else {
            boss.setVelocityX(0);
            if (dist > 150 && boss.canStab) {
                this.bossAttackStab(boss);
            } 
            else {
                this.bossAttackCombo(boss);
            }
        }
    }
    bossTeleportBackstab(boss) {
        boss.isAttacking = true;
        boss.setVelocity(0, 0);
        boss.setAlpha(0.5); 
        this.tweens.add({
            targets: boss, alpha: 0, duration: 200,
            onComplete: () => {
                if (!boss.active || boss.isDying || boss.isExecutionPhase) return;
                const offset = this.player.playerFacing === 'right' ? -100 : 100;
                let targetX = this.player.x + offset;
                targetX = Phaser.Math.Clamp(targetX, 50, this.map.widthInPixels - 50);
                boss.setPosition(targetX, this.player.y);
                boss.setFlipX(this.player.x < boss.x); 
                this.tweens.add({
                    targets: boss, alpha: 1, duration: 150,
                    onComplete: () => {
                        if (!boss.active || boss.isDying || boss.isExecutionPhase) return;
                        this.bossAttackStab(boss);
                    }
                });
            }
        });
    }
    bossAttackCombo(boss) {
        boss.isAttacking = true; boss.isGuarding = false; 
        boss.play('nb_attack'); 
        const bossListener = (anim, frame) => {
            if (!boss.isAttacking) return;
            if (anim.key !== 'nb_attack') return;
            if (frame.index >= 9 && frame.index <= 10) this.updateEnemyHitbox(boss, 100, 120, 60, 10);
            else this.enemyHitbox.body.enable = false;
        };
        boss.on('animationupdate', bossListener);
        boss.once('animationcomplete', () => {
            boss.off('animationupdate', bossListener);
            if (!boss.isAttacking) return; 
            const rng = Math.random();
            if (rng < 0.4) this.bossAttackFollowUp(boss);
            else if (rng < 0.8) this.time.delayedCall(200, () => { if(boss.active && boss.isAttacking) this.bossAttackStab(boss); });
            else this.resetBossState(boss);
        });
    }
    bossAttackFollowUp(boss) {
        boss.play('nb_attack_reverse');
        const revListener = (anim, frame) => {
             if (!boss.isAttacking) return;
             if (frame.index >= 2 && frame.index <= 4) this.updateEnemyHitbox(boss, 100, 120, 60, 10);
             else this.enemyHitbox.body.enable = false;
        };
        boss.on('animationupdate', revListener);
        boss.once('animationcomplete', () => {
            boss.off('animationupdate', revListener);
            if (!boss.isAttacking) return;
            this.resetBossState(boss);
        });
    }
    bossAttackStab(boss) {
        boss.canStab = false;
        this.time.delayedCall(5600, () => { if (boss && boss.active) boss.canStab = true; });
        boss.isAttacking = true; boss.isGuarding = false; boss.isUnblockable = true;
        boss.setTint(0xff0000);
        boss.play('nb_stab');
        const stabListener = (anim, frame) => {
            if (!boss.isAttacking) return;
            if (anim.key !== 'nb_stab') return;
            if (frame.index === 4) boss.body.setVelocityX(boss.flipX ? -600 : 600);
            if (frame.index >= 4 && frame.index <= 8) this.updateEnemyHitbox(boss, 120, 40, 70, 25);
            else {
                this.enemyHitbox.body.enable = false;
                if(frame.index > 8) boss.body.setVelocityX(0);
            }
        };
        boss.on('animationupdate', stabListener);
        boss.once('animationcomplete', () => {
            boss.off('animationupdate', stabListener);
            if (!boss.isAttacking) return;
            boss.isUnblockable = false; boss.clearTint();
            this.resetBossState(boss);
        });
    }
    updateEnemyHitbox(boss, w, h, offX, offY) {
        const dir = boss.flipX ? -1 : 1;
        this.enemyHitbox.setPosition(boss.x + (offX * dir), boss.y + offY);
        this.enemyHitbox.body.setSize(w, h);
        this.enemyHitbox.body.enable = true;
    }
    resetBossState(boss) {
        if (!boss.active || boss.isDying || boss.isExecutionPhase) return;
        boss.isAttacking = false; boss.isGuarding = true;
        boss.play('nb_idle');
        this.enemyHitbox.body.enable = false;
    }
    
    createHUD() {
        const margin = 20;
        this.bossHealthBarBG = this.add.rectangle(margin, margin, this.bossBarWidth, 15, 0x000000, 0.5).setOrigin(0).setScrollFactor(0).setVisible(false);
        this.bossHealthBar = this.add.rectangle(margin, margin, this.bossBarWidth, 15, 0xff0000).setOrigin(0).setScrollFactor(0).setVisible(false);
        this.bossLives = [];
        const lifeXStart = margin + this.bossBarWidth + 20;
        for (let i = 0; i < 2; i++) {
            let ball = this.add.circle(lifeXStart + (i * 25), margin + 7, 8, 0xAA0000).setScrollFactor(0).setDepth(10).setVisible(false);
            this.bossLives.push(ball);
        }
        const bottomY = 600 - margin - 15;
        this.playerHealthBarBG = this.add.rectangle(margin, bottomY, this.playerBarWidth, 15, 0x000000, 0.5).setOrigin(0).setScrollFactor(0);
        this.playerHealthBar = this.add.rectangle(margin, bottomY, this.playerBarWidth, 15, 0x00ff00).setOrigin(0).setScrollFactor(0);
        this.playerStaminaBarBG = this.add.rectangle(margin, 600 - margin, this.playerBarWidth, 10, 0x000000, 0.5).setOrigin(0).setScrollFactor(0);
        this.playerStaminaBar = this.add.rectangle(margin, 600 - margin, this.playerBarWidth, 10, 0xffff00).setOrigin(0).setScrollFactor(0);
        this.healChargesText = this.add.text(margin + this.playerBarWidth + 10, bottomY, 'x3', { fontSize: '20px' }).setScrollFactor(0);
    }

    updateHUD() {
        if (!this.player) return;
        this.playerHealthBar.width = (Math.max(0, this.player.health) / this.player.maxHealth) * this.playerBarWidth;
        this.playerStaminaBar.width = (Math.max(0, this.player.stamina) / this.player.maxStamina) * this.playerBarWidth;
        this.healChargesText.setText('x' + this.player.healCharges);
        const boss = this.enemies.getFirstAlive();
        if (boss && this.bossFightStarted && !boss.isDying) {
            this.bossHealthBar.width = (Math.max(0, boss.health) / boss.maxHealth) * this.bossBarWidth;
            for (let i = 0; i < boss.maxLives; i++) {
                this.bossLives[i].setVisible(true);
                if (i < boss.currentLives) {
                    this.bossLives[i].fillColor = 0xAA0000;
                } else {
                    this.bossLives[i].fillColor = 0x444444;
                }
            }
        }
    }

    createSparks(x, y) {
        this.sparkEmitter.setParticleTint(0xffff00);
        this.sparkEmitter.explode(8, x, y);
    }

    shutdownCleanup() {
        this.input.keyboard.removeAllListeners();
        this.time.removeAllEvents();
    }

    createAnimations() {
        if (this.anims.exists('nb_idle')) return;
        this.anims.create({ key: 'nb_idle', frames: this.anims.generateFrameNumbers('nightborneSheet', { start: 0, end: 8 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'nb_run', frames: this.anims.generateFrameNumbers('nightborneSheet', { start: 23, end: 28 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'nb_attack', frames: this.anims.generateFrameNumbers('nightborneSheet', { start: 46, end: 57 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'nb_attack_reverse', frames: this.anims.generateFrameNumbers('nightborneSheet', { start: 126, end: 115 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'nb_stab', frames: this.anims.generateFrameNumbers('nightborneSheet', { start: 138, end: 146 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'nb_hurt', frames: this.anims.generateFrameNumbers('nightborneSheet', { start: 69, end: 73 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'nb_death', frames: this.anims.generateFrameNumbers('nightborneSheet', { start: 92, end: 100 }), frameRate: 10, repeat: 0 });
    }
}