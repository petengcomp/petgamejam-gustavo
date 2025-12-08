// Arquivo: src/scenes/Level3Scene.js
// LEVEL 3 (BOSS): Akane, a Sombra (Refatorado v3 - Super Armor & Anti-Stunlock)

const BOSS_STATE = {
    INTRO: 'INTRO',
    IDLE: 'IDLE',
    CHASE: 'CHASE',
    ATTACKING: 'ATTACKING',
    HURT: 'HURT',
    DYING: 'DYING',
    DEAD: 'DEAD'
};

class Level3Scene extends Phaser.Scene {

    constructor() {
        super({ key: 'Level3Scene' });
        
        // Entidades
        this.player = null;
        this.boss = null;
        this.enemies = null; 
        this.projectiles = null;

        // Flags de Controle
        this.gameOver = false;
        this.bossFightStarted = false;
        this.bossIntroPlayed = false;
        
        // Mapa
        this.map = null;
        this.groundLayer = null;
        this.detalhesLayer = null;
        this.passablePlatforms = null;
        this.playerEnemyCollider = null;

        // Inputs
        this.keyR = null;
        this.keyF = null;

        // HUD
        this.playerBarWidth = 200;
        this.bossBarWidth = 300;
        this.bossLives = [];
        this.bossHealthBar = null;
        this.bossHealthBarBG = null;

        // Efeitos e Timers
        this.sparkEmitter = null;
        this.decisionTimer = 0;
        this.entranceEvent = null;
    }

