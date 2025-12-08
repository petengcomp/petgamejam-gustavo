// Arquivo: src/scenes/Level4Scene.js
// LEVEL 4 (FINAL): O Eco do Mestre (Ronin)
// Correções: HUD completo, Lógica de Fase do Especial e RESTART (R) habilitado.

const RONIN_STATE = {
    INTRO: 'INTRO',
    IDLE: 'IDLE',
    CHASE: 'CHASE',
    ATTACKING: 'ATTACKING',
    DEFEND: 'DEFEND',
    DASHING: 'DASHING',
    HURT: 'HURT',
    WAITING_EXECUTION: 'WAITING_EXECUTION', // Boss ajoelhado (Plot Twist)
    EXECUTED: 'EXECUTED', 
    DEAD: 'DEAD'
};

class Level4Scene extends Phaser.Scene {

    constructor() {
        super({ key: 'Level4Scene' });
        
        // Entidades
        this.player = null;
        this.boss = null;
        this.enemies = null;
        
        // Flags
        this.gameOver = false;
        this.bossFightStarted = false;
        this.bossIntroPlayed = false;
        this.isFlashbackSequence = false;
        this.bossAIEnabled = true;

        // Mapa
        this.map = null;
        this.groundLayer = null;
        this.detalhesLayer = null;
        this.ladoForaLayer = null;
        this.passablePlatforms = null;
        this.backgroundLayers = []; 
        this.playerEnemyCollider = null;

        // UI e Vidas
        this.bossBarWidth = 300;
        this.playerBarWidth = 200;
        this.bossHealthBar = null;
        this.bossHealthBarBG = null;
        this.bossNameText = null;
        this.bossLives = []; 
        this.restartText = null; // [NOVO] Texto de reiniciar

        // HUD Player
        this.playerStaminaBar = null;
        this.playerStaminaBarBG = null;
        this.healChargesText = null;

        // Input
        this.keyR = null; // [NOVO] Tecla R

        // Efeitos
        this.rainParticles = null;
        this.sparkEmitter = null;
        this.decisionTimer = 0;
        this.entranceEvent = null;
    }

    preload() {
        if (typeof Player !== 'undefined') {
            Player.preload(this);
        }

        this.load.tilemapTiledJSON('level4MapKey', 'assets/maps/level4.json'); 
        
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
        this.load.image('bg5Img', 'assets/images/mundo/GandalfHardcore Background layers/Autumn BG/back5.png');

        this.load.spritesheet('roninSheet', 'assets/images/ronin.png', { frameWidth: 288, frameHeight: 128 });

        let graphics = this.add.graphics();
        graphics.fillStyle(0xffffff, 1); graphics.fillRect(0, 0, 8, 8);
        graphics.generateTexture('sparkle_tex', 8, 8); graphics.destroy();
    }

    create() {
        try {
            this.gameOver = false;
            this.bossFightStarted = false;
            this.bossIntroPlayed = false;
            this.isFlashbackSequence = false;
            this.bossAIEnabled = true;

            // --- 1. MAPA ---
            this.createMap();

            // --- 2. JOGADOR ---
            this.player = new Player(this, 40, 450); 
            this.player.health = this.player.maxHealth;
            this.player.healCharges = 3;

            // --- 3. BOSS (RONIN) ---
            this.enemies = this.physics.add.group();
            this.boss = this.enemies.create(1000, 200, 'roninSheet');
            
            this.boss.setScale(2.0); 
            this.boss.setImmovable(true);
            this.boss.setCollideWorldBounds(true);
            this.boss.body.setSize(30, 45); 
            this.boss.body.setOffset(129, 83); 

            this.boss.name = "Mestre Jubei";
            this.boss.state = RONIN_STATE.INTRO;

            // --- SISTEMA DE 3 VIDAS ---
            this.boss.maxLives = 3;
            this.boss.currentLives = 3;
            this.boss.maxHealth = 230; 
            this.boss.health = this.boss.maxHealth;
            
            // Variáveis de Controle de Combate
            this.boss.lastAtk3Time = 0;
            this.boss.hitsTakenDuringAtk3 = 0;
            this.boss.lastSpecialTime = -10000;

            // --- 4. COLISÕES ---
            this.physics.add.collider(this.player, this.groundLayer);
            this.physics.add.collider(this.player, this.passablePlatforms);
            this.physics.add.collider(this.enemies, this.groundLayer);
            this.physics.add.collider(this.enemies, this.passablePlatforms);

            this.playerEnemyCollider = this.physics.add.collider(this.player, this.enemies, this.handlePlayerBumpEnemy, null, this);
            
            this.physics.add.overlap(this.player.attackHitbox, this.enemies, this.handlePlayerAttackBoss, null, this);

            this.bossHitbox = this.add.rectangle(0, 0, 50, 50, 0xff0000, 0);
            this.physics.add.existing(this.bossHitbox);
            this.bossHitbox.body.setAllowGravity(false);
            this.bossHitbox.body.enable = false;
            
            this.physics.add.overlap(this.bossHitbox, this.player, this.handleBossHitPlayer, null, this);

            // --- 5. VISUAL E UI ---
            this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
            this.cameras.main.startFollow(this.player, true, 1, 1);
            this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

            // [NOVO] Texto de Game Over (inicialmente invisível)
            const cx = this.cameras.main.width / 2;
            const cy = this.cameras.main.height / 2;
            this.restartText = this.add.text(cx, cy + 50, 'Pressione R para Reiniciar', { 
                fontSize: '24px', fill: '#fff', stroke: '#000', strokeThickness: 3 
            }).setOrigin(0.5).setVisible(false).setScrollFactor(0).setDepth(100);

            // [NOVO] Input R
            this.keyR = this.input.keyboard.addKey('R');

            this.createHUD();
            this.createAnimations();

            this.boss.play('ronin_idle');

            this.createRainEffect();
            this.setEnvironmentTint(0x6666ff); // Noite Azul

            this.sparkEmitter = this.add.particles(0, 0, 'sparkle_tex', {
                lifespan: 300, speed: { min: 150, max: 350 }, scale: { start: 1.5, end: 0 }, alpha: { start: 1, end: 0 }, gravityY: 600, blendMode: 'ADD', emitting: false
            });

            this.startLevelEntrance();
            //this.createDebugInputs();
            
            this.events.on('shutdown', this.shutdownCleanup, this);

        } catch (error) { console.error("Level 4 Create Error:", error); }
    }

