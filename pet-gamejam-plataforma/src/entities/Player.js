// Arquivo: src/entities/Player.js

class Player extends Phaser.Physics.Arcade.Sprite {

    constructor(scene, x, y) {
        super(scene, x, y, 'playerIdleSheet');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(2).setBounce(0);
        this.setCollideWorldBounds(true);
        
        const baseCollisionWidth = 11; const baseCollisionHeight = 18; 
        const baseOffsetY_calc = 54; const baseOffsetX_calc = (96 - baseCollisionWidth) / 2;
        const scaleFactor = 2;
        const scaledCollisionWidth = baseCollisionWidth * scaleFactor; const scaledCollisionHeight = baseCollisionHeight * scaleFactor;
        const originalBodyCenterX = baseOffsetX_calc + (baseCollisionWidth / 2); const originalBodyCenterY = baseOffsetY_calc + (baseCollisionHeight / 2);
        const newOffsetX = originalBodyCenterX - (scaledCollisionWidth / 2); const newOffsetY = originalBodyCenterY - (scaledCollisionHeight / 2);
        this.body.setSize(scaledCollisionWidth, scaledCollisionHeight);
        this.body.setOffset(newOffsetX, newOffsetY);

        this.health = 100; this.maxHealth = 100;
        this.stamina = 100; this.maxStamina = 100;
        this.healCharges = 3;
        
        this.playerState = 'IDLE'; 
        this.playerFacing = 'right';
        this.playerInvulnerable = false;
        this.isDroppingDown = false;

        this.attackCooldown = 500;
        this.comboCount = 0;
        this.comboTimer = null;
        this.keyJHeldTime = 0;
        this.specialAttackChargeTime = 180;
        this.specialAttackTriggeredByHold = false;
        this.currentAttackAnim = null;
        
        this.dashCooldownTime = 500;
        this.lastDashTime = 0;
        this.airDashCount = 0;
        this.maxAirDashes = 1;
        this.isParrying = false;
        this.parryWindow = 150;
        this.parrySucceeded = false;
        
        this.staminaRegenRate = 30;
        this.specialAttackStaminaCost = 30;
        this.dashStaminaCost = 25;
        this.parryStaminaCost = 10;

        this.attackHitbox = scene.add.rectangle(0, 0, 90, 55, 0xffcc00, 0); 
        scene.physics.add.existing(this.attackHitbox);
        this.attackHitbox.body.setAllowGravity(false);
        this.attackHitbox.body.enable = false;
        this.enemiesHitThisAttack = [];

        this.keys = scene.input.keyboard.addKeys({
            W: Phaser.Input.Keyboard.KeyCodes.W,
            A: Phaser.Input.Keyboard.KeyCodes.A,
            S: Phaser.Input.Keyboard.KeyCodes.S,
            D: Phaser.Input.Keyboard.KeyCodes.D,
            J: Phaser.Input.Keyboard.KeyCodes.J,
            K: Phaser.Input.Keyboard.KeyCodes.K,
            L: Phaser.Input.Keyboard.KeyCodes.L,
            E: Phaser.Input.Keyboard.KeyCodes.E
        });

        Player.createAnimations(scene);
        this.play('idle');
    }

    static preload(scene) {
        const playerFrameConfig = { frameWidth: 96, frameHeight: 96 };
        scene.load.spritesheet('playerIdleSheet', 'assets/images/player/player_idle.png', playerFrameConfig);
        scene.load.spritesheet('playerRunSheet', 'assets/images/player/player_run.png', playerFrameConfig);
        scene.load.spritesheet('playerDeathSheet', 'assets/images/player/player_death.png', playerFrameConfig);
        scene.load.spritesheet('playerHealingSheet', 'assets/images/player/player_healing.png', playerFrameConfig);
        scene.load.spritesheet('playerAttack1Sheet', 'assets/images/player/player_attack1.png', playerFrameConfig);
        scene.load.spritesheet('playerAttack2Sheet', 'assets/images/player/player_attack2.png', playerFrameConfig);
        scene.load.spritesheet('playerAttack3Sheet', 'assets/images/player/player_attack3.png', playerFrameConfig);
        scene.load.spritesheet('playerAirAttackSheet', 'assets/images/player/player_airattack.png', playerFrameConfig);
        scene.load.spritesheet('playerSpecialAttackSheet', 'assets/images/player/player_specialattack.png', playerFrameConfig);
        scene.load.spritesheet('playerHurtSheet', 'assets/images/player/player_hurt.png', playerFrameConfig);
        scene.load.spritesheet('playerJumpUpSheet', 'assets/images/player/player_jump.png', playerFrameConfig);
        scene.load.spritesheet('playerJumpStartSheet', 'assets/images/player/player_jump-start.png', playerFrameConfig);
        scene.load.spritesheet('playerFallingSheet', 'assets/images/player/player_jump-fall.png', playerFrameConfig);
        scene.load.spritesheet('playerJumpApexSheet', 'assets/images/player/player_jump-transicion.png', playerFrameConfig);
        scene.load.spritesheet('playerDashSheet', 'assets/images/player/player_dash.png', playerFrameConfig);
        scene.load.spritesheet('playerParrySheet', 'assets/images/player/player_parry.png', playerFrameConfig);
    }

