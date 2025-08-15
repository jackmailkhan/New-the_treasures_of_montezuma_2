
        class TreasuresOfMontezuma {
            constructor() {
                this.canvas = document.getElementById('gameCanvas');
                this.ctx = this.canvas.getContext('2d');
                this.gridSize = 8;
                this.tileSize = 60;
                this.gemTypes = 6;
                this.grid = [];
                this.score = 0;
                this.moves = 30;
                this.level = 1;
                this.targetScore = 1000;
                this.selectedTile = null;
                this.isAnimating = false;
                this.animationSpeed = 8;
                
                // Gem colors for visual representation
                this.gemColors = [
                    '#ff4444', // Red Ruby
                    '#44ff44', // Green Emerald
                    '#4444ff', // Blue Sapphire
                    '#ffff44', // Yellow Topaz
                    '#ff44ff', // Purple Amethyst
                    '#44ffff'  // Cyan Diamond
                ];

                this.init();
                this.bindEvents();
                this.gameLoop();
            }

            init() {
                this.generateGrid();
                this.updateUI();
            }

            generateGrid() {
                // Create initial grid without matches
                this.grid = [];
                for (let row = 0; row < this.gridSize; row++) {
                    this.grid[row] = [];
                    for (let col = 0; col < this.gridSize; col++) {
                        let gemType;
                        do {
                            gemType = Math.floor(Math.random() * this.gemTypes);
                        } while (this.wouldCreateMatch(row, col, gemType));
                        
                        this.grid[row][col] = {
                            type: gemType,
                            x: col * this.tileSize,
                            y: row * this.tileSize,
                            targetX: col * this.tileSize,
                            targetY: row * this.tileSize,
                            scale: 1,
                            alpha: 1
                        };
                    }
                }
            }

            wouldCreateMatch(row, col, gemType) {
                // Check horizontal match
                if (col >= 2 && 
                    this.grid[row] && 
                    this.grid[row][col-1] && 
                    this.grid[row][col-2] &&
                    this.grid[row][col-1].type === gemType && 
                    this.grid[row][col-2].type === gemType) {
                    return true;
                }
                
                // Check vertical match
                if (row >= 2 && 
                    this.grid[row-1] && 
                    this.grid[row-2] &&
                    this.grid[row-1][col] && 
                    this.grid[row-2][col] &&
                    this.grid[row-1][col].type === gemType && 
                    this.grid[row-2][col].type === gemType) {
                    return true;
                }
                
                return false;
            }

            bindEvents() {
                this.canvas.addEventListener('click', (e) => {
                    if (this.isAnimating) return;
                    
                    const rect = this.canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    const col = Math.floor(x / this.tileSize);
                    const row = Math.floor(y / this.tileSize);
                    
                    if (col >= 0 && col < this.gridSize && row >= 0 && row < this.gridSize) {
                        this.handleTileClick(row, col);
                    }
                });
            }

            handleTileClick(row, col) {
                if (!this.selectedTile) {
                    this.selectedTile = {row, col};
                    this.grid[row][col].scale = 1.1;
                } else {
                    if (this.selectedTile.row === row && this.selectedTile.col === col) {
                        // Deselect
                        this.grid[row][col].scale = 1;
                        this.selectedTile = null;
                    } else if (this.areAdjacent(this.selectedTile, {row, col})) {
                        // Attempt swap
                        this.attemptSwap(this.selectedTile, {row, col});
                    } else {
                        // Select new tile
                        this.grid[this.selectedTile.row][this.selectedTile.col].scale = 1;
                        this.selectedTile = {row, col};
                        this.grid[row][col].scale = 1.1;
                    }
                }
            }

            areAdjacent(tile1, tile2) {
                const dx = Math.abs(tile1.col - tile2.col);
                const dy = Math.abs(tile1.row - tile2.row);
                return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
            }

            async attemptSwap(tile1, tile2) {
                if (this.moves <= 0) return;

                // Swap gems
                const temp = this.grid[tile1.row][tile1.col].type;
                this.grid[tile1.row][tile1.col].type = this.grid[tile2.row][tile2.col].type;
                this.grid[tile2.row][tile2.col].type = temp;

                // Check for matches
                const matches = this.findMatches();
                
                if (matches.length > 0) {
                    // Valid move
                    this.moves--;
                    this.grid[tile1.row][tile1.col].scale = 1;
                    this.grid[tile2.row][tile2.col].scale = 1;
                    this.selectedTile = null;
                    
                    await this.animateSwap(tile1, tile2);
                    await this.processMatches();
                    this.updateUI();
                    this.checkWinCondition();
                } else {
                    // Invalid move - swap back
                    const temp2 = this.grid[tile1.row][tile1.col].type;
                    this.grid[tile1.row][tile1.col].type = this.grid[tile2.row][tile2.col].type;
                    this.grid[tile2.row][tile2.col].type = temp2;
                    
                    // Animate failed swap
                    await this.animateSwap(tile1, tile2);
                    await this.animateSwap(tile2, tile1);
                    
                    this.grid[tile1.row][tile1.col].scale = 1;
                    this.selectedTile = null;
                }
            }

            async animateSwap(tile1, tile2) {
                return new Promise(resolve => {
                    this.isAnimating = true;
                    const gem1 = this.grid[tile1.row][tile1.col];
                    const gem2 = this.grid[tile2.row][tile2.col];
                    
                    const startX1 = gem1.x, startY1 = gem1.y;
                    const startX2 = gem2.x, startY2 = gem2.y;
                    const endX1 = tile2.col * this.tileSize, endY1 = tile2.row * this.tileSize;
                    const endX2 = tile1.col * this.tileSize, endY2 = tile1.row * this.tileSize;
                    
                    let progress = 0;
                    const animate = () => {
                        progress += 0.1;
                        if (progress >= 1) {
                            gem1.x = endX1; gem1.y = endY1;
                            gem2.x = endX2; gem2.y = endY2;
                            gem1.targetX = endX1; gem1.targetY = endY1;
                            gem2.targetX = endX2; gem2.targetY = endY2;
                            this.isAnimating = false;
                            resolve();
                            return;
                        }
                        
                        const eased = this.easeInOut(progress);
                        gem1.x = startX1 + (endX1 - startX1) * eased;
                        gem1.y = startY1 + (endY1 - startY1) * eased;
                        gem2.x = startX2 + (endX2 - startX2) * eased;
                        gem2.y = startY2 + (endY2 - startY2) * eased;
                        
                        requestAnimationFrame(animate);
                    };
                    animate();
                });
            }

            findMatches() {
                const matches = [];
                
                // Check horizontal matches
                for (let row = 0; row < this.gridSize; row++) {
                    let count = 1;
                    let currentType = this.grid[row][0].type;
                    
                    for (let col = 1; col < this.gridSize; col++) {
                        if (this.grid[row][col].type === currentType) {
                            count++;
                        } else {
                            if (count >= 3) {
                                for (let i = col - count; i < col; i++) {
                                    matches.push({row, col: i});
                                }
                            }
                            count = 1;
                            currentType = this.grid[row][col].type;
                        }
                    }
                    
                    if (count >= 3) {
                        for (let i = this.gridSize - count; i < this.gridSize; i++) {
                            matches.push({row, col: i});
                        }
                    }
                }
                
                // Check vertical matches
                for (let col = 0; col < this.gridSize; col++) {
                    let count = 1;
                    let currentType = this.grid[0][col].type;
                    
                    for (let row = 1; row < this.gridSize; row++) {
                        if (this.grid[row][col].type === currentType) {
                            count++;
                        } else {
                            if (count >= 3) {
                                for (let i = row - count; i < row; i++) {
                                    matches.push({row: i, col});
                                }
                            }
                            count = 1;
                            currentType = this.grid[row][col].type;
                        }
                    }
                    
                    if (count >= 3) {
                        for (let i = this.gridSize - count; i < this.gridSize; i++) {
                            matches.push({row: i, col});
                        }
                    }
                }
                
                return matches;
            }

            async processMatches() {
                let totalMatches = 0;
                let matches;
                
                do {
                    matches = this.findMatches();
                    if (matches.length > 0) {
                        totalMatches += matches.length;
                        await this.removeMatches(matches);
                        await this.dropGems();
                        await this.fillEmptySpaces();
                    }
                } while (matches.length > 0);
                
                if (totalMatches > 0) {
                    this.score += totalMatches * 100 * this.level;
                }
            }

            async removeMatches(matches) {
                return new Promise(resolve => {
                    this.isAnimating = true;
                    let animationsComplete = 0;
                    
                    matches.forEach(match => {
                        const gem = this.grid[match.row][match.col];
                        const animate = () => {
                            gem.scale -= 0.05;
                            gem.alpha -= 0.05;
                            
                            if (gem.scale <= 0) {
                                gem.scale = 0;
                                gem.alpha = 0;
                                animationsComplete++;
                                
                                if (animationsComplete === matches.length) {
                                    this.isAnimating = false;
                                    resolve();
                                }
                                return;
                            }
                            
                            requestAnimationFrame(animate);
                        };
                        animate();
                    });
                });
            }

            async dropGems() {
                return new Promise(resolve => {
                    this.isAnimating = true;
                    let gemsMoving = 0;
                    
                    // Drop gems down
                    for (let col = 0; col < this.gridSize; col++) {
                        let writeIndex = this.gridSize - 1;
                        
                        for (let row = this.gridSize - 1; row >= 0; row--) {
                            if (this.grid[row][col].alpha > 0) {
                                if (row !== writeIndex) {
                                    this.grid[writeIndex][col] = this.grid[row][col];
                                    this.grid[writeIndex][col].targetY = writeIndex * this.tileSize;
                                    gemsMoving++;
                                }
                                writeIndex--;
                            }
                        }
                        
                        // Clear empty spaces at top
                        for (let row = 0; row <= writeIndex; row++) {
                            this.grid[row][col] = null;
                        }
                    }
                    
                    if (gemsMoving === 0) {
                        this.isAnimating = false;
                        resolve();
                        return;
                    }
                    
                    // Animate falling gems
                    const animateFall = () => {
                        let stillMoving = false;
                        
                        for (let row = 0; row < this.gridSize; row++) {
                            for (let col = 0; col < this.gridSize; col++) {
                                const gem = this.grid[row][col];
                                if (gem && gem.y < gem.targetY) {
                                    gem.y = Math.min(gem.y + this.animationSpeed, gem.targetY);
                                    if (gem.y < gem.targetY) stillMoving = true;
                                }
                            }
                        }
                        
                        if (stillMoving) {
                            requestAnimationFrame(animateFall);
                        } else {
                            this.isAnimating = false;
                            resolve();
                        }
                    };
                    animateFall();
                });
            }

            async fillEmptySpaces() {
                return new Promise(resolve => {
                    this.isAnimating = true;
                    
                    // Fill empty spaces with new gems
                    for (let col = 0; col < this.gridSize; col++) {
                        for (let row = 0; row < this.gridSize; row++) {
                            if (!this.grid[row][col]) {
                                this.grid[row][col] = {
                                    type: Math.floor(Math.random() * this.gemTypes),
                                    x: col * this.tileSize,
                                    y: -this.tileSize * (this.gridSize - row),
                                    targetX: col * this.tileSize,
                                    targetY: row * this.tileSize,
                                    scale: 1,
                                    alpha: 1
                                };
                            }
                        }
                    }
                    
                    // Animate new gems falling
                    const animateFall = () => {
                        let stillMoving = false;
                        
                        for (let row = 0; row < this.gridSize; row++) {
                            for (let col = 0; col < this.gridSize; col++) {
                                const gem = this.grid[row][col];
                                if (gem && gem.y < gem.targetY) {
                                    gem.y = Math.min(gem.y + this.animationSpeed, gem.targetY);
                                    if (gem.y < gem.targetY) stillMoving = true;
                                }
                            }
                        }
                        
                        if (stillMoving) {
                            requestAnimationFrame(animateFall);
                        } else {
                            this.isAnimating = false;
                            resolve();
                        }
                    };
                    animateFall();
                });
            }

            drawGem(gem, row, col) {
                if (!gem || gem.alpha <= 0) return;
                
                this.ctx.save();
                this.ctx.globalAlpha = gem.alpha;
                this.ctx.translate(gem.x + this.tileSize/2, gem.y + this.tileSize/2);
                this.ctx.scale(gem.scale, gem.scale);
                
                // Draw gem background
                this.ctx.fillStyle = this.gemColors[gem.type];
                this.ctx.beginPath();
                this.ctx.arc(0, 0, this.tileSize/2 - 4, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add gem shine effect
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.beginPath();
                this.ctx.arc(-8, -8, this.tileSize/4, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Draw gem border
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(0, 0, this.tileSize/2 - 4, 0, Math.PI * 2);
                this.ctx.stroke();
                
                this.ctx.restore();
            }

            render() {
                // Clear canvas
                this.ctx.fillStyle = '#1a1a1a';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Draw grid background
                this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
                this.ctx.lineWidth = 1;
                for (let i = 0; i <= this.gridSize; i++) {
                    // Vertical lines
                    this.ctx.beginPath();
                    this.ctx.moveTo(i * this.tileSize, 0);
                    this.ctx.lineTo(i * this.tileSize, this.gridSize * this.tileSize);
                    this.ctx.stroke();
                    
                    // Horizontal lines
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, i * this.tileSize);
                    this.ctx.lineTo(this.gridSize * this.tileSize, i * this.tileSize);
                    this.ctx.stroke();
                }
                
                // Draw gems
                for (let row = 0; row < this.gridSize; row++) {
                    for (let col = 0; col < this.gridSize; col++) {
                        const gem = this.grid[row][col];
                        if (gem) {
                            this.drawGem(gem, row, col);
                        }
                    }
                }
            }

            updateUI() {
                document.getElementById('scoreDisplay').textContent = this.score;
                document.getElementById('movesDisplay').textContent = this.moves;
                document.getElementById('currentLevel').textContent = this.level;
                document.getElementById('levelDisplay').textContent = this.level;
                document.getElementById('targetDisplay').textContent = this.targetScore;
            }

            checkWinCondition() {
                if (this.score >= this.targetScore) {
                    this.showMessage('Level Complete!', () => {
                        this.nextLevel();
                    });
                } else if (this.moves <= 0) {
                    this.showMessage('Game Over!', () => {
                        this.resetLevel();
                    });
                }
            }

            nextLevel() {
                this.level++;
                this.targetScore = this.level * 1000;
                this.moves = 30;
                this.generateGrid();
                this.updateUI();
            }

            resetLevel() {
                this.score = Math.max(0, this.score - 500);
                this.moves = 30;
                this.generateGrid();
                this.updateUI();
            }

            newGame() {
                this.level = 1;
                this.score = 0;
                this.moves = 30;
                this.targetScore = 1000;
                this.selectedTile = null;
                this.generateGrid();
                this.updateUI();
            }

            showMessage(text, callback = null) {
                const messageEl = document.getElementById('gameMessage');
                messageEl.textContent = text;
                messageEl.style.display = 'block';
                
                setTimeout(() => {
                    messageEl.style.display = 'none';
                    if (callback) callback();
                }, 2000);
            }

            easeInOut(t) {
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            }

            gameLoop() {
                this.render();
                requestAnimationFrame(() => this.gameLoop());
            }
        }

        // Initialize the game
        const game = new TreasuresOfMontezuma();
    