    preload() {
        if (typeof Player !== 'undefined') {
            Player.preload(this);
        }

        this.load.tilemapTiledJSON('level3MapKey', 'assets/maps/level2.json'); 
        
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

        const bgBasePath = 'assets/images/mundo/GandalfHardcore Background layers/Autumn BG/';
        this.load.image('bg1Img', bgBasePath + 'back1.png');
        this.load.image('bg2Img', bgBasePath + 'back2.png');
        
        this.load.spritesheet('akaneSheet', 'assets/images/bladekeeper.png', { frameWidth: 288, frameHeight: 128 });
        this.load.image('kunai', 'assets/images/projectile_throw.png');

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
            this.map = this.make.tilemap({ key: 'level3MapKey' });
            
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

            const tintColor = 0x444488; 

            const layer2 = this.map.createLayer('fundo/layer2', allTilesets, 0, 0);
            if (layer2) layer2.setScrollFactor(1).setTint(tintColor);
            
            const layer1 = this.map.createLayer('fundo/layer1', allTilesets, 0, 0);
            if (layer1) layer1.setScrollFactor(1).setTint(tintColor);
            
            this.groundLayer = this.map.createLayer('ChaoSolido', allTilesets, 0, 0);
            this.groundLayer.setCollisionByProperty({ collides: true });
            this.groundLayer.setTint(0xaaaaaa);

            this.detalhesLayer = this.map.createLayer('Detalhes', allTilesets, 0, 0);
            this.detalhesLayer.setTint(0xaaaaaa);

            this.passablePlatforms = this.physics.add.staticGroup();
            this.addGhostPlatform(400, 450, 200, 0);
            this.addGhostPlatform(1100, 400, 200, 0);
            this.addGhostPlatform(1600, 300, 200, 3000);

            // --- JOGADOR ---
            this.player = new Player(this, 40, 450); 
            this.player.health = this.player.maxHealth;
            this.player.healCharges = 3;

            // --- BOSS (AKANE) ---
            this.enemies = this.physics.add.group();
            this.boss = this.enemies.create(1000, 200, 'akaneSheet');
            this.boss.setScale(2.0); 
            this.boss.setImmovable(true);
            this.boss.setCollideWorldBounds(true);
            this.boss.body.setSize(35, 40);
            this.boss.body.setOffset(128, 87);
            this.ghosts = this.add.group();
            
            this.boss.name = "Akane";
            this.boss.health = 230; 
            this.boss.maxHealth = 230; 
            this.boss.currentLives = 2; 
            this.boss.maxLives = 2; 
            this.boss.isEnraged = false;
            this.boss.state = BOSS_STATE.INTRO; 

            this.projectiles = this.physics.add.group({ defaultKey: 'kunai', maxSize: 10 });

            // --- COLISÕES ---
            this.physics.add.collider(this.player, this.groundLayer);
            this.physics.add.collider(this.player, this.passablePlatforms);
            this.physics.add.collider(this.enemies, this.groundLayer);
            this.physics.add.collider(this.enemies, this.passablePlatforms);
            
            this.physics.add.overlap(this.projectiles, this.player, this.handleProjectileHitPlayer, null, this);
            this.physics.add.collider(this.projectiles, this.groundLayer, (proj) => { proj.destroy(); });

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
            this.boss.play('ak_idle');    

            // --- CÂMERA E UI ---
            this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
            this.cameras.main.startFollow(this.player, true, 1, 1);
            this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

            const cx = this.cameras.main.width / 2;
            const cy = this.cameras.main.height / 2;
            this.winText = this.add.text(cx, cy - 50, 'JOGO ZERADO', { fontSize: '48px', fill: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setVisible(false).setScrollFactor(0).setDepth(100);
            this.restartText = this.add.text(cx, cy + 50, 'Pressione R para Reiniciar', { fontSize: '24px', fill: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setVisible(false).setScrollFactor(0).setDepth(100);

            this.createHUD();

            this.keyR = this.input.keyboard.addKey('R');
            this.keyF = this.input.keyboard.addKey('F');
            
            this.sparkEmitter = this.add.particles(0, 0, 'sparkle_tex', {
                lifespan: 300, speed: { min: 150, max: 350 }, scale: { start: 1.5, end: 0 }, alpha: { start: 1, end: 0 }, gravityY: 600, blendMode: 'ADD', emitting: false
            });
            
            this.startLevelEntrance();
            
            this.events.on('shutdown', this.shutdownCleanup, this);

        } catch (error) { 
            console.error("Level 3 Create Error:", error); 
        }
    }

    update(time, delta) {
        if (this.gameOver && Phaser.Input.Keyboard.JustDown(this.keyR)) {
            this.scene.restart();
            return;
        }
        if (this.gameOver) return;

        if (this.player && this.player.active) {
            this.player.update(time, delta);
            
            if (Phaser.Input.Keyboard.JustDown(this.keyF)) {
                this.handleDoorInteraction();
            }

            // Desativa colisão física se Player usa Dash ou Boss usa Roll (Evita empurrão)
            const isBossRolling = (this.boss && this.boss.active && this.boss.anims.currentAnim && this.boss.anims.currentAnim.key === 'ak_roll');
            if (this.player.playerState === 'DASH' || isBossRolling) {
                if (this.playerEnemyCollider.active) this.playerEnemyCollider.active = false;
            } else {
                if (!this.playerEnemyCollider.active) this.playerEnemyCollider.active = true;
            }
        }

        this.updateHUD();

        if (this.boss && this.boss.active && !this.bossFightStarted) {
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y) <= 400 && !this.bossIntroPlayed) {
                this.triggerBossIntro();
            }
        } else if (this.boss && this.boss.active && this.bossFightStarted) {
            this.updateBossBehavior(time, delta);
            if (Math.abs(this.boss.body.velocity.x) > 200) {
                this.createGhostEffect(this.boss, time);
            }
        }
    }

    updateBossBehavior(time, delta) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
        
        // Só vira para o jogador se não estiver travada em ação
        if (this.boss.state !== BOSS_STATE.ATTACKING && this.boss.state !== BOSS_STATE.HURT && this.boss.state !== BOSS_STATE.DYING) {
            this.boss.setFlipX(this.player.x < this.boss.x);
        }

        switch (this.boss.state) {
            case BOSS_STATE.IDLE:
                this.boss.setVelocityX(0);
                this.decisionTimer -= delta;
                if (this.decisionTimer <= 0) {
                    this.decideNextMove(dist);
                }
                break;

            case BOSS_STATE.CHASE:
                const speed = this.boss.isEnraged ? 450 : 300;
                const dir = this.boss.flipX ? -1 : 1;
                
                if (this.boss.anims.currentAnim?.key !== 'ak_run') {
                    this.boss.play('ak_run', true);
                }
                this.boss.setVelocityX(dir * speed);

                if (dist < 120) { 
                    this.setBossState(BOSS_STATE.IDLE);
                    this.decisionTimer = 0; // Ataca imediatamente
                } else if (dist > 600) { 
                    this.setBossState(BOSS_STATE.IDLE);
                }
                break;

            case BOSS_STATE.ATTACKING:
            case BOSS_STATE.HURT:
            case BOSS_STATE.DYING:
                // Se for Roll ou Trap, mantém velocidade. Se for ataque parado, zera.
                const isMovingAnim = this.boss.anims.currentAnim && (this.boss.anims.currentAnim.key === 'ak_roll' || this.boss.anims.currentAnim.key === 'ak_trap');
                if (!isMovingAnim) {
                     this.boss.setVelocityX(0);
                }
                break;
        }
    }

