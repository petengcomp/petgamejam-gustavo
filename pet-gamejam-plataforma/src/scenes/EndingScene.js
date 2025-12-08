class EndingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndingScene' });
    }

    preload() {
        if (typeof Player !== 'undefined') {
            Player.preload(this);
        }
        this.load.tilemapTiledJSON('graveyardMap', 'assets/maps/level5.json');
    }

    create() {
        this.cameras.main.fadeIn(2000, 255, 255, 255);
        
        const map = this.make.tilemap({ key: 'graveyardMap' });
        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        // --- TILESETS ---
        const tilesetChao = map.addTilesetImage('chao_tileset', 'chaoTilesetImg');
        const tilesetDecor = map.addTilesetImage('Decor', 'decorImg');
        const tilesetWalls = map.addTilesetImage('wallsTower', 'wallsImg');
        const tilesetEnv = map.addTilesetImage('env_objectsTower', 'envImg');
        const tilesetGround = map.addTilesetImage('groundTower', 'groundTowerImg');
        const tilesetSidescroller = map.addTilesetImage('sidescroller', 'sidescrollerImg');
        const tilesetBg1 = map.addTilesetImage('background', 'bg1Img');
        const tilesetBg2 = map.addTilesetImage('background2', 'bg2Img');
        
        const allTilesets = [tilesetChao, tilesetDecor, tilesetWalls, tilesetEnv, tilesetGround, tilesetSidescroller, tilesetBg1, tilesetBg2].filter(t => t !== null);

        const tintColor = 0x222255; 

        // --- CAMADAS (Nomes corrigidos com o prefixo 'fundo/') ---
        
        const layerBg1 = map.createLayer('fundo/layer1', allTilesets, 0, 0);
        if(layerBg1) layerBg1.setScrollFactor(0.5).setTint(tintColor);

        // [CORREÇÃO AQUI] Adicionado 'fundo/' antes dos nomes
        const layerBg2 = map.createLayer('fundo/layer2', allTilesets, 0, 0);
        if(layerBg2) layerBg2.setScrollFactor(0.6).setTint(tintColor);

        const layerBg3 = map.createLayer('fundo/layer3', allTilesets, 0, 0);
        if(layerBg3) layerBg3.setScrollFactor(0.7).setTint(tintColor);

        const layerBg4 = map.createLayer('fundo/layer4', allTilesets, 0, 0);
        if(layerBg4) layerBg4.setScrollFactor(0.8).setTint(tintColor);

        const layerBg5 = map.createLayer('fundo/layer5', allTilesets, 0, 0);
        if(layerBg5) layerBg5.setScrollFactor(0.9).setTint(tintColor);

        const groundLayer = map.createLayer('ChaoSolido', allTilesets, 0, 0);
        if(groundLayer) {
            groundLayer.setTint(tintColor);
            groundLayer.setCollisionByProperty({ collides: true });
        }

        const detalhesLayer = map.createLayer('Detalhes', allTilesets, 0, 0);
        if(detalhesLayer) detalhesLayer.setTint(tintColor);

        // --- PLAYER ---
        this.player = new Player(this, 400, 450); 
        this.player.setTint(0x555588); 
        
        if(groundLayer) this.physics.add.collider(this.player, groundLayer);

        this.cameras.main.setBounds(0, 0, 800, 600);

        // --- CHUVA ---
        this.createRain();

        // Inicia a caminhada
        this.time.delayedCall(2000, () => {
            this.startEndingWalk();
        });
    }

    createRain() {
        this.add.particles(0, 0, 'sparkle_tex', {
            x: { min: -200, max: 1200 }, 
            y: -50,
            lifespan: 2000, 
            speedY: { min: 300, max: 500 },
            speedX: -100, 
            scaleY: 3, scaleX: 0.1, quantity: 2, 
            tint: 0xaaccff, alpha: 0.3
        });
    }

    startEndingWalk() {
        this.player.playerState = 'CUTSCENE'; 
        this.player.play('run', true);
        
        this.player.setCollideWorldBounds(false);
        this.player.body.setAllowGravity(false);
        this.player.setVelocityY(0);

        this.player.setFlipX(true); 
        this.player.setVelocityX(-80); 

        const endText = this.add.text(400, 200, "A Lâmina está saciada.", {
            fontFamily: 'Georgia', fontSize: '24px', fill: '#ffffff', fontStyle: 'italic',
            stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setAlpha(0).setScrollFactor(0).setDepth(100);
        
        this.tweens.add({ targets: endText, alpha: 1, duration: 2000 });
          
        this.time.delayedCall(5000, () => {
            this.cameras.main.fade(4000, 0, 0, 0); 
            
            this.cameras.main.once('camerafadeoutcomplete', () => {
                // 1. Limpa a tela
                this.children.removeAll(); 
                this.cameras.main.stopFollow();
                this.cameras.main.setScroll(0, 0);

                // [CORREÇÃO CRÍTICA]
                // Define o fundo como preto real
                this.cameras.main.setBackgroundColor('#000000');
                // Remove a "cortina" do fade para podermos ver o novo texto
                this.cameras.main.resetFX(); 

                // 2. Inicia o Epílogo
                this.showEpilogue();
            });
        });
    }

    showEpilogue() {
        // As frases da revelação
        const lines = [
            "A chuva lavou o sangue do dojo, mas não da minha memória.",
            "Eu acreditava que a Torre era minha provação final...", 
            "Mas os 'Ecos' não eram monstros. Eram meus irmãos.",
            "Eu não queria matar meu Mestre. Eu só queria o orgulho dele.",
            "Toquei na Lâmina Proibida para provar minha força.",
            "Ela não me corrompeu à força. Minha ambição abriu a porta.",
            "A jornada acabou. Mas o pesadelo apenas começou."
        ];

        let index = 0;

        // Função recursiva para mostrar uma linha, esperar, esconder e chamar a próxima
        const showNextLine = () => {
            if (index >= lines.length) {
                // FIM DE TUDO
                this.time.delayedCall(2000, () => {
                    const fim = this.add.text(400, 300, "FIM", { 
                        fontSize: '60px', fontFamily: 'Georgia', color: '#aa0000', fontStyle: 'bold' 
                    }).setOrigin(0.5).setAlpha(0);
                    
                    this.tweens.add({ targets: fim, alpha: 1, duration: 3000 });
                    
                });
                return;
            }

            // Cria o texto centralizado
            const text = this.add.text(400, 300, lines[index], {
                fontFamily: 'Georgia', 
                fontSize: '26px', 
                fill: '#cccccc', 
                align: 'center',
                wordWrap: { width: 600 } // Quebra linha se for muito longa
            }).setOrigin(0.5).setAlpha(0);

            // Animação: Aparece -> Espera -> Some
            this.tweens.add({
                targets: text,
                alpha: 1,
                duration: 1500, // Tempo para aparecer (Fade In)
                hold: 3500,     // Tempo que fica na tela (Leitura)
                yoyo: true,     // Faz o Fade Out automaticamente
                onComplete: () => {
                    text.destroy(); // Remove o texto
                    index++;        // Vai para a próxima frase
                    this.time.delayedCall(500, showNextLine); // Pequena pausa antes da próxima
                }
            });
        };

        // Começa a primeira frase
        showNextLine();
    }
}