    update(time, delta) {
        // [NOVO] Lógica de Restart
        if (this.gameOver) {
            if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
                this.scene.restart();
            }
            return;
        }

        if (this.player && this.player.active) {
            this.player.update(time, delta);
            
            if (this.player.playerState === 'DASH' || this.boss.state === RONIN_STATE.DASHING) {
                if (this.playerEnemyCollider.active) this.playerEnemyCollider.active = false;
            } else {
                if (!this.playerEnemyCollider.active) this.playerEnemyCollider.active = true;
            }
        }

        this.updateHUD();

        if (this.boss && this.boss.active) {
            if (!this.bossFightStarted) {
                if (!this.bossIntroPlayed && Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y) <= 400) {
                    this.triggerBossIntro();
                }
            } else {
                this.updateBossBehavior(time, delta);
            }
        }
    }

    // --- IA DO BOSS (3 FASES) ---

    updateBossBehavior(time, delta) {
        if (this.boss.state === RONIN_STATE.DEAD || this.boss.state === RONIN_STATE.EXECUTED) return;

        if (!this.bossAIEnabled) {
            if (this.boss.state !== RONIN_STATE.ATTACKING && 
                this.boss.state !== RONIN_STATE.DASHING && 
                this.boss.state !== RONIN_STATE.DEFEND && 
                this.boss.state !== RONIN_STATE.WAITING_EXECUTION) {
                this.boss.setVelocityX(0);
                this.boss.play('ronin_idle', true);
            }
            return;
        }
        
        // Plot Twist (Flashback)
        if (this.isFlashbackSequence) {
            if (this.boss.state !== RONIN_STATE.WAITING_EXECUTION && this.boss.state !== RONIN_STATE.EXECUTED) {
                this.setBossState(RONIN_STATE.WAITING_EXECUTION);
                this.boss.setVelocityX(0);
                this.boss.play('ronin_death_cen', true); 
                this.boss.once('animationcomplete', (anim) => {
                   if(anim.key === 'ronin_death_cen') {
                       this.boss.anims.pause(this.boss.anims.currentAnim.frames[this.boss.anims.currentAnim.frames.length - 1]);
                   }
                });
            }
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
        
        // Virar para o player
        if ([RONIN_STATE.IDLE, RONIN_STATE.CHASE].includes(this.boss.state)) {
            this.boss.setFlipX(this.player.x < this.boss.x);
        }

        // --- [NOVO] PUNIÇÃO DE CURA (SÓ NA ÚLTIMA VIDA) ---
        if (this.boss.currentLives === 1 && // <--- Verifica se é a última vida
            this.player.playerState === 'HEAL' && 
            (this.boss.state === RONIN_STATE.IDLE || this.boss.state === RONIN_STATE.CHASE)) {
            
            // Alta chance (90%) de punir instantaneamente
            if (Math.random() < 0.9) {
                this.showFloatingText(this.boss.x, this.boss.y - 60, "Sem trégua!", 800);
                this.performLightningDash(); // Dash agressivo
                return; // Interrompe o resto da lógica
            }
        }
        // --------------------------------------------------

        switch (this.boss.state) {
            case RONIN_STATE.IDLE:
                this.boss.setVelocityX(0);
                this.boss.play('ronin_idle', true);
                this.decisionTimer -= delta;
                if (this.decisionTimer <= 0) this.decideAttack(dist);
                break;

            case RONIN_STATE.CHASE:
                const dir = this.boss.flipX ? -1 : 1;
                
                // VELOCIDADE DINÂMICA POR FASE
                let speed = 350; // Fase 1
                if (this.boss.currentLives === 2) speed = 400; // Fase 2
                if (this.boss.currentLives === 1) speed = 480; // Fase 3 (Berserk)

                this.boss.setVelocityX(dir * speed);
                this.boss.play('ronin_run', true);
                
                if (dist < 120) { 
                    this.setBossState(RONIN_STATE.IDLE);
                    this.decisionTimer = 0; 
                } else if (dist > 600) {
                     // Fase 3 usa Dash agressivamente para encurtar
                     const dashChance = (this.boss.currentLives === 1) ? 0.05 : 0.02;
                     if(Math.random() < dashChance) this.performLightningDash();
                }
                break;
        }
    }

    decideAttack(dist) {
        const rng = Math.random();

        // Distância Longa (> 300px)
        if (dist > 300) {
            const dashThreshold = (this.boss.currentLives === 1) ? 0.8 : 0.6;
            if (rng < dashThreshold) this.performLightningDash();
            else this.setBossState(RONIN_STATE.CHASE);
        } 
        // Distância Curta (< 150px)
        else if (dist < 150) {
            // 1. Defesa (20% de chance)
            if (rng < 0.2) {
                this.performDefend();
                return;
            }

            // 2. Ataque Especial (SÓ FASE 2 e 3)
            const canUseSpecial = (this.boss.currentLives <= 2);
            
            // [NOVO] Verificação de Cooldown (10 Segundos)
            // Se o tempo atual for menor que o último uso + 10000ms, ele NÃO usa.
            const isCooldownOver = (this.time.now > this.boss.lastSpecialTime + 10000);

            // Chance reduzida: 
            // rng > 0.75 significa 25% de chance (antes era 30% ou mais)
            if (canUseSpecial && isCooldownOver && rng > 0.75) {
                
                // Registra o momento que usou para começar a contar o cooldown
                this.boss.lastSpecialTime = this.time.now;
                this.performSpecial();

            } else {
                // Se não cair no especial (ou estiver em cooldown), vai pro combo normal
                this.performCombo();
            }
        } 
        else {
            this.setBossState(RONIN_STATE.CHASE);
        }
    }

    // --- SKILLS DO BOSS ---

    performLightningDash() {
        this.setBossState(RONIN_STATE.DASHING);
        this.boss.setVelocityX(0);
        
        this.boss.setTint(0x00ffff); 
        this.boss.alpha = 0.4; 
        this.boss.play('ronin_dash_lightning');

        // 1. Direção
        const dirToPlayer = (this.player.x < this.boss.x) ? -1 : 1;
        this.boss.setFlipX(dirToPlayer === -1); 

        // 2. Destino (Backstab vs Finta)
        const isBackstab = Math.random() < 0.7;
        let targetX;
        
        if (isBackstab) {
            targetX = this.player.x + (dirToPlayer * 180); // Atravessa
        } else {
            targetX = this.player.x - (dirToPlayer * 100); // Para na frente
        }
        targetX = Phaser.Math.Clamp(targetX, 80, this.map.widthInPixels - 80);

        // 3. Velocidade Fixa Alta
        const distanceToTravel = Math.abs(targetX - this.boss.x);
        const dashSpeed = 1400; 
        let duration = (distanceToTravel / dashSpeed) * 1000; 
        duration = Math.max(duration, 150); 

        this.time.delayedCall(150, () => {
            if(!this.boss.active || this.isFlashbackSequence) return;
            
            const moveDir = (targetX < this.boss.x) ? -1 : 1;
            this.boss.setVelocityX(moveDir * dashSpeed);
            
            this.createGhostEffect(this.boss);
            this.time.delayedCall(100, () => { if(this.boss.active) this.createGhostEffect(this.boss); });

            // Freio ABS
            this.time.delayedCall(duration, () => {
                if(this.boss.active) this.boss.setVelocityX(0);
            });
        });

        this.boss.once('animationcomplete', () => {
            this.boss.clearTint();
            this.boss.alpha = 1;
            this.boss.setVelocityX(0);
            this.boss.setFlipX(this.player.x < this.boss.x); 

            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
            if (dist < 220) {
                // [CORREÇÃO] Verifica Fase antes de soltar especial pós-dash
                if (Math.random() < 0.6) {
                    this.performCombo();
                } else {
                    if (this.boss.currentLives <= 2) this.performSpecial(); // Só na fase 2 e 3
                    else this.performCombo(); // Se for fase 1, faz combo mesmo se cair no RNG
                }
            } else {
                this.setBossState(RONIN_STATE.IDLE);
                this.decisionTimer = 300; 
            }
        });
    }

    performCombo() {
        this.setBossState(RONIN_STATE.ATTACKING);
        this.boss.setVelocityX(0);
        this.boss.hitsTakenDuringAtk3 = 0; // Reseta contador de cancelamento

        const rng = Math.random();
        let comboLength = 1;
        
        if (rng < 0.2) comboLength = 1;
        else if (rng < 0.6) comboLength = 2;
        else comboLength = 3;

        // Limita frequência do Atk3
        if (comboLength === 3) {
            const now = this.time.now;
            if (now < this.boss.lastAtk3Time + 5000) {
                comboLength = 2; 
            } else {
                this.boss.lastAtk3Time = now;
            }
        }

        // Fase 3 força combos longos se cooldown permitir
        if (this.boss.currentLives === 1 && comboLength < 3) {
             if (this.time.now > this.boss.lastAtk3Time + 5000) {
                 comboLength = 3;
                 this.boss.lastAtk3Time = this.time.now;
             } else {
                 comboLength = 2;
             }
        }

        this.playComboStep(1, comboLength);
    }

    playComboStep(currentStep, totalSteps) {
        if (!this.boss.active || this.boss.state !== RONIN_STATE.ATTACKING) return;
        
        let animKey = (currentStep === 1) ? 'ronin_atk1' : (currentStep === 2) ? 'ronin_atk2' : 'ronin_atk3';
        this.boss.play(animKey);

        const hitListener = (anim, frame) => {
            if (anim.key !== animKey) return;

            if (frame.index >= 2 && frame.index <= 20) {
                let width = 155; let height = 110; let offX = 100; let offY = 80;
                
                if (currentStep === 3) {
                    if (frame.index >= 13) {
                        width = 250; offX = 150; 
                    }
                }
                this.updateBossHitbox(this.boss, width, height, offX, offY);
            } else {
                this.bossHitbox.body.enable = false;
            }
        };

        this.boss.on('animationupdate', hitListener);

        this.boss.once('animationcomplete', () => {
            this.boss.off('animationupdate', hitListener);
            this.bossHitbox.body.enable = false;

            if (currentStep < totalSteps && this.boss.active && this.boss.state === RONIN_STATE.ATTACKING) {
                const dir = this.boss.flipX ? -1 : 1;
                this.boss.x += dir * 20; 
                this.playComboStep(currentStep + 1, totalSteps);
            } else {
                this.setBossState(RONIN_STATE.IDLE);
                this.decisionTimer = 600;
            }
        });
    }

    performSpecial() {
        this.setBossState(RONIN_STATE.ATTACKING);
        this.boss.setVelocityX(0);
        this.boss.setTint(0xff0000); 
        this.boss.play('ronin_sp_atk');

        let hasCaughtPlayer = false; 

        const spListener = (anim, frame) => {
            if (anim.key !== 'ronin_sp_atk') return;

            const dir = this.boss.flipX ? -1 : 1;
            const hitX = this.boss.x; const hitY = this.boss.y + 65; 
            const damageRect = new Phaser.Geom.Rectangle(hitX - 260, hitY - 60, 520, 120);

            // FASE 1: Armadilha (Frames 0-8)
            if (frame.index <= 8) {
                this.updateBossHitbox(this.boss, 520, 120, 0, 65);

                if (!hasCaughtPlayer) {
                    const grabRect = new Phaser.Geom.Rectangle(hitX - 100, hitY - 60, 200, 120);
                    const playerRect = this.player.getBounds();

                    if (Phaser.Geom.Intersects.RectangleToRectangle(grabRect, playerRect)) {
                        if (!this.player.playerInvulnerable && this.player.playerState !== 'DASH') {
                            hasCaughtPlayer = true;
                            this.player.playerState = 'CUTSCENE'; 
                            this.player.setVelocity(0, 0);
                            this.player.setTint(0x555555); 
                            this.player.play('hurt', true);
                            this.player.anims.pause(this.player.anims.currentAnim.frames[0]);
                            this.showFloatingText(this.player.x, this.player.y - 50, "PRESO!", 500);
                        }
                    }
                } else {
                    this.player.setVelocity(0, 0);
                    if(this.player.anims.isPlaying) this.player.anims.pause();
                }
            } else {
                this.bossHitbox.body.enable = false; 
            }

            // FASE 2: Dano (Frame 9)
            if (frame.index === 9) {
                this.boss.clearTint(); 
                const playerRect = this.player.getBounds();
                const isInDamageRange = Phaser.Geom.Intersects.RectangleToRectangle(damageRect, playerRect);

                if (hasCaughtPlayer || isInDamageRange) {
                    if (!hasCaughtPlayer) {
                        if (this.player.playerInvulnerable || this.player.playerState === 'DASH') return;
                    }
                    this.player.clearTint(); 
                    this.takeDamage(45, this.boss); 
                    this.cameras.main.shake(200, 0.02);
                    this.createSparks(this.player.x, this.player.y);
                    this.cameras.main.flash(100, 255, 0, 0);
                }
            }

            // FASE 3: Liberação (Frame 15)
            if (frame.index === 15) {
                if (hasCaughtPlayer && this.player.health > 0) {
                    this.player.playerState = 'IDLE';
                    this.player.anims.resume();
                    this.player.clearTint();
                }
            }
        };

        this.boss.on('animationupdate', spListener);

        this.boss.once('animationcomplete', () => {
            this.boss.off('animationupdate', spListener);
            this.boss.clearTint();
            this.bossHitbox.body.enable = false;

            if (hasCaughtPlayer && this.player.health > 0 && this.player.playerState === 'CUTSCENE') {
                 this.player.playerState = 'IDLE';
                 this.player.clearTint();
            }

            this.setBossState(RONIN_STATE.IDLE);
            this.decisionTimer = 1500;
        });
    }

    performDefend() {
        this.setBossState(RONIN_STATE.DEFEND);
        this.boss.setVelocityX(0);
        this.boss.play('ronin_defend');
        
        this.time.delayedCall(1500, () => {
            if(this.boss.active && this.boss.state === RONIN_STATE.DEFEND) {
                this.setBossState(RONIN_STATE.IDLE);
            }
        });
    }

    // --- GERENCIAMENTO DE DANO E FASES ---

    handlePlayerAttackBoss(hitbox, boss) {
        // 1. Se já foi executado, ignora novos golpes para não bugar a animação final
        if (boss.state === RONIN_STATE.EXECUTED || boss.state === RONIN_STATE.DEAD) return;

        // 2. Se o Boss está AJOELHADO (Esperando execução), qualquer golpe finaliza ele
        if (boss.state === RONIN_STATE.WAITING_EXECUTION) {
             // Verifica se o golpe não foi processado no frame anterior (evita duplo trigger)
             if (!this.player.enemiesHitThisAttack.includes(boss)) {
                 this.player.enemiesHitThisAttack.push(boss);
                 this.executeFinalBlow(); // <--- O GOLPE FINAL
             }
             return;
        }

        // --- LÓGICA DE COMBATE NORMAL ---
        if (this.player.enemiesHitThisAttack.includes(boss)) return;
        this.player.enemiesHitThisAttack.push(boss);

        if (boss.state === RONIN_STATE.DEFEND) {
            this.createSparks(boss.x, boss.y);
            return;
        }

        let damage = 25;
        if(this.player.currentAttackAnim === 'specialAttack') damage = 50;
        if (boss.currentLives === 1) damage *= 0.8; 

        // Cancelar ataque 3 do boss
        if (boss.state === RONIN_STATE.ATTACKING && boss.anims.currentAnim?.key === 'ronin_atk3') {
            boss.hitsTakenDuringAtk3++;
            if (boss.hitsTakenDuringAtk3 >= 2) {
                boss.anims.stop(); 
                this.bossHitbox.body.enable = false; 
                this.performLightningDash(); 
                return; 
            }
        }

        boss.health -= damage;
        this.updateHUD();
        this.createSparks(boss.x, boss.y);
        this.hitStop(100);
        
        // --- VERIFICAÇÃO DE VIDA ---
        if (boss.health <= 0) {
            if (boss.currentLives > 1) {
                // Perdeu uma vida, mas tem mais
                boss.currentLives--;
                boss.health = boss.maxHealth;
                this.updateHUD();
                
                this.cameras.main.shake(300, 0.02);
                this.showFloatingText(boss.x, boss.y - 80, "AINDA NÃO!", 2000);

                const dir = (this.player.x < boss.x) ? -1 : 1;
                this.player.setVelocity(dir * 600, -300);
                this.player.playerState = 'HURT'; 
                this.time.delayedCall(500, () => { if(this.player.active) this.player.playerState = 'IDLE'; });

                boss.clearTint();
                this.performLightningDash(); 
                return;

            } else {
                // --- ÚLTIMA VIDA ZERADA: FIM DA LUTA ---
                if (boss.state === RONIN_STATE.WAITING_EXECUTION || boss.state === RONIN_STATE.DYING) return;
                boss.health = 1; // Mantém vivo para a animação
                this.triggerBossKneel(); // <--- CHAMA A NOVA FUNÇÃO
                return;
            }
        }

        // Reação normal a dano (Stun)
        if (boss.state === RONIN_STATE.ATTACKING || boss.state === RONIN_STATE.DASHING) {
            boss.setTint(0xffaaaa); 
            this.time.delayedCall(100, () => boss.clearTint());
            return; 
        }
        
        boss.play('ronin_take_hit');
        this.setBossState(RONIN_STATE.HURT); 
        boss.once('animationcomplete', (anim) => {
            if (anim.key === 'ronin_take_hit' && boss.state !== RONIN_STATE.WAITING_EXECUTION) {
                this.setBossState(RONIN_STATE.IDLE);
                this.decisionTimer = 0; 
            }
        });
    }

    hitStop(duration) {
        this.physics.world.pause();
        this.anims.pauseAll(); // Pausa animações globais
        this.time.delayedCall(duration, () => {
            this.physics.world.resume();
            this.anims.resumeAll();
        });
    }

    handleBossHitPlayer(hitbox, player) {
        if (this.isFlashbackSequence || this.boss.state === RONIN_STATE.WAITING_EXECUTION) return;
        
        // Ignora dano da armadilha do Special (frames < 9)
        if (this.boss.anims.currentAnim && 
            this.boss.anims.currentAnim.key === 'ronin_sp_atk' && 
            this.boss.anims.currentFrame.index < 9) {
            return;
        }

        if (player.playerInvulnerable || player.playerState === 'DASH') return;

        // --- LÓGICA DO PARRY ---
        if (player.isParrying) {
            player.parrySucceeded = true;
            
            // Efeitos Visuais e Sonoros
            this.createSparks(player.x, player.y);
            this.hitStop(150);
            this.cameras.main.shake(100, 0.01); // Tremida mais forte
            this.showFloatingText(this.boss.x, this.boss.y - 60, "QUEBRA DE POSTURA!", 1000);

            // [CORREÇÃO] Força o estado HURT para garantir o Stun
            this.setBossState(RONIN_STATE.HURT);
            this.boss.setVelocityX(0);
            this.boss.play('ronin_take_hit');

            // Cancela qualquer hitbox de ataque que o boss ainda tenha ativa
            if(this.bossHitbox) this.bossHitbox.body.enable = false;

            // Só libera o Boss quando a animação de dor acabar
            this.boss.once('animationcomplete', () => {
                if(!this.isFlashbackSequence && this.boss.active) {
                    this.setBossState(RONIN_STATE.IDLE);
                    // [RECOMPENSA] O Boss fica "bobo" por 1.5s antes de decidir o próximo ataque
                    this.decisionTimer = 1500; 
                }
            });
            return;
        }

        // Dano normal se não deu parry
        let dmg = 30;
        if (this.boss.currentLives === 1) dmg = 45; 

        this.takeDamage(dmg, this.boss);
    }
    
    handlePlayerBumpEnemy(player, enemy) {
        if (this.player.playerState === 'DASH') return;
        if(this.isFlashbackSequence) return;
        
        const distanceX = Math.abs(player.x - enemy.x);
        if (distanceX > 30) return; 
        this.takeDamage(10, enemy);
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
    }

    killPlayer() {
        this.gameOver = true;
        this.player.play('death');
        this.physics.pause();
        // [NOVO] Mostra o texto ao morrer
        if(this.restartText) this.restartText.setVisible(true);
    }

    // --- CENA FINAL ---

    startFlashbackSequence() {
        this.isFlashbackSequence = true;
        this.time.timeScale = 0.1; 
        
        this.player.setVelocity(0, 0);
        this.player.setAcceleration(0, 0);
        this.player.playerState = 'IDLE'; 
        this.player.anims.play('idle', true);

        if(this.bossHitbox) this.bossHitbox.body.enable = false;

        this.cameras.main.flash(2000, 255, 255, 255, true, (cam, progress) => {
            if (progress > 0.5) {
                this.changeToFlashbackEnvironment();
            }
        });

        this.time.delayedCall(250, () => { 
            if (this.boss.state === RONIN_STATE.EXECUTED || this.boss.state === RONIN_STATE.DEAD) {
                this.time.timeScale = 1;
                return;
            }

            this.time.timeScale = 1; 
            if(this.bossHitbox) this.bossHitbox.body.enable = true; 
            // Inicia um zoom lento e dramático em direção ao centro da tela (onde está a ação)
            this.cameras.main.zoomTo(1.3, 5000, 'Linear'); 
            
            this.finishText = this.add.text(this.boss.x, this.boss.y - 100, "Não trema a mão.", {
                fontSize: '20px', fontFamily: 'Georgia', fontStyle: 'italic',
                fill: '#ffffff', stroke: '#000000', strokeThickness: 3
            }).setOrigin(0.5).setAlpha(0).setDepth(100);

            this.tweens.add({
                targets: this.finishText,
                alpha: 1, duration: 1000,
                onComplete: () => {
                    if (this.finishText && this.finishText.active) {
                        this.tweens.add({
                            targets: this.finishText,
                            alpha: 0.5, duration: 1500, yoyo: true, repeat: -1
                        });
                    }
                }
            });

            this.boss.setTint(0xffffff);
        });
    }

    changeToFlashbackEnvironment() {
        // [LIMPEZA] Removemos a mudança de nome, pois já é Mestre Jubei
        
        this.setEnvironmentTint(0x555577); 
        
        if(this.bossHealthBar) this.bossHealthBar.setVisible(false);
        if(this.bossHealthBarBG) this.bossHealthBarBG.setVisible(false);
        if (this.bossLives) this.bossLives.forEach(ball => ball.setVisible(false));
    }

    // O Boss se rende/cai e espera o jogador
    triggerBossKneel() {
        this.setBossState(RONIN_STATE.WAITING_EXECUTION);
        this.boss.setVelocityX(0);
        if(this.bossHitbox) this.bossHitbox.body.enable = false;

        this.boss.play('ronin_death_cen');
        
        const kneelListener = (anim, frame) => {
            // [CORREÇÃO] Se o estado já mudou para EXECUTED (jogador atacou caindo),
            // remove o listener e NÃO pausa. Deixa cair até o chão.
            if (this.boss.state !== RONIN_STATE.WAITING_EXECUTION) {
                this.boss.off('animationupdate', kneelListener);
                return;
            }

            // Lógica original de pausar se ainda estiver esperando
            if (anim.key === 'ronin_death_cen' && frame.index === 12) {
                this.boss.anims.pause(); 
                this.boss.off('animationupdate', kneelListener); 
            }
        };
        this.boss.on('animationupdate', kneelListener);
        
        this.startFlashbackSequence(); 
    }

    executeFinalBlow() {
        this.setBossState(RONIN_STATE.EXECUTED);
        
        // Remove texto se existir
        if (this.finishText) this.finishText.destroy(); 

        // [CORREÇÃO] Garante velocidade normal caso tenha atacado durante o slow motion
        this.time.timeScale = 1;

        this.cameras.main.shake(500, 0.02);
        this.cameras.main.flash(200, 255, 255, 255);
        this.createSparks(this.boss.x, this.boss.y);
        
        // Se a animação estava pausada ou rodando, o resume garante que vá até o fim
        this.boss.anims.resume();
        
        this.boss.once('animationcomplete', () => {
             this.boss.state = RONIN_STATE.DEAD;
             this.cameras.main.fade(2000, 255, 255, 255); 
             this.cameras.main.once('camerafadeoutcomplete', () => {
                 this.scene.start('EndingScene');
             });
        });
    }

    // --- VISUAL E UTILS ---

    createMap() {
        this.map = this.make.tilemap({ key: 'level4MapKey' });
        const tilesetTiles = this.map.addTilesetImage('Tiles', 'spriteTiles'); 
        const tilesetChao = this.map.addTilesetImage('chao_tileset', 'chaoTilesetImg');
        const tilesetWalls = this.map.addTilesetImage('wallsTower', 'wallsImg');
        const tilesetEnv = this.map.addTilesetImage('env_objectsTower', 'envImg');
        const tilesetDecor = this.map.addTilesetImage('Decor', 'decorImg');
        const tilesetGround = this.map.addTilesetImage('groundTower', 'groundTowerImg');
        const tilesetSidescroller = this.map.addTilesetImage('sidescroller', 'sidescrollerImg');
        const tilesetBg1 = this.map.addTilesetImage('background', 'bg1Img');
        const tilesetBg2 = this.map.addTilesetImage('background2', 'bg2Img');
        const tilesetBg5 = this.map.addTilesetImage('background5', 'bg5Img');
        const allTilesets = [tilesetTiles, tilesetChao, tilesetWalls, tilesetEnv, tilesetDecor, tilesetGround, tilesetSidescroller, tilesetBg1, tilesetBg2, tilesetBg5].filter(t => t !== null);

        const layer2 = this.map.createLayer('fundo/layer2', allTilesets, 0, 0);
        if (layer2) layer2.setScrollFactor(1);
        const layer1 = this.map.createLayer('fundo/layer1', allTilesets, 0, 0);
        if (layer1) layer1.setScrollFactor(1);
        
        this.backgroundLayers = [layer1, layer2]; 

        this.groundLayer = this.map.createLayer('ChaoSolido', allTilesets, 0, 0);
        this.groundLayer.setCollisionByProperty({ collides: true });

        this.detalhesLayer = this.map.createLayer('Detalhes', allTilesets, 0, 0);
        this.backgroundLayers.push(this.groundLayer, this.detalhesLayer);

        this.ladoForaLayer = this.map.createLayer('ladoFora', allTilesets, 0, 0);
        this.backgroundLayers.push(this.groundLayer, this.detalhesLayer);

        this.passablePlatforms = this.physics.add.staticGroup();
        this.addGhostPlatform(400, 450, 200, 0);
        this.addGhostPlatform(1100, 400, 200, 0);
        this.addGhostPlatform(1600, 300, 200, 3000);
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
                    this.tweens.add({ targets: container, alpha: 1, duration: 500, onStart: () => { if (container.body) container.body.checkCollision.up = true; } });
                    this.time.delayedCall(3500, () => {
                        if (!this.sys) return;
                        this.tweens.add({ targets: container, alpha: 0.2, duration: 100, yoyo: true, repeat: 5, onComplete: () => { container.alpha = 0; if (container.body) container.body.checkCollision.up = false; } });
                    });
                }
            });
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
                        this.showFloatingText(this.player.x, this.player.y - 60, "Cheiro de chuva... e ferro.", 3000);
                    });
                }
            }
        });
    }

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
            this.boss.play('ronin_defend'); 
            
            this.bossNameText = this.add.text(this.boss.x, this.boss.y - 100, "MESTRE JUBEI", { 
                fontSize: '32px', fontFamily: 'Georgia', fill: '#aaaaff', stroke: '#000', strokeThickness: 4 
            }).setOrigin(0.5).setAlpha(0);
            
            this.tweens.add({ targets: this.bossNameText, alpha: 1, duration: 1000, yoyo: true, hold: 1500 });
            
            this.time.delayedCall(2500, () => {
                this.cameras.main.zoomTo(1, 500, 'Power2');
                this.cameras.main.startFollow(this.player, true, 1, 1);
                
                this.bossHealthBarBG.setVisible(true);
                this.bossHealthBar.setVisible(true);
                this.bossLives.forEach(ball => ball.setVisible(true)); // Mostra as vidas
                
                this.setBossState(RONIN_STATE.IDLE);
                if (this.player.active) this.player.playerState = 'IDLE'; 
            });
        }, [], this);
    }

    createRainEffect() {
        this.rainParticles = this.add.particles(0, 0, 'sparkle_tex', {
            x: { min: 0, max: 2000 }, y: -50,
            lifespan: 1500, speedY: { min: 800, max: 1000 }, speedX: -200,
            scaleY: 4, scaleX: 0.1, quantity: 4, blendMode: 'ADD', 
            
            // [CORREÇÃO] Tint do Level 1 (Azul Gelo)
            tint: 0xaaccff, 
            
            alpha: 0.6
        });
        this.rainParticles.setScrollFactor(0);
    }

    setEnvironmentTint(color) {
        // Verifica se a lista existe para evitar erros
        if (!this.backgroundLayers) return;

        this.backgroundLayers.forEach(l => { 
            if (l && typeof l.setTint === 'function' && typeof l.clearTint === 'function') {
                if (color === null) {
                    l.clearTint(); 
                } else {
                    l.setTint(color); 
                }
            }
        });
    }

    createSparks(x, y) {
        // [CORREÇÃO] Força a cor amarela nas faíscas de impacto
        this.sparkEmitter.setParticleTint(0xffff00); 
        this.sparkEmitter.explode(8, x, y);
    }

    showFloatingText(x, y, message, duration) {
        const text = this.add.text(x, y, message, {
            fontSize: '18px', fontFamily: 'Arial', fontStyle: 'italic',
            fill: '#ffffff', stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5).setAlpha(0).setDepth(100);
        
        this.tweens.add({ 
            targets: text, y: y - 40, alpha: { from: 0, to: 1 }, duration: 500, yoyo: true, hold: duration, 
            onComplete: () => text.destroy() 
        });
    }

    createHUD() {
        const margin = 20;
        this.bossHealthBarBG = this.add.rectangle(margin, margin, this.bossBarWidth, 15, 0x000000, 0.5).setOrigin(0).setScrollFactor(0).setVisible(false);
        this.bossHealthBar = this.add.rectangle(margin, margin, this.bossBarWidth, 15, 0xff0000).setOrigin(0).setScrollFactor(0).setVisible(false);
        
        // SISTEMA DE VIDAS VISUAL (Bolinhas)
        this.bossLives = [];
        const lifeXStart = margin + this.bossBarWidth + 20;
        for (let i = 0; i < 3; i++) { // 3 vidas
            let ball = this.add.circle(lifeXStart + (i * 25), margin + 7, 8, 0xAA0000).setScrollFactor(0).setDepth(10).setVisible(false);
            this.bossLives.push(ball);
        }
        
        const bottomY = 600 - margin - 15;
        this.playerHealthBarBG = this.add.rectangle(margin, bottomY, this.playerBarWidth, 15, 0x000000, 0.5).setOrigin(0).setScrollFactor(0);
        this.playerHealthBar = this.add.rectangle(margin, bottomY, this.playerBarWidth, 15, 0x00ff00).setOrigin(0).setScrollFactor(0);

        // [CORREÇÃO: Stamina e Cura] Copiado do Level 3
        this.playerStaminaBarBG = this.add.rectangle(margin, 600 - margin, this.playerBarWidth, 10, 0x000000, 0.5).setOrigin(0).setScrollFactor(0);
        this.playerStaminaBar = this.add.rectangle(margin, 600 - margin, this.playerBarWidth, 10, 0xffff00).setOrigin(0).setScrollFactor(0);
        this.healChargesText = this.add.text(margin + this.playerBarWidth + 10, bottomY, 'x3', { fontSize: '20px' }).setScrollFactor(0);
    }

    updateHUD() {
        // Atualiza Player (Sempre visível)
        if (this.player) {
            this.playerHealthBar.width = (Math.max(0, this.player.health) / this.player.maxHealth) * this.playerBarWidth;
            if (this.playerStaminaBar) {
                this.playerStaminaBar.width = (Math.max(0, this.player.stamina) / this.player.maxStamina) * this.playerBarWidth;
            }
            if (this.healChargesText) {
                this.healChargesText.setText('x' + this.player.healCharges);
            }
        }

        // Atualiza Boss (SÓ SE a luta começou E NÃO for o Flashback)
        // [CORREÇÃO] Adicionado "&& !this.isFlashbackSequence"
        if (this.boss && this.bossFightStarted && !this.isFlashbackSequence) {
            this.bossHealthBar.width = (Math.max(0, this.boss.health) / this.boss.maxHealth) * this.bossBarWidth;
            
            // Desenha as bolinhas
            for (let i = 0; i < this.boss.maxLives; i++) {
                if (this.bossLives[i]) {
                    this.bossLives[i].setVisible(true);
                    // Vermelho se a vida ainda existe, Cinza se já foi perdida
                    this.bossLives[i].fillColor = (i < this.boss.currentLives) ? 0xAA0000 : 0x444444;
                }
            }
        } else {
            // Se estiver no Flashback, garante que tudo fique oculto
            if (this.bossHealthBar) this.bossHealthBar.setVisible(false);
            if (this.bossHealthBarBG) this.bossHealthBarBG.setVisible(false);
            if (this.bossLives) {
                this.bossLives.forEach(ball => ball.setVisible(false));
            }
        }
    }

    shutdownCleanup() {
        this.input.keyboard.removeAllListeners();
        this.time.removeAllEvents();
    }

    setBossState(newState) {
        this.boss.state = newState;
        if(this.bossHitbox) this.bossHitbox.body.enable = false; // Segurança extra
        this.boss.clearTint(); // Limpa cores de ataque especiais
    }

    updateBossHitbox(boss, w, h, offX, offY) {
        const dir = boss.flipX ? -1 : 1;
        this.bossHitbox.setPosition(boss.x + (offX * dir), boss.y + offY);
        this.bossHitbox.body.setSize(w, h);
        this.bossHitbox.body.enable = true;
    }

    createGhostEffect(source) {
        const ghost = this.add.image(source.x, source.y, 'roninSheet', source.frame.name);
        ghost.setTint(0x00ffff);
        ghost.setAlpha(0.6);
        ghost.setFlipX(source.flipX);
        ghost.setScale(source.scaleX, source.scaleY);
        this.tweens.add({ targets: ghost, alpha: 0, duration: 300, onComplete: () => ghost.destroy() });
    }

    createAnimations() {
        if (this.anims.exists('ronin_idle')) return;
        const cols = 20; 
        this.anims.create({ key: 'ronin_idle', frames: this.anims.generateFrameNumbers('roninSheet', { start: 0, end: 9 }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'ronin_run', frames: this.anims.generateFrameNumbers('roninSheet', { start: cols * 1, end: cols * 1 + 7 }), frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'ronin_dash_lightning', frames: this.anims.generateFrameNumbers('roninSheet', { start: cols * 10, end: cols * 10 + 12 }), frameRate: 20, repeat: 0 });
        this.anims.create({ key: 'ronin_atk1', frames: this.anims.generateFrameNumbers('roninSheet', { start: cols * 13, end: cols * 13 + 7 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'ronin_atk2', frames: this.anims.generateFrameNumbers('roninSheet', { start: cols * 14, end: cols * 14 + 9 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'ronin_atk3', frames: this.anims.generateFrameNumbers('roninSheet', { start: cols * 15, end: cols * 15 + 18 }), frameRate: 15, repeat: 0 });
        this.anims.create({ key: 'ronin_sp_atk', frames: this.anims.generateFrameNumbers('roninSheet', { start: cols * 16, end: cols * 16 + 19 }), frameRate: 12, repeat: 0 });
        this.anims.create({ key: 'ronin_defend', frames: this.anims.generateFrameNumbers('roninSheet', { start: cols * 17, end: cols * 17 + 7 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'ronin_take_hit', frames: this.anims.generateFrameNumbers('roninSheet', { start: cols * 18, end: cols * 18 + 5 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'ronin_death_uncen', frames: this.anims.generateFrameNumbers('roninSheet', { start: cols * 19, end: cols * 19 + 19 }), frameRate: 10, repeat: 0 });
        this.anims.create({ key: 'ronin_death_cen', frames: this.anims.generateFrameNumbers('roninSheet', { start: cols * 20, end: cols * 20 + 19 }), frameRate: 10, repeat: 0 });
    }
}