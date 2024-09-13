window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    let shutterOuter = document.querySelector('.shutter-outer');
    let gameEnd = document.querySelector('.game-end');
    let gallery = document.querySelector('.gallery');
    let galleryHeading = document.querySelector('.gallery-heading');
    let clock = document.querySelector('.clock');
    let resultsCategories = document.querySelector('.game-end .results-categories');

    const tileSize = 8; // Size of each tile in pixels
    const rows = Math.ceil(canvas.height / tileSize);
    const cols = Math.ceil(canvas.width / tileSize);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    let tick = 0;

    let snapshotMode = false;
    let snapshotTick = 0;
    const snapshotDuration = 50; // Duration of snapshot effect in frames

    function interpolateColor(start, end, factor) {
        return {
            r: Math.round(start.r + (end.r - start.r) * factor),
            g: Math.round(start.g + (end.g - start.g) * factor),
            b: Math.round(start.b + (end.b - start.b) * factor)
        };
    };

    function snapToGrid(val, gridSize) {
        return gridSize * Math.round(val / gridSize);
    }

    function noise2d(x, y, seed = 0) {
        function fade(t) { return t * t * (3 - 2 * t); }
        function lerp(a, b, t) { return a + t * (b - a); }

        function random2D(ix, iy, seed) {
            const n = ix + iy * 57 + seed * 131;
            return Math.sin(n) * 43758.5453 - Math.floor(Math.sin(n) * 43758.5453);
        }

        const x0 = Math.floor(x), x1 = x0 + 1;
        const y0 = Math.floor(y), y1 = y0 + 1;

        const sx = fade(x - x0);
        const sy = fade(y - y0);

        const n0 = random2D(x0, y0, seed);
        const n1 = random2D(x1, y0, seed);
        const ix0 = lerp(n0, n1, sx);

        const n2 = random2D(x0, y1, seed);
        const n3 = random2D(x1, y1, seed);
        const ix1 = lerp(n2, n3, sx);

        return lerp(ix0, ix1, sy);
    }

    class Game {
        constructor() {
            this.seed = Math.random() * 25565;

            this.photos = [];

            this.trees = [];

            this.isFinished = false;
            
            // Create off-screen canvas for trees
            this.treeCanvas = document.createElement('canvas');
            this.treeCanvas.width = canvas.width;
            this.treeCanvas.height = canvas.height;
            this.treeCtx = this.treeCanvas.getContext('2d');

            this.skyColor = { r: 100, g: 150, b: 255 };
            this.darkenFactor = 0.1; // Adjust darkening factor here

            // Adjust the length and start positions of the lines
            for (let i = 0; i < 5000; i++) {
                const angle = Math.random() * 2 * Math.PI;

                // Start positions further out from the center
                const startRadius = Math.random() * (canvas.width / 2 - 50); // Start further from the center
                const x1 = centerX + Math.cos(angle) * (startRadius + 300);
                const y1 = centerY + Math.sin(angle) * (startRadius + 300);
                const distanceFromCenter = Math.hypot(x1 - centerX, y1 - centerY);
                const maxTreeLength = canvas.height / 2; // Maximum length to cover the canvas
                const length = maxTreeLength * (distanceFromCenter / (canvas.width / 2)); // Extend to edges
                const width = Math.min(20, 2 + (distanceFromCenter / (canvas.width / 2)) * 10); // Increase width

                const x2 = centerX + Math.cos(angle) * (startRadius + length);
                const y2 = centerY + Math.sin(angle) * (startRadius + length);

                // Ensure that tree lines do not intersect with the center empty area
                if (Math.hypot(x1 - centerX, y1 - centerY) < canvas.width / 4 && 
                    Math.hypot(x2 - centerX, y2 - centerY) < canvas.width / 4) {
                    continue; // Skip adding this tree if it intersects with the empty area
                }

                this.trees.push({
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                    width: width,
                });
            }
            
            // Render trees to the off-screen canvas
            this.renderTrees();
            this.gameloop();
        }

        drawTile(x, y, color) {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, tileSize, tileSize);
        }

        drawSky() {
            const darkenedColor = interpolateColor(this.skyColor, { r: 0, g: 0, b: 0 }, this.darkenFactor * (tick / 100));
            ctx.globalAlpha = 1;
            ctx.fillStyle = `rgb(${darkenedColor.r},${darkenedColor.g},${darkenedColor.b})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }

        drawAurora() {
            const layers = 4; // Increase layers for a richer effect
        
            for (let layer = 0; layer < layers; layer++) {
                let layerOffset = layer * 0.05;
                let speedMultiplier = 0.0001 + (Math.pow(layer + 1, 2) * 0.75) * 0.01; // Adjusted speed multiplier for smoother motion
        
                for (let x = 0; x < cols; x++) {
                    for (let y = 0; y < rows; y++) {
                        let p = noise2d((x * 0.5 + tick * speedMultiplier) / (3 + layer), (y * 0.5 + tick * speedMultiplier + layerOffset) / (3 + layer), this.seed);
        
                        let val = Math.pow(p, 1.5) * 255; // Smooth color transitions
                        let green = Math.min(val * 1.2, 200);
                        let blue = Math.min(val * 0.6 + Math.sin((tick + layerOffset) * 0.05) * 40, 180); // Adjusted sine function for smoother transitions
                        let red = Math.min(val * 0.2 + Math.cos((tick + layerOffset) * 0.005) * 30, 150); // Adjusted cosine function for smoother transitions
        
                        let alphap = noise2d((x * 0.2 + tick * speedMultiplier) / 500, (y * 0.2 + tick * speedMultiplier + layerOffset) / 500);
        
                        let alpha = (Math.pow(p, 2) * 0.3 + 0.1 * (1 / (layer + 1))) - alphap;
                        alpha = Math.max(0, Math.min(alpha, 1)); // Ensure alpha is within bounds
        
                        // Apply snapshot effect
                        if (snapshotMode) {
                            let snapshotFactor = snapshotTick / snapshotDuration;
                            canvas.style.border = '4px solid rgba(' + (snapshotFactor * 255) + ',' + (snapshotFactor * 255) + ',' + (snapshotFactor * 255) + ', 1)';
                            green = Math.min(green * (1 + snapshotFactor * 0.2), 255);
                            blue = Math.min(blue * (1 + snapshotFactor * 0.2), 255);
                            red = Math.min(red * (1 + snapshotFactor * 0.2), 255);
                            alpha = Math.min(alpha * (1 + snapshotFactor * 0.4), 1);
                        }
        
                        ctx.fillStyle = `rgba(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)}, ${alpha})`;
                        ctx.fillRect(
                            x * tileSize,
                            y * tileSize,
                            tileSize,
                            tileSize
                        );
                    }
                }
            }
        }
        
        
        

        renderTrees() {
            this.treeCtx.clearRect(0, 0, this.treeCanvas.width, this.treeCanvas.height);

            // Define the start and end colors for the trees
            const startColor = { r: 250, g: 120, b: 0 }; // Dark green
            const endColor = { r: 15, g: 15, b: 30 };    // Black

            // Function to interpolate colors
            function interpolateColor(start, end, factor) {
                return {
                    r: Math.round(start.r + (end.r - start.r) * factor),
                    g: Math.round(start.g + (end.g - start.g) * factor),
                    b: Math.round(start.b + (end.b - start.b) * factor)
                };
            }

            // Calculate darkening factor based on tick
            const maxTicks = 1000; // Number of ticks for a full transition
            const darkenFactor = Math.min(1, tick / maxTicks); // Ensure the factor is between 0 and 1

            // Calculate the tree color based on the time
            const baseColor = interpolateColor(startColor, endColor, darkenFactor);

            // Get the center of the canvas
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            // Function to calculate darkness based on distance from the center
            function getDarknessFactor(x, y) {
                const distance = Math.hypot(x - centerX, y - centerY);
                const maxDistance = Math.hypot(centerX, centerY);
                return Math.min(1, distance / maxDistance);
            }

            for (let i = 0; i < this.trees.length; i++) {
                let tree = this.trees[i];

                const dx = tree.x2 - tree.x1;
                const dy = tree.y2 - tree.y1;
                const lineLength = Math.sqrt(dx * dx + dy * dy);
                const numTiles = Math.ceil(lineLength / tileSize);

                for (let j = 0; j < numTiles; j++) {
                    const t = j / numTiles;
                    const tx = tree.x1 + dx * t;
                    const ty = tree.y1 + dy * t;

                    const gridX = snapToGrid(tx - tree.width / 2, tileSize);
                    const gridY = snapToGrid(ty - tree.width / 2, tileSize);

                    // Calculate the darkness based on the distance from the center
                    const darknessFactor = getDarknessFactor(tx, ty);
                    const finalColor = interpolateColor(baseColor, endColor, darknessFactor);

                    this.treeCtx.fillStyle = `rgb(${finalColor.r}, ${finalColor.g}, ${finalColor.b})`;
                    this.treeCtx.fillRect(gridX, gridY, tileSize, tileSize); // Draw filled tile
                }
            }

            ctx.drawImage(this.treeCanvas, 0, 0); // Draw the off-screen canvas to the main canvas
        }

        updateClock() {
            if (this.isFinished) {
                return;
            }

            // Simulate time: Start at 8 PM and increment
            const startHour = 20;
            const totalMinutes = ((startHour + ((tick * 0.25) / 60)) % 24) * 60;
            const now = new Date();
            now.setHours(Math.floor(totalMinutes / 60));
            now.setMinutes(totalMinutes % 60);
            now.setSeconds(0);

            const hours = now.getHours();
            const minutes = now.getMinutes();
            const seconds = now.getSeconds();
            const ampm = hours >= 12 ? 'PM' : 'AM';

            const formattedHours = hours % 12 || 12;
            const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
            const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

            const timeString = `${formattedHours}:${formattedMinutes}:${formattedSeconds} ${ampm}`;
            clock.innerHTML = timeString;

            if (formattedHours == 8 && ampm == 'AM') {
                this.endGame();
            }
        }

        snapShotEffect() {
            snapshotMode = true;
            snapshotTick = 0;
        }

        calculateSharpness(imageData) {
            const width = imageData.width;
            const height = imageData.height;
            const data = imageData.data;
            let sum = 0;

            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const i = (y * width + x) * 4;
                    const gx = (
                        -data[i - width * 4 - 4] - 2 * data[i - 4] - data[i + width * 4 - 4] +
                        data[i - width * 4 + 4] + 2 * data[i + 4] + data[i + width * 4 + 4]
                    );
                    const gy = (
                        -data[i - width * 4 - 4] - 2 * data[i - width * 4] - data[i - width * 4 + 4] +
                        data[i + width * 4 - 4] + 2 * data[i + width * 4] + data[i + width * 4 + 4]
                    );
                    sum += gx * gx + gy * gy;
                }
            }
            return sum;
        }

        calculateContrast(imageData) {
            const data = imageData.data;
            let sum = 0;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const gray = (r + g + b) / 3;
                sum += gray * gray;
            }
            const mean = sum / (data.length / 4);
            return Math.sqrt(mean);
        }

        analyzeColorDistribution(imageData) {
            const data = imageData.data;
            let hSum = 0, sSum = 0, vSum = 0, count = 0;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i] / 255;
                const g = data[i + 1] / 255;
                const b = data[i + 2] / 255;
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const delta = max - min;

                let h = 0;
                if (delta === 0) {
                    h = 0;
                } else if (max === r) {
                    h = ((g - b) / delta) % 6;
                } else if (max === g) {
                    h = (b - r) / delta + 2;
                } else {
                    h = (r - g) / delta + 4;
                }
                h = (h * 60 + 360) % 360;

                const s = max === 0 ? 0 : delta / max;
                const v = max;

                hSum += h;
                sSum += s;
                vSum += v;
                count++;
            }

            return [hSum / count, sSum / count, vSum / count];
        }

        assignSharpnessPoints(sharpness) {
            if (sharpness <= 500) return 0;
            if (sharpness <= 1000) return 1;
            if (sharpness <= 1500) return 2;
            return 3;
        }

        assignContrastPoints(contrast) {
            if (contrast <= 50) return 0;
            if (contrast <= 100) return 1;
            if (contrast <= 150) return 2;
            return 3;
        }

        assignColorPoints(colorDistribution) {
            const [h, s, v] = colorDistribution;
            // Example thresholds - adjust as needed
            if (s < 0.2) return 0; // Low saturation
            if (s < 0.5) return 1; // Moderate saturation
            if (s < 0.8) return 2; // Good saturation
            return 3; // Excellent saturation
        }

        async judgeImages(dataURLs) {
            const scores = {
                sharpness: [],
                contrast: [],
                colorDistribution: []
            };
        
            // Helper function to process each image
            function processImage(dataURL) {
                return new Promise((resolve, reject) => {
                    // Create a temporary canvas
                    const canv = document.createElement('canvas');
                    const ctx = canv.getContext('2d');
                    const img = new Image();
        
                    img.onload = function() {
                        canv.width = img.width;
                        canv.height = img.height;
                        ctx.drawImage(img, 0, 0);
        
                        const imageData = ctx.getImageData(0, 0, canv.width, canv.height);
        
                        // Calculate metrics
                        const sharpness = this.calculateSharpness(imageData);
                        const contrast = this.calculateContrast(imageData);
                        const colorDistribution = this.analyzeColorDistribution(imageData);
        
                        const sharpnessPoints = this.assignSharpnessPoints(sharpness);
                        const contrastPoints = this.assignContrastPoints(contrast);
                        const colorPoints = this.assignColorPoints(colorDistribution);
        
                        scores.sharpness.push(sharpnessPoints);
                        scores.contrast.push(contrastPoints);
                        scores.colorDistribution.push(colorPoints);
        
                        canv.remove();
        
                        resolve({
                            sharpness: sharpnessPoints,
                            contrast: contrastPoints,
                            colorDistribution: colorPoints
                        });
                    }.bind(this);
        
                    img.onerror = function() {
                        canv.remove();
                        reject(new Error(`Failed to load image: ${dataURL}`));
                    };
        
                    img.src = dataURL;
                });
            }
        
            // Process all images and wait for all to complete
            try {
                await Promise.all(dataURLs.map(processImage.bind(this)));
        
                // Calculate averages once all images are processed
                const avgSharpness = scores.sharpness.reduce((a, b) => a + b, 0) / scores.sharpness.length;
                const avgContrast = scores.contrast.reduce((a, b) => a + b, 0) / scores.contrast.length;
                const avgColor = scores.colorDistribution.reduce((a, b) => a + b, 0) / scores.colorDistribution.length;
        
                return {
                    avgSharpness: avgSharpness,
                    avgContrast: avgContrast,
                    avgColor: avgColor
                };
            } catch (error) {
                console.error('Error processing images:', error);
                throw error;
            }
        }
        

        endGame() {
            this.isFinished = true;

            if (canvas) {
                canvas.remove();
            }

            shutterOuter.style.display = 'none';
            gameEnd.style.display = 'block';

            (async () => {
                let scores = await this.judgeImages(this.photos);

                let sharpness = document.createElement('p');
                sharpness.innerHTML = '<span class="cat">Sharpness:</span> ' + scores.avgSharpness.toFixed(2);
                gameEnd.appendChild(sharpness);
                let contrast = document.createElement('p');
                contrast.innerHTML = '<span class="cat">Contrast:</span> ' + scores.avgContrast.toFixed(2);
                gameEnd.appendChild(contrast);
                let color = document.createElement('p');
                color.innerHTML = '<span>Color Distribution:</span> ' + scores.avgColor.toFixed(2);
                gameEnd.appendChild(color);
            })();
        }

        gameloop() {
            // Capture the frame before clearing the canvas
            if (snapshotMode) {
                snapshotTick++;
                if (snapshotTick >= snapshotDuration) {
                    canvas.style.border = '4px solid rgba(0, 0, 0, 0)';

                    const dataURL = canvas.toDataURL('image/png');

                    let tempCanvas = document.createElement('canvas');
                    let tempCtx = tempCanvas.getContext('2d');
                    tempCtx.imageSmoothingEnabled = false;
                    tempCtx.mozImageSmoothingEnabled = false;
                    tempCanvas.width = canvas.width / 4;
                    tempCanvas.height = canvas.height / 4;
                    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

                    let tempDataURL = tempCanvas.toDataURL('image/png');
                    
                    let photo = document.createElement('img');
                    photo.src = tempDataURL;
                    // Generate a random rotation value between -5 and 5 degrees
                    const randomDegrees = (Math.random() * 10 - 5).toFixed(2); // ±5 degrees
                    
                    // Calculate the new rotation
                    const newRotation = (parseFloat(randomDegrees)) % 360;
                    
                    // Apply the new rotation
                    photo.style.transform = `rotate(${newRotation}deg)`;
                    photo.classList.add('photo');
                    if (gallery.querySelectorAll('p').length > 0) {
                        gallery.innerHTML = '';
                    }
                    gallery.appendChild(photo);
                    
                    this.photos.push(tempDataURL);

                    galleryHeading.innerHTML = 'Gallery (' + this.photos.length + ' / 13 taken)';

                    snapshotMode = false; // End snapshot mode after taking the snapshot

                    if (this.photos.length === 13) {
                        this.endGame();
                    }
                }
            }
            
            // Clear the canvas at the start of the frame
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Perform drawing operations
            this.drawSky();
            this.drawAurora();
            this.renderTrees();
            this.updateClock();
            
            tick++;
            requestAnimationFrame(() => this.gameloop());
        }
    }

    const game = new Game();

    // Trigger snapshot effect when the 'snapshot' button is clicked
    document.getElementById('snapshotButton').addEventListener('click', () => {
        game.snapShotEffect();
    });

});