    setBossState(newState) {
        // Limpeza de listeners antigos para evitar bugs de animação
        this.boss.off('animationupdate');
        this.boss.off('animationcomplete');
        this.enemyHitbox.body.enable = false;

        this.boss.state = newState;

        if (newState === BOSS_STATE.IDLE) {
            this.boss.play('ak_idle', true);
            this.boss.setVelocityX(0);
            this.decisionTimer = this.boss.isEnraged ? 200 : 500;
        }
    }

    decideNextMove(dist) {
        // --- IA FASE 2 ---
        if (this.boss.isEnraged) {
            if (this.player.playerState === 'HEAL' && Math.random() < 0.8) {
                this.performRoll();
                return;
            }
            if (dist < 280 && Math.random() < 0.2) {
                this.performSkill();
                return;
            }
        }

        // --- DISTÂNCIAS ---
        if (dist < 130) {
            // Muito perto: Chance alta de TRAP (Recuar)
            if (Math.random() < 0.6) this.performBackDodge();
            else this.performCombo();
        } 
        else if (dist < 220) {
            // Combate
            const rollChance = this.boss.isEnraged ? 0.5 : 0.3;

            if (Math.random() < rollChance) {
                this.performRoll();
            } else {
                this.performCombo();
            }
        } 
        else if (dist > 350) {
            // Longe
            const rng = Math.random();
            if (rng < 0.4) this.performThrowProjectile();
            else if (rng < 0.6) this.performRoll(); // 
            else this.setBossState(BOSS_STATE.CHASE);
        } 
        else {
            this.setBossState(BOSS_STATE.CHASE);
        }
    }

    // --- AÇÕES DE COMBATE ---

    performBackDodge() {
        this.setBossState(BOSS_STATE.ATTACKING);
        this.boss.play('ak_trap');
        
        // Recua para longe (oposto do flipX)
        const dir = this.boss.flipX ? -1 : 1; 
        this.boss.setVelocityX(-dir * 600); 

        this.boss.once('animationcomplete', (anim) => {
            if (anim.key !== 'ak_trap') return;
            if (!this.boss.active) return;
            this.performThrowProjectile(); // Combo: Recua -> Kunai
        });
    }

    performRoll() {
        this.setBossState(BOSS_STATE.ATTACKING);
        this.boss.play('ak_roll');
        
        this.boss.alpha = 0.5; 
        const dir = this.boss.flipX ? -1 : 1;
        this.boss.setVelocityX(dir * 600); // Avança

        this.boss.once('animationcomplete', (anim) => {
            if (anim.key !== 'ak_roll') return;
            if (!this.boss.active) return;
            this.boss.alpha = 1;
            this.boss.setVelocityX(0);
            this.setBossState(BOSS_STATE.IDLE);
        });
    }

    createGhostEffect(source, time) { 
        if (time < (this.lastGhostTime || 0) + 50) return;
        this.lastGhostTime = time;

        const ghost = this.add.image(source.x, source.y, 'akaneSheet', source.frame.name);
        ghost.setTint(0xaa00ff); 
        ghost.setAlpha(0.5);
        ghost.setFlipX(source.flipX);
        ghost.setScale(source.scaleX, source.scaleY);
        ghost.setDepth(source.depth - 1); 
        
        this.tweens.add({
            targets: ghost,
            alpha: 0,
            duration: 400,
            onComplete: () => ghost.destroy()
        });
    }

