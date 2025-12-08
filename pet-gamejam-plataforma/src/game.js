// Configuração principal do jogo Phaser
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#00000', // Cor de fundo do jogo
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 900 },
            debug: false
        }
    },
    render: {
        pixelArt: true,
        antialias: false,
        roundPixels: true
    },
    scene: [Level1Scene, Level2Scene, Level3Scene, Level4Scene, EndingScene]
};

// Cria uma nova instância do jogo com a configuração
const game = new Phaser.Game(config);