    static createAnimations(scene) {
        if (scene.anims.exists('idle')) return;
        scene.anims.create({ key: 'idle', frames: scene.anims.generateFrameNumbers('playerIdleSheet', { start: 0, end: 9 }), frameRate: 10, repeat: -1 });
        scene.anims.create({ key: 'run', frames: scene.anims.generateFrameNumbers('playerRunSheet', { start: 0, end: 15 }), frameRate: 15, repeat: -1 });
        scene.anims.create({ key: 'hurt', frames: scene.anims.generateFrameNumbers('playerHurtSheet', { start: 0, end: 3 }), frameRate: 10, repeat: 0 });
        scene.anims.create({ key: 'death', frames: scene.anims.generateFrameNumbers('playerDeathSheet', { start: 0, end: 8}), frameRate: 10, repeat: 0});
        scene.anims.create({ key: 'healing', frames: scene.anims.generateFrameNumbers('playerHealingSheet', { start: 0, end: 14}), frameRate: 15, repeat: 0});
        scene.anims.create({ key: 'attack1', frames: scene.anims.generateFrameNumbers('playerAttack1Sheet', { start: 0, end: 6 }), frameRate: 18, repeat: 0 });
        scene.anims.create({ key: 'attack2', frames: scene.anims.generateFrameNumbers('playerAttack2Sheet', { start: 0, end: 6 }), frameRate: 18, repeat: 0 });
        scene.anims.create({ key: 'attack3', frames: scene.anims.generateFrameNumbers('playerAttack3Sheet', { start: 0, end: 5 }), frameRate: 18, repeat: 0 });
        scene.anims.create({ key: 'airAttack', frames: scene.anims.generateFrameNumbers('playerAirAttackSheet', { start: 0, end: 5 }), frameRate: 18, repeat: 0 });
        scene.anims.create({ key: 'specialAttack', frames: scene.anims.generateFrameNumbers('playerSpecialAttackSheet', { start: 0, end: 13 }), frameRate: 22, repeat: 0 });
        scene.anims.create({ key: 'jumpStart', frames: scene.anims.generateFrameNumbers('playerJumpStartSheet', { start: 0, end: 2}), frameRate: 12, repeat: 0});
        scene.anims.create({ key: 'jumpApex', frames: scene.anims.generateFrameNumbers('playerJumpApexSheet', { start: 0, end: 2}), frameRate: 22, repeat: 0});
        scene.anims.create({ key: 'falling', frames: scene.anims.generateFrameNumbers('playerFallingSheet', { start: 0, end: 2}), frameRate: 12, repeat: -1});
        scene.anims.create({ key: 'jumpUp', frames: scene.anims.generateFrameNumbers('playerJumpUpSheet', { start: 0, end: 2}), frameRate: 3, repeat: 0});
        scene.anims.create({ key: 'dash', frames: scene.anims.generateFrameNumbers('playerDashSheet', { start: 0, end: 7}), frameRate: 24, repeat: 0 });
        scene.anims.create({ key: 'parry', frames: scene.anims.generateFrameNumbers('playerParrySheet', { start: 0, end: 5}), frameRate: 15, repeat: 0 });
    }

    update(time, delta) {
        if (!this.active || this.health <= 0) return;

        this.updatePlayerState();
        this.handleInput(time, delta);
        this.updateAnimations();

        const busyStates = ['ATTACK', 'HURT', 'DASH', 'PARRY', 'HEAL', 'CUTSCENE'];
        if (!busyStates.includes(this.playerState) && this.stamina < this.maxStamina) {
            this.stamina += this.staminaRegenRate * (delta / 1000);
        }
    }