    performThrowProjectile() {
        this.setBossState(BOSS_STATE.ATTACKING);
        this.boss.setVelocityX(0);
        this.boss.play('ak_throw');

        this.time.delayedCall(300, () => {
            if (!this.boss || !this.boss.active || this.boss.state !== BOSS_STATE.ATTACKING) return;
            const proj = this.projectiles.create(this.boss.x, this.boss.y + 70, 'kunai');
            if (proj) {
                const dir = this.boss.flipX ? -1 : 1;
                proj.setVelocityX(dir * 700);
                proj.setFlipX(this.boss.flipX);
                proj.body.allowGravity = false;
                this.time.delayedCall(1500, () => { if (proj.active) proj.destroy(); });
            }
        });

        this.boss.once('animationcomplete', (anim) => {
            if (anim.key !== 'ak_throw') return;
            if (!this.boss.active) return;
            this.setBossState(BOSS_STATE.IDLE);
        });
    }

    performCombo() {
        this.setBossState(BOSS_STATE.ATTACKING);
        this.boss.setVelocityX(0);

        const rng = Math.random();
        let comboLength = 1;

        if (this.boss.isEnraged) {
            if (rng < 0.1) comboLength = 1; 
            else if (rng < 0.3) comboLength = 2; 
            else comboLength = 3;
        } else {
            if (rng < 0.2) comboLength = 1; 
            else if (rng < 0.6) comboLength = 2; 
            else comboLength = 3;
        }

        this.playComboHit(1, comboLength);
    }

    playComboHit(currentHit, maxHits) {
        if (!this.boss.active || this.boss.state === BOSS_STATE.HURT) return;

        let animKey = '';
        if (currentHit === 1) animKey = 'ak_attack';
        else if (currentHit === 2) animKey = 'ak_attack_2';
        else if (currentHit === 3) animKey = 'ak_attack_3';

        this.boss.play(animKey);
        
        const dir = this.boss.flipX ? -1 : 1;
        this.boss.x += dir * 15; // Leve avanço

        const hitListener = (anim, frame) => {
            if (anim.key !== animKey) return;
            if (frame.index >= 2 && frame.index <= 4) {
                const width = (currentHit === 3) ? 120 : 100;
                this.updateEnemyHitbox(this.boss, width, 40, 60, 80);
            } else {
                this.enemyHitbox.body.enable = false;
            }
        };

        this.boss.on('animationupdate', hitListener);

        this.boss.once('animationcomplete', (anim) => {
            if (anim.key !== animKey) return;
            this.boss.off('animationupdate', hitListener);
            this.enemyHitbox.body.enable = false;

            if (currentHit < maxHits && this.boss.active && this.boss.state === BOSS_STATE.ATTACKING) {
                this.playComboHit(currentHit + 1, maxHits);
            } else {
                this.setBossState(BOSS_STATE.IDLE);
            }
        });
    }

    performSkill() {
        this.setBossState(BOSS_STATE.ATTACKING);
        this.boss.setVelocityX(0);
        
        // 1. Cor de Perigo (Vermelho Absoluto igual Nightborne)
        this.boss.setTint(0xff0000); 

        // 2. Efeito de "Câmera Lenta" / Delay
        // O frameRate padrão é 15. Usando 8, o golpe demora muito mais para sair (Telegraph),
        // dando tempo do jogador ver o vermelho e fugir.
        this.boss.play({ key: 'ak_skill', frameRate: 8 });

        const skillListener = (anim, frame) => {
            if (anim.key !== 'ak_skill') return;
            
            // A hitbox continua nos mesmos frames (4 a 8), 
            // mas como o FPS está baixo, esses frames demoram mais para chegar.
            if (frame.index >= 4 && frame.index <= 8) {
                this.updateEnemyHitbox(this.boss, 380, 120, 20, 65);
            } else {
                this.enemyHitbox.body.enable = false;
            }
        };

        this.boss.on('animationupdate', skillListener);

        this.boss.once('animationcomplete', (anim) => {
            if (anim.key !== 'ak_skill') return;
            this.boss.off('animationupdate', skillListener);
            this.boss.clearTint();
            this.setBossState(BOSS_STATE.IDLE);
        });
    }

    updateEnemyHitbox(boss, w, h, offX, offY) {
        const dir = boss.flipX ? -1 : 1;
        this.enemyHitbox.setPosition(boss.x + (offX * dir), boss.y + offY);
        this.enemyHitbox.body.setSize(w, h);
        this.enemyHitbox.body.enable = true;
    }


