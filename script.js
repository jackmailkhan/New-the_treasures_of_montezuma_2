 
        // Game constants
        const GRID_SIZE = 8;
        const GEM_TYPES = 5;
        const GEM_SIZE = 50;
        const GEM_PADDING = 2;
        const BOARD_OFFSET_X = 25;
        const BOARD_OFFSET_Y = 25;
        const ANIMATION_DURATION = 200;

        // Game variables
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        let grid = [];
        let score = 0;
        let selectedGem = null;
        let isAnimating = false;
        let animationStart = 0;
        let swapFrom = null;
        let swapTo = null;
        let animationFrameId = null;

        // Screen elements
        const mainMenu = document.getElementById('main-menu');
        const instructionsScreen = document.getElementById('instructions-screen');
        const aboutScreen = document.getElementById('about-screen');
        const gameScreen = document.getElementById('game-screen');
        const scoreDisplay = document.getElementById('score-display');

        // Button elements
        const playBtn = document.getElementById('play-btn');
        const instructionsBtn = document.getElementById('instructions-btn');
        const aboutBtn = document.getElementById('about-btn');
        const instructionsBackBtn = document.getElementById('instructions-back-btn');
        const aboutBackBtn = document.getElementById('about-back-btn');
        const restartBtn = document.getElementById('restart-btn');
        const gameMenuBtn = document.getElementById('game-menu-btn');

        // Gem colors
        const gemColors = [
            '#FF0000', // Red
            '#1E90FF', // Blue
            '#00FF00', // Green
            '#FFFF00', // Yellow
            '#9370DB'  // Purple
        ];

        // Initialize the game
        function initGame() {
            // Cancel any existing animation frame
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            
            // Set canvas size
            canvas.width = GRID_SIZE * (GEM_SIZE + GEM_PADDING) + BOARD_OFFSET_X * 2;
            canvas.height = GRID_SIZE * (GEM_SIZE + GEM_PADDING) + BOARD_OFFSET_Y * 2;

            // Initialize grid
            grid = [];
            for (let row = 0; row < GRID_SIZE; row++) {
                grid[row] = [];
                for (let col = 0; col < GRID_SIZE; col++) {
                    grid[row][col] = {
                        type: Math.floor(Math.random() * GEM_TYPES),
                        x: col * (GEM_SIZE + GEM_PADDING) + BOARD_OFFSET_X,
                        y: row * (GEM_SIZE + GEM_PADDING) + BOARD_OFFSET_Y
                    };
                }
            }

            // Remove initial matches
            while (findMatches().length > 0) {
                removeMatches();
                dropGems();
                fillEmptySpaces();
            }

            score = 0;
            updateScore();
            drawBoard();
        }

        // Draw the game board
        function drawBoard() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw gems
            for (let row = 0; row < GRID_SIZE; row++) {
                for (let col = 0; col < GRID_SIZE; col++) {
                    const gem = grid[row][col];
                    if (gem) {
                        drawGem(gem.x, gem.y, gem.type, gem === selectedGem);
                    }
                }
            }

            // Draw animation if in progress
            if (isAnimating) {
                const progress = Math.min(1, (Date.now() - animationStart) / ANIMATION_DURATION);
                
                const fromGem = grid[swapFrom.row][swapFrom.col];
                const toGem = grid[swapTo.row][swapTo.col];

                // Calculate intermediate positions
                const fromX = fromGem.x + (toGem.x - fromGem.x) * progress;
                const fromY = fromGem.y + (toGem.y - fromGem.y) * progress;
                const toX = toGem.x + (fromGem.x - toGem.x) * progress;
                const toY = toGem.y + (fromGem.y - toGem.y) * progress;

                // Draw moving gems
                drawGem(fromX, fromY, fromGem.type, false);
                drawGem(toX, toY, toGem.type, false);

                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(drawBoard);
                    return;
                } else {
                    // Animation complete
                    isAnimating = false;
                    completeSwap();
                }
            }

            animationFrameId = requestAnimationFrame(drawBoard);
        }

        // Draw a single gem
        function drawGem(x, y, type, isSelected) {
            // Gem shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 5;

            // Gem body
            const gradient = ctx.createRadialGradient(
                x + GEM_SIZE/4, y + GEM_SIZE/4, GEM_SIZE/10,
                x + GEM_SIZE/2, y + GEM_SIZE/2, GEM_SIZE/2
            );
            gradient.addColorStop(0, gemColors[type]);
            gradient.addColorStop(1, darkenColor(gemColors[type], 30));

            ctx.beginPath();
            ctx.roundRect = ctx.roundRect || function(x, y, w, h, r) {
                if (w < 2 * r) r = w / 2;
                if (h < 2 * r) r = h / 2;
                this.moveTo(x + r, y);
                this.arcTo(x + w, y, x + w, y + h, r);
                this.arcTo(x + w, y + h, x, y + h, r);
                this.arcTo(x, y + h, x, y, r);
                this.arcTo(x, y, x + w, y, r);
            };
            ctx.roundRect(x, y, GEM_SIZE, GEM_SIZE, 10);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Reset shadow
            ctx.shadowColor = 'transparent';

            // Gem highlight
            if (isSelected) {
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            // Gem inner shine
            ctx.beginPath();
            ctx.arc(x + GEM_SIZE/3, y + GEM_SIZE/3, GEM_SIZE/5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
        }

        // Darken a color
        function darkenColor(color, percent) {
            const num = parseInt(color.replace('#', ''), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) - amt;
            const G = (num >> 8 & 0x00FF) - amt;
            const B = (num & 0x0000FF) - amt;
            return '#' + (
                0x1000000 +
                (R < 0 ? 0 : R) * 0x10000 +
                (G < 0 ? 0 : G) * 0x100 +
                (B < 0 ? 0 : B)
            ).toString(16).slice(1);
        }

        // Handle gem selection
        function selectGem(row, col) {
            if (isAnimating) return;

            const gem = grid[row][col];
            if (!selectedGem) {
                selectedGem = gem;
            } else {
                // Check if gems are adjacent
                const selectedRow = Math.floor((selectedGem.y - BOARD_OFFSET_Y) / (GEM_SIZE + GEM_PADDING));
                const selectedCol = Math.floor((selectedGem.x - BOARD_OFFSET_X) / (GEM_SIZE + GEM_PADDING));

                if ((Math.abs(selectedRow - row) === 1 && selectedCol === col) || 
                    (Math.abs(selectedCol - col) === 1 && selectedRow === row)) {
                    // Swap gems
                    swapFrom = { row: selectedRow, col: selectedCol };
                    swapTo = { row, col };
                    isAnimating = true;
                    animationStart = Date.now();
                }
                selectedGem = null;
            }
        }

        // Complete the swap after animation
        function completeSwap() {
            // Swap gems in grid
            const tempType = grid[swapFrom.row][swapFrom.col].type;
            grid[swapFrom.row][swapFrom.col].type = grid[swapTo.row][swapTo.col].type;
            grid[swapTo.row][swapTo.col].type = tempType;

            // Check for matches
            const matches = findMatches();
            if (matches.length > 0) {
                removeMatches();
                dropGems();
                fillEmptySpaces();
            } else {
                // No matches, swap back
                const tempType = grid[swapFrom.row][swapFrom.col].type;
                grid[swapFrom.row][swapFrom.col].type = grid[swapTo.row][swapTo.col].type;
                grid[swapTo.row][swapTo.col].type = tempType;
            }
        }

        // Find all matches on the board
        function findMatches() {
            const matches = [];

            // Check horizontal matches
            for (let row = 0; row < GRID_SIZE; row++) {
                for (let col = 0; col < GRID_SIZE - 2; col++) {
                    const type = grid[row][col].type;
                    if (type === grid[row][col + 1].type && type === grid[row][col + 2].type) {
                        let match = [{ row, col }, { row, col: col + 1 }, { row, col: col + 2 }];
                        
                        // Check for longer matches
                        let nextCol = col + 3;
                        while (nextCol < GRID_SIZE && grid[row][nextCol].type === type) {
                            match.push({ row, col: nextCol });
                            nextCol++;
                        }
                        
                        matches.push(match);
                        col = nextCol - 1;
                    }
                }
            }

            // Check vertical matches
            for (let col = 0; col < GRID_SIZE; col++) {
                for (let row = 0; row < GRID_SIZE - 2; row++) {
                    const type = grid[row][col].type;
                    if (type === grid[row + 1][col].type && type === grid[row + 2][col].type) {
                        let match = [{ row, col }, { row: row + 1, col }, { row: row + 2, col }];
                        
                        // Check for longer matches
                        let nextRow = row + 3;
                        while (nextRow < GRID_SIZE && grid[nextRow][col].type === type) {
                            match.push({ row: nextRow, col });
                            nextRow++;
                        }
                        
                        matches.push(match);
                        row = nextRow - 1;
                    }
                }
            }

            return matches;
        }

        // Remove matched gems
        function removeMatches() {
            const matches = findMatches();
            let pointsEarned = 0;

            for (const match of matches) {
                pointsEarned += match.length * 10; // 10 points per gem
                for (const pos of match) {
                    grid[pos.row][pos.col].type = -1; // Mark for removal
                }
            }

            score += pointsEarned;
            updateScore();
        }

        // Drop gems to fill empty spaces
        function dropGems() {
            for (let col = 0; col < GRID_SIZE; col++) {
                let emptyRow = GRID_SIZE - 1;
                
                for (let row = GRID_SIZE - 1; row >= 0; row--) {
                    if (grid[row][col].type !== -1) {
                        if (row !== emptyRow) {
                            grid[emptyRow][col].type = grid[row][col].type;
                            grid[row][col].type = -1;
                        }
                        emptyRow--;
                    }
                }
            }
        }

        // Fill empty spaces at the top with new gems
        function fillEmptySpaces() {
            for (let row = 0; row < GRID_SIZE; row++) {
                for (let col = 0; col < GRID_SIZE; col++) {
                    if (grid[row][col].type === -1) {
                        grid[row][col].type = Math.floor(Math.random() * GEM_TYPES);
                    }
                }
            }

            // Check for new matches after filling
            if (findMatches().length > 0) {
                setTimeout(() => {
                    removeMatches();
                    dropGems();
                    fillEmptySpaces();
                }, 300);
            }
        }

        // Update score display
        function updateScore() {
            scoreDisplay.textContent = `Score: ${score}`;
        }

        // Event listeners for canvas clicks
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const col = Math.floor((x - BOARD_OFFSET_X) / (GEM_SIZE + GEM_PADDING));
            const row = Math.floor((y - BOARD_OFFSET_Y) / (GEM_SIZE + GEM_PADDING));

            if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
                selectGem(row, col);
            }
        });

        // Screen navigation
        playBtn.addEventListener('click', () => {
            mainMenu.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            initGame();
        });

        instructionsBtn.addEventListener('click', () => {
            mainMenu.classList.add('hidden');
            instructionsScreen.classList.remove('hidden');
        });

        aboutBtn.addEventListener('click', () => {
            mainMenu.classList.add('hidden');
            aboutScreen.classList.remove('hidden');
        });

        instructionsBackBtn.addEventListener('click', () => {
            instructionsScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        });

        aboutBackBtn.addEventListener('click', () => {
            aboutScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
        });

        restartBtn.addEventListener('click', () => {
            initGame();
        });

        gameMenuBtn.addEventListener('click', () => {
            gameScreen.classList.add('hidden');
            mainMenu.classList.remove('hidden');
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        });

        // Initialize the game when page loads
        window.addEventListener('load', () => {
            // Set canvas size initially
            canvas.width = GRID_SIZE * (GEM_SIZE + GEM_PADDING) + BOARD_OFFSET_X * 2;
            canvas.height = GRID_SIZE * (GEM_SIZE + GEM_PADDING) + BOARD_OFFSET_Y * 2;
            
            // Start the main menu
            mainMenu.classList.remove('hidden');
        });
   