    updatePlayerState() {
        const onGround = this.body.blocked.down || this.body.touching.down;

        if (onGround) {
            this.airDashCount = 0;
            if (this.playerState === 'ATTACK' && this.currentAttackAnim === 'airAttack') {
                this.clearAttackState();
                this.playerState = 'IDLE';
            }
        }

        if (['HURT', 'ATTACK', 'DASH', 'PARRY', 'HEAL', 'CUTSCENE'].includes(this.playerState)) return;
        if (this.isDroppingDown) return;

        if (onGround) {
            const isTryingToMove = this.keys.A.isDown || this.keys.D.isDown;
            if (this.body.velocity.x !== 0 || isTryingToMove) {
                this.playerState = 'RUN';
            } else {
                this.playerState = 'IDLE';
            }
        } else {
            if (this.body.velocity.y < 0) this.playerState = 'JUMP';
            else this.playerState = 'FALL';
        }
    }

    handleInput(time, delta) {
        if (['ATTACK', 'HURT', 'DASH', 'PARRY', 'HEAL', 'CUTSCENE'].includes(this.playerState)) return;
        const onGround = this.body.blocked.down || this.body.touching.down;

        if (this.keys.A.isDown) {
            this.setVelocityX(-360); this.setFlipX(true); this.playerFacing = 'left';
        } else if (this.keys.D.isDown) {
            this.setVelocityX(360); this.setFlipX(false); this.playerFacing = 'right';
        } else {
            this.setVelocityX(0);
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.W) && onGround) {
            this.setVelocityY(-600);
            this.play('jumpStart').chain('jumpUp');
        }
        if (Phaser.Input.Keyboard.JustUp(this.keys.W) && this.body.velocity.y < 0) {
            this.setVelocityY(this.body.velocity.y * 0.5);
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.S) && onGround) this.tryDropPlatform();

        if (this.keys.J.isDown) {
            this.keyJHeldTime += delta;
            if (!this.specialAttackTriggeredByHold && this.keyJHeldTime >= this.specialAttackChargeTime && onGround) {
                this.specialAttackTriggeredByHold = true;
                this.initiateAttack('specialAttack');
            }
        }
        if (Phaser.Input.Keyboard.JustUp(this.keys.J)) {
            if (!this.specialAttackTriggeredByHold && this.keyJHeldTime < this.specialAttackChargeTime) {
                if (onGround) {
                    if (!this.comboTimer) this.comboCount = 0;
                    else { this.comboTimer.remove(); this.comboCount++; }
                    if (this.comboCount > 2) this.comboCount = 0;
                    this.initiateAttack(['attack1', 'attack2', 'attack3'][this.comboCount]);
                } else {
                    this.initiateAttack('airAttack');
                }
            }
            this.keyJHeldTime = 0; this.specialAttackTriggeredByHold = false;
        }

        if (Phaser.Input.Keyboard.JustDown(this.keys.L)) this.tryDash(time);
        if (Phaser.Input.Keyboard.JustDown(this.keys.K) && onGround) this.tryParry();
        if (Phaser.Input.Keyboard.JustDown(this.keys.E) && onGround) this.tryHeal();
    }

    tryDropPlatform() {
        if(!this.scene.passablePlatforms) return;
        
        let canDrop = false;
        this.scene.passablePlatforms.children.iterate((plat) => {
            if (Math.abs(this.body.bottom - plat.body.top) <= 5) canDrop = true;
        });
        
        if (canDrop) {
            this.isDroppingDown = true;
            this.body.checkCollision.down = false;
            this.playerState = 'FALL';
            this.scene.time.delayedCall(300, () => {
                if (this.active) this.body.checkCollision.down = true;
                this.isDroppingDown = false;
            });
        }
    }

    tryDash(time) {
        if (time < this.lastDashTime + this.dashCooldownTime) return;
        if (this.stamina < this.dashStaminaCost) return;
        if (!this.body.blocked.down && this.airDashCount >= this.maxAirDashes) return;

        this.stamina -= this.dashStaminaCost;
        this.lastDashTime = time;
        if (!this.body.blocked.down) this.airDashCount++;

        this.clearAttackState();
        this.playerState = 'DASH';
        this.playerInvulnerable = true;
        
        const dir = this.playerFacing === 'right' ? 1 : -1;
        this.setVelocity(dir * 800, 0);
        this.play('dash');

        this.once('animationcomplete-dash', () => {
            this.playerState = 'IDLE';
            this.playerInvulnerable = false;
            this.setVelocityX(0);
        });
    }

    tryParry() {
        if (this.stamina < this.parryStaminaCost) return;
        this.playerState = 'PARRY';
        this.setVelocityX(0);
        this.play('parry');
        this.isParrying = true; this.parrySucceeded = false;

        this.scene.time.delayedCall(this.parryWindow, () => {
            this.isParrying = false;
            if (!this.parrySucceeded) this.stamina -= this.parryStaminaCost;
        });

        this.once('animationcomplete-parry', () => { this.playerState = 'IDLE'; });
    }

    tryHeal() {
        if (this.healCharges <= 0) return;
        this.playerState = 'HEAL';
        this.healCharges--;
        this.setVelocityX(0);
        this.play('healing');
        this.once('animationcomplete-healing', () => {
            this.health = Math.min(this.health + 50, this.maxHealth);
            this.playerState = 'IDLE';
        });
    }

    initiateAttack(animKey) {
        if (animKey === 'specialAttack') {
            if (this.stamina < this.specialAttackStaminaCost) return;
            this.stamina -= this.specialAttackStaminaCost;
        }

        this.playerState = 'ATTACK';
        this.currentAttackAnim = animKey;
        this.setVelocityX(0);
        if (animKey === 'airAttack') this.setVelocityY(0);

        this.enemiesHitThisAttack = [];
        this.play(animKey);

        const attackListener = (anim, frame) => {
            if (anim.key !== animKey) return;

            let active = false;
            let width = 90, height = 55, offsetX = 40, offsetY = 15;

            if (animKey === 'attack1' && frame.index >= 3 && frame.index <= 5) active = true;
            else if (animKey === 'attack2' && frame.index >= 2 && frame.index <= 5) active = true;
            else if (animKey === 'attack3' && frame.index >= 2 && frame.index <= 4) active = true;
            else if (animKey === 'airAttack' && frame.index >= 2) { active = true; width = 90; height = 60; offsetX = 35; offsetY = 20; }
            else if (animKey === 'specialAttack' && frame.index >= 4) { active = true; width = 50; height = 140; offsetX = 45; offsetY = -30; }

            if (active) {
                const dir = this.flipX ? -1 : 1;
                const hitX = this.x + (offsetX * dir);
                const hitY = this.y + offsetY;
                this.attackHitbox.setPosition(hitX, hitY);
                this.attackHitbox.body.setSize(width, height);
                this.attackHitbox.body.enable = true;
            } else {
                this.attackHitbox.body.enable = false;
            }
        };

        this.on(Phaser.Animations.Events.ANIMATION_UPDATE, attackListener);

        this.once('animationcomplete', () => {
            this.clearAttackState();
            this.playerState = 'IDLE';
            if (['attack1', 'attack2'].includes(animKey)) {
                this.comboTimer = this.scene.time.delayedCall(400, () => { this.comboCount = 0; });
            } else {
                this.comboCount = 0;
            }
        });
    }

    clearAttackState() {
        this.off(Phaser.Animations.Events.ANIMATION_UPDATE);
        if(this.attackHitbox) this.attackHitbox.body.enable = false;
    }

    updateAnimations() {
        if (['ATTACK', 'HURT', 'DASH', 'PARRY', 'HEAL'].includes(this.playerState)) return;

        const velY = this.body.velocity.y;
        const currentAnim = this.anims.currentAnim ? this.anims.currentAnim.key : null;

        if (this.playerState === 'RUN') {
            if (currentAnim !== 'run') this.play('run', true);
        }
        else if (this.playerState === 'IDLE') {
            if (currentAnim !== 'idle') this.play('idle', true);
        }
        else if (this.playerState === 'JUMP' || this.playerState === 'FALL') {
            const apexThreshold = 25;
            if (velY < -apexThreshold) {
                if (currentAnim !== 'jumpStart' && currentAnim !== 'jumpUp' && currentAnim !== 'airAttack') this.play('jumpUp', true);
            }
            else if (Math.abs(velY) <= apexThreshold) {
                if (currentAnim === 'jumpUp') this.play('jumpApex').chain('falling');
                else if (currentAnim !== 'jumpApex' && currentAnim !== 'falling' && currentAnim !== 'airAttack' && currentAnim !== 'jumpStart') this.play('falling', true);
            }
            else if (velY > apexThreshold) {
                if (currentAnim !== 'falling' && currentAnim !== 'jumpApex' && currentAnim !== 'airAttack') this.play('falling', true);
            }
        }
    }
}