    handleAttackHitEnemy(hitbox, enemy) {
        if (this.player.enemiesHitThisAttack.includes(enemy)) return;
        if (!hitbox.body.enable) return;

        // 1. Chance de Esquiva Preventiva (Antes de tomar dano)
        // Só esquiva se estiver "de bobeira" (Idle ou Chase)
        if (enemy.state === BOSS_STATE.IDLE || enemy.state === BOSS_STATE.CHASE) {
            if (Math.random() < 0.4) { // 40% de chance
                this.showFloatingText(enemy.x, enemy.y - 60, "Lento!", 1000);
                this.performRoll();
                return; // Sai da função sem tomar dano
            }
        }

        // 2. Aplicação do Dano (Comum a todos os casos)
        this.player.enemiesHitThisAttack.push(enemy);
        this.hitStop(50);
        this.cameras.main.shake(100, 0.01);

        let damage = 20;
        if (this.player.currentAttackAnim === 'specialAttack') damage = 40;
        
        // Se for Combo Breaker (já está em Hurt), recebe menos dano no segundo hit
        if (enemy.state === BOSS_STATE.HURT) damage = 10; 

        enemy.health -= damage;
        this.updateHUD(); // Atualiza a barra visualmente

        // 3. Checagem de Morte / Mudança de Fase (PRIORIDADE MÁXIMA)
        // Isso agora roda ANTES de decidir se ela tem Super Armor ou não
        if (enemy.health <= 0) {
            if (enemy.currentLives > 1) {
                // --- FASE 2 ---
                enemy.currentLives--;
                enemy.health = enemy.maxHealth;
                enemy.isEnraged = true;
                this.updateHUD();
                
                this.cameras.main.flash(500, 255, 0, 0);
                this.showFloatingText(enemy.x, enemy.y - 60, "AGORA É SÉRIO!", 2000);
                const dir = (this.player.x < enemy.x) ? -1 : 1;
                this.player.setVelocityX(dir * 500); // Joga o player pra longe
                this.player.setVelocityY(-200);      // Um leve pulinho
                this.player.playerState = 'HURT';    // Trava o player brevemente
                this.time.delayedCall(300, () => { if(this.player.active) this.player.playerState = 'IDLE'; });
                
                // Reseta IA
                this.setBossState(BOSS_STATE.IDLE); 
                this.performRoll(); // Foge para reiniciar
                return;
            } else {
                // --- MORTE ---
                this.killBoss(enemy);
                return;
            }
        }

        // 4. Reações ao Dano (Se ainda estiver viva)

        // A. Super Armor (Se estiver atacando, ignora Stun)
        if (enemy.state === BOSS_STATE.ATTACKING) {
            enemy.setTint(0xffaaaa); // Feedback visual
            this.time.delayedCall(100, () => { if(enemy.active) enemy.clearTint(); });
            this.createSparks(enemy.x, enemy.y);
            return; // Não interrompe o ataque!
        }

        // B. Combo Breaker (Se tomou o segundo hit seguido)
        if (enemy.state === BOSS_STATE.HURT) {
             this.showFloatingText(enemy.x, enemy.y - 50, "!", 500);
             this.performBackDodge(); // Foge imediatamente
             return;
        }

        // C. Stun Normal (Interrompe e toca animação de dor)
        this.setBossState(BOSS_STATE.HURT);
        enemy.play('ak_hurt');
        
        enemy.once('animationcomplete', (anim) => {
            if (anim.key !== 'ak_hurt') return;
            // Só recupera se não tiver morrido nesse meio tempo
            if (enemy.state !== BOSS_STATE.DYING && enemy.state !== BOSS_STATE.DEAD) {
                this.performRoll(); // Recupera rolando
            }
        });
    }

    handleProjectileHitPlayer(player, proj) {
        proj.destroy();
        if (this.player.isParrying) {
            this.player.parrySucceeded = true;
            this.hitStop(100);
            this.createSparks(player.x, player.y);
            if (this.boss && this.boss.active) this.performRoll();
            return;
        }
        this.takeDamage(15, proj);
    }

    handlePlayerHitByEnemy(player, enemy) {
        if (this.player.playerInvulnerable || this.player.playerState === 'DASH') return;
        
        let damage = 15; 
        if (enemy.isEnraged) damage = 25;

        if (this.player.isParrying) {
            this.player.parrySucceeded = true;
            this.hitStop(100);
            this.createSparks(player.x, player.y);
            this.performRoll();
            return;
        }

        this.takeDamage(damage, enemy);
    }

    handlePlayerBumpEnemy(player, enemy) {
        if (this.player.playerState === 'DASH') return;
        const distanceX = Math.abs(player.x - enemy.x);
        if (distanceX > 30) return; 
        this.takeDamage(5, enemy);
    }

    takeDamage(amount, source) {
        if (this.player.playerInvulnerable || this.gameOver) return;
        
        this.player.health -= amount;
        this.updateHUD();
        this.cameras.main.shake(100, 0.01);
        this.player.clearAttackState();
        
        if (this.player.health <= 0) {
            this.killPlayer();
            return;
        }

        this.player.playerState = 'HURT';
        this.player.playerInvulnerable = true;
        this.player.play('hurt');
        
        const dir = (source.x < this.player.x) ? 1 : -1;
        this.player.setVelocity(dir * 300, -200);
        
        this.player.once('animationcomplete', () => {
            this.player.playerState = 'IDLE';
            this.time.delayedCall(500, () => {
                this.player.playerInvulnerable = false;
                if(this.player.active) this.player.setAlpha(1);
            });
        });

        this.tweens.add({ 
            targets: this.player, alpha: 0.2, duration: 100, repeat: 5, yoyo: true,
            onComplete: () => { this.player.alpha = 1; }
        });
    }

    // --- CENA ---

    triggerBossIntro() {
        this.bossIntroPlayed = true;
        this.bossFightStarted = true; 
        
        this.player.playerState = 'CUTSCENE';
        this.player.setVelocity(0, 0);
        this.player.anims.play('idle', true);
        
        this.cameras.main.stopFollow();
        this.cameras.main.pan(this.boss.x, this.boss.y, 1500, 'Power2');
        this.cameras.main.zoomTo(1.3, 1500, 'Power2');
        this.boss.setFlipX(this.player.x < this.boss.x);

        this.time.delayedCall(1500, () => {
            this.cameras.main.shake(200, 0.005);
            this.player.setTint(0xddbbff); 
            
            const bossName = this.add.text(this.boss.x, this.boss.y - 80, "AKANE, A SOMBRA", { 
                fontSize: '32px', fontFamily: 'Georgia', fill: '#aa00ff', stroke: '#000', strokeThickness: 4 
            }).setOrigin(0.5).setAlpha(0);
            
            this.tweens.add({ targets: bossName, alpha: 1, duration: 1000, yoyo: true, hold: 1500 });
            
            this.time.delayedCall(1000, () => { 
                this.showFloatingText(this.player.x, this.player.y - 60, "Tão rápida...", 2000); 
            });
            
            this.boss.play('ak_trap'); 
            
            this.time.delayedCall(2500, () => {
                this.player.clearTint(); 
                this.cameras.main.zoomTo(1, 500, 'Power2');
                this.cameras.main.startFollow(this.player, true, 1, 1);
                
                this.bossHealthBarBG.setVisible(true);
                this.bossHealthBar.setVisible(true);
                this.bossLives.forEach(ball => ball.setVisible(true));
                this.setBossState(BOSS_STATE.IDLE);
                
                if (this.player.active) this.player.playerState = 'IDLE'; 
            });
        }, [], this);
    }

    killBoss(enemy) {
        this.setBossState(BOSS_STATE.DYING);
        
        enemy.body.enable = false;
        this.enemyHitbox.body.enable = false;
        enemy.play('ak_death');
        
        // 1. Inicia a animação de Parry
        this.player.play({ key: 'parry', frameRate: 8, repeat: 0 }, true);
        
        // 2. [CORREÇÃO] Congela o Player no frame exato (espada levantada)
        const freezeParry = (anim, frame) => {
            if (anim.key === 'parry' && frame.index === 3) {
                this.player.anims.pause(); // Congela aqui
                this.player.off('animationupdate', freezeParry); // Remove o listener
            }
        };
        this.player.on('animationupdate', freezeParry);
        
        // UI
        this.bossHealthBar.setVisible(false); 
        this.bossHealthBarBG.setVisible(false);
        if (this.bossLives) this.bossLives.forEach(ball => ball.setVisible(false));
        
        enemy.once('animationcomplete', () => { 
            enemy.state = BOSS_STATE.DEAD;
            this.startSoulAbsorption(enemy); 
        });
    }

    startSoulAbsorption(boss) {
        // Oculta o boss suavemente enquanto as partículas saem
        this.tweens.add({ targets: boss, alpha: 0, duration: 1500, ease: 'Power2', onComplete: () => { boss.destroy(); } });
        
        // Efeito visual no player (Tint roxo)
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
                
                // [AJUSTE VISUAL]
                // spawnX: Espalha um pouco mais horizontalmente já que ela está deitada
                const spawnX = boss.x + Phaser.Math.Between(-50, 50); 
                
                // spawnY: Baixado para (30 a 50) para sair do CHÃO, onde está o corpo
                const spawnY = boss.y + Phaser.Math.Between(100, 120); 

                const part = soulParticles.get(spawnX, spawnY);
                if (part) {
                    part.setActive(true).setVisible(true); 
                    part.setScale(Phaser.Math.FloatBetween(1.5, 2.5)); 
                    part.setTint(0x8800ff); 
                    
                    const startPoint = new Phaser.Math.Vector2(spawnX, spawnY);
                    const swordOffset = this.player.flipX ? -25 : 25;
                    const endPoint = new Phaser.Math.Vector2(this.player.x + swordOffset, this.player.y + 10);
                    
                    // Curva da alma
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

        // Sequência Final (Texto e Transição)
        this.time.delayedCall(2000, () => {
             this.player.anims.resume(); 
             this.player.playerState = 'IDLE';
             this.cameras.main.zoomTo(1, 500, 'Power2');
             
             this.player.health = this.player.maxHealth; 
             this.player.healCharges = 3; 
             this.updateHUD(); 
             
             const tipText = this.add.text(this.player.x, this.player.y - 80, "Sombra Dispersada.", { 
                 fontSize: '18px', fontFamily: 'Georgia', fill: '#fff', stroke: '#000', strokeThickness: 2 
             }).setOrigin(0.5);
             
             this.tweens.add({ targets: tipText, alpha: 0, duration: 3000, delay: 2000, onComplete: () => tipText.destroy() });
        });
    }

    killPlayer() {
        this.gameOver = true;
        this.player.clearAttackState();
        this.player.play('death');
        this.physics.pause();
        this.restartText.setVisible(true);
        this.winText.setText("VOCÊ MORREU");
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

    createSparks(x, y) {
        this.sparkEmitter.setParticleTint(0xffff00);
        this.sparkEmitter.explode(8, x, y);
    }

    showFloatingText(x, y, message, duration) {
        const text = this.add.text(x, y, message, { 
            fontSize: '14px', fontFamily: 'Arial', fontStyle: 'italic', 
            fill: '#cccccc', stroke: '#000000', strokeThickness: 2 
        }).setOrigin(0.5).setAlpha(0).setDepth(90);
        
        this.tweens.add({ 
            targets: text, y: y - 30, alpha: { from: 0, to: 1 }, duration: duration / 2, yoyo: true, hold: 500, 
            onComplete: () => text.destroy() 
        });
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
                    
                    if (this.entranceEvent) this.entranceEvent.remove();

                    this.time.delayedCall(500, () => {
                        this.showFloatingText(this.player.x, this.player.y - 60, "O topo está próximo...", 2000);
                    });
                }
            }
        });
    }

    handleDoorInteraction() {
        // 1. Segurança: Verifica se o Boss ainda está vivo
        const activeEnemies = this.enemies.getChildren().filter(e => e.active && !e.isDying && e.state !== BOSS_STATE.DEAD);
        
        if (activeEnemies.length > 0) {
            const warning = this.add.text(this.player.x, this.player.y - 50, "Derrote a Sombra!", { 
                fontSize: '16px', fill: '#ff0000', stroke: '#000', strokeThickness: 3 
            }).setOrigin(0.5);
            this.tweens.add({ targets: warning, y: warning.y - 30, alpha: 0, duration: 1000, onComplete: () => warning.destroy() });
            return;
        }

        if (!this.detalhesLayer) return;

        // 2. Verifica se o player está encostando em um tile com a propriedade 'door'
        const tiles = this.detalhesLayer.getTilesWithinWorldXY(this.player.body.x, this.player.body.y, this.player.body.width, this.player.body.height);
        const doorTile = tiles.find(tile => tile.properties && tile.properties.door);

        if (doorTile) {
            this.player.setVelocity(0, 0);
            this.player.playerState = 'CUTSCENE'; 
            this.player.anims.play('idle');
            
            this.cameras.main.fade(1000, 0, 0, 0);
            
            const endText = this.add.text(this.cameras.main.midPoint.x, this.cameras.main.midPoint.y, "Caminho Aberto...", { 
                fontSize: '40px', fontFamily: 'Georgia', fill: '#fff', fontStyle: 'italic' 
            }).setOrigin(0.5).setAlpha(0).setDepth(200);
            
            this.tweens.add({ targets: endText, alpha: 1, duration: 1000 });

            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                // Reinicia a cena (Placeholder para Level 4)
                this.scene.start('Level4Scene'); 
            });
        }
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
        const hitHeight = 20; const hitOffset = 35;
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
                delay: 6000, loop: true, callback: () => {
                    this.tweens.add({ 
                        targets: container, alpha: 1, duration: 500, 
                        onStart: () => { if (container.body) container.body.checkCollision.up = true; } 
                    });
                    this.time.delayedCall(3500, () => {
                        if (!this.sys) return;
                        this.tweens.add({ 
                            targets: container, alpha: 0.2, duration: 100, yoyo: true, repeat: 5, 
                            onComplete: () => { 
                                container.alpha = 0; 
                                if (container.body) container.body.checkCollision.up = false; 
                            } 
                        });
                    });
                }
            });
        });
    }

    createAnimations() {
        if (this.anims.exists('ak_idle')) return;
        const cols = 20; 
        this.anims.create({ key: 'ak_idle', frames: this.anims.generateFrameNumbers('akaneSheet', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'ak_run', frames: this.anims.generateFrameNumbers('akaneSheet', { start: cols * 1, end: cols * 1 + 7 }), frameRate: 15, repeat: -1 });
        this.anims.create({ key: 'ak_roll', frames: this.anims.generateFrameNumbers('akaneSheet', { start: cols * 6, end: cols * 6 + 6 }), frameRate: 20, repeat: 0 });
        this.anims.create({ key: 'ak_trap', frames: this.anims.generateFrameNumbers('akaneSheet', { start: cols * 8, end: cols * 8 + 9 }), frameRate: 20, repeat: 0 }); 
        this.anims.create({ key: 'ak_throw', frames: this.anims.generateFrameNumbers('akaneSheet', { start: cols * 7, end: cols * 7 + 6 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'ak_attack', frames: this.anims.generateFrameNumbers('akaneSheet', { start: cols * 9, end: cols * 9 + 5 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'ak_attack_2', frames: this.anims.generateFrameNumbers('akaneSheet', { start: cols * 10, end: cols * 10 + 7 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'ak_attack_3', frames: this.anims.generateFrameNumbers('akaneSheet', { start: cols * 11, end: cols * 11 + 17 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'ak_skill', frames: this.anims.generateFrameNumbers('akaneSheet', { start: cols * 12, end: cols * 12 + 10 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'ak_hurt', frames: this.anims.generateFrameNumbers('akaneSheet', { start: cols * 14, end: cols * 14 + 5 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'ak_death', frames: this.anims.generateFrameNumbers('akaneSheet', { start: cols * 15, end: cols * 15 + 11 }), frameRate: 10, repeat: 0 });
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
        
        if (this.boss && this.bossFightStarted && this.boss.state !== BOSS_STATE.DEAD && this.boss.state !== BOSS_STATE.DYING) {
            this.bossHealthBar.width = (Math.max(0, this.boss.health) / this.boss.maxHealth) * this.bossBarWidth;
            for (let i = 0; i < this.boss.maxLives; i++) {
                this.bossLives[i].setVisible(true);
                this.bossLives[i].fillColor = (i < this.boss.currentLives) ? 0xAA0000 : 0x444444;
            }
        }
    }

    shutdownCleanup() {
        this.input.keyboard.removeAllListeners();
        this.time.removeAllEvents();
    }
}