document.addEventListener('DOMContentLoaded', () => {
	let tick = 0;

	class Dimensions {
		constructor(width, height) {
			this.width = width;
			this.height = height;
		}
	}

	class Vector2 {
		constructor(x, y) {
			this.x = x;
			this.y = y;
		}
	}

	class TextureGenerator {
		constructor(w, h) {
			this.canvas = document.createElement('canvas');
			this.canvas.width = w;
			this.canvas.height = h;
			this.ctx = this.canvas.getContext('2d');
		}

		draw(callback) {
			callback(this.canvas, this.ctx);
		}

		// Return texture as an Image
		getTexture() {
			const img = new Image();
			img.src = this.canvas.toDataURL();
			return img;
		}
	}
	  
	// Example usage
	const texGen = new TextureGenerator(150, 150);
	texGen.draw((canv, c) => {
		const w = canv.width;
		const h = canv.height;
		const r = Math.min(w, h) / 2 - 10;
		const cx = w / 2;
		const cy = h / 2;
	  
		// Ensure radius is positive
		const r0 = Math.max(r * 0.5, 1);
	  
		// Radial gradient for gold effect
		const grad = c.createRadialGradient(cx, cy, r0, cx, cy, r);
		grad.addColorStop(0, '#ffd700'); // Gold
		grad.addColorStop(0.5, '#ffcc00'); // Light gold
		grad.addColorStop(1, '#b8860b'); // Dark gold
	  
		c.fillStyle = grad;
		c.beginPath();
		c.arc(cx, cy, r, 0, 2 * Math.PI);
		c.fill();
		
		// Border
		c.lineWidth = 5;
		c.strokeStyle = '#b8860b'; // Dark gold
		c.stroke();
	  
		// Pirate ship imprint
		c.fillStyle = '#000'; // Black color for the imprint
	  
		// Draw the ship hull
		c.beginPath();
		c.moveTo(cx - 20, cy + 10);
		c.lineTo(cx + 20, cy + 10);
		c.lineTo(cx + 15, cy + 20);
		c.lineTo(cx - 15, cy + 20);
		c.closePath();
		c.fill();
	  
		// Draw the ship's mast
		c.beginPath();
		c.moveTo(cx, cy + 10);
		c.lineTo(cx, cy - 20);
		c.lineWidth = 2;
		c.strokeStyle = '#000';
		c.stroke();
	  
		// Draw the sails
		c.beginPath();
		// Lower sail
		c.moveTo(cx, cy - 10);
		c.lineTo(cx + 12, cy);
		c.lineTo(cx, cy);
		c.closePath();
		c.fill();
	  
		// Upper sail
		c.beginPath();
		c.moveTo(cx, cy - 15);
		c.lineTo(cx + 8, cy - 10);
		c.lineTo(cx, cy - 10);
		c.closePath();
		c.fill();
	  
		// Optional: Add a pirate flag
		c.beginPath();
		c.moveTo(cx, cy - 20);
		c.lineTo(cx + 10, cy - 15);
		c.lineTo(cx, cy - 15);
		c.closePath();
		c.fill();
	});
	const texImg = texGen.getTexture();
	

	class Color {
		constructor(r, g, b) {
			if (g === undefined) {
				r = parseInt(r.slice(1), 16);
				this.r = r >> 16;
				this.g = (r >> 8) & 255;
				this.b = r & 255;
				this.hex = `#${r.toString(16).padStart(6, '0').toUpperCase()}`;
			} else {
				this.r = r;
				this.g = g;
				this.b = b;
				this.hex = `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase()}`;
			}
		}
		toRgb() { return `rgb(${this.r},${this.g},${this.b})`; }
		toHex() { return this.hex; }
	}
	
	const BLACK = new Color(0, 0, 0);
	const WHITE = new Color(255, 255, 255);

	function snapToGrid(value, gridSize) {
	    return Math.round(value / gridSize) * gridSize;
	}

	function getContrastColor(color) {
		let r = color.r;
		let g = color.g;
		let b = color.b;

		// Calculate the relative luminance of the color
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	
		// If the luminance is greater than 0.5, the color is light, so return black.
		// Otherwise, return white.
		return luminance > 0.5 ? BLACK : WHITE;
	}

	let array2d = (r, c) => Array.from({ length: r }, () => Array(c));

	let canvas = document.getElementById('game');
	canvas.width = 1280;
	canvas.height = 720;
	let ctx = canvas.getContext('2d');

	let overlay = document.getElementById('overlay');

	class CardInterface {
		constructor() {
			this.title = '';
			overlay.html = '';
		}

		close() {
			overlay.html = '';
		}

		open(c) {
			console.log('opening card: ', c);
			this.close();

			// card html
			let card = document.createElement('div');
			card.classList.add('card');

			let header = document.createElement('header');
			header.classList.add('card-header');
			header.style.backgroundColor = c.color.toHex();

			if (c.title !== undefined) {
				let title = document.createElement('h3');
				title.style.color =  getContrastColor(c.color).toHex();
				title.innerHTML = c.title;
				
				header.appendChild(title);
			}

			let icon = document.createElement('img');
			icon.src = texImg.src;
			header.append(icon);

			card.appendChild(header);

			overlay.appendChild(card);
		}
	}

	const cardInterface = new CardInterface();


	/**
	 * INPUT
	 */
	let mousePos = new Vector2(0, 0);

    function getMousePos(event) {
        const rect = canvas.getBoundingClientRect(); // Get canvas position
        const scaleX = canvas.width / rect.width;    // Scaling factor for width
        const scaleY = canvas.height / rect.height;  // Scaling factor for height

        const mouseX = (event.clientX - rect.left) * scaleX; // Adjust mouse X position
        const mouseY = (event.clientY - rect.top) * scaleY;  // Adjust mouse Y position

        return { x: mouseX, y: mouseY };
    }

    function handleMouseMove(event) {
        let pos = getMousePos(event);
        mousePos = new Vector2(pos.x, pos.y);
    }

    canvas.addEventListener('mousemove', handleMouseMove);



	/**
	 * UTILITY FUNCTIONS
	 */
	function randInt(min, max) {
	    return Math.floor(Math.random() * (max - min + 1)) + min;
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

	class Card {
		constructor(world, x, y) {
			this.world = world;
			this.x = x;
			this.y = y;
			this.width = this.world.cardSize.width;
			this.height = this.world.cardSize.height;
			this.color = '';
			this.isHighlighted = false;
			this.isFlipping = false;
			this.isFlipped = false;
	        this.flipProgress = 0; // 0 to 1, where 1 is fully flipped
	        this.flipSpeed = 0.05; // Speed of the flip
			this.offset = new Vector2(0, 0);
		}

		flip() {
	        this.flipProgress = 0; // 0 to 1, where 1 is fully flipped
			this.isFlipping = true;
			this.isFlipped = false;
		}

	    updateFlip() {
	        if (this.isFlipping) {
	            this.flipProgress += this.flipSpeed;
	            if (this.flipProgress >= 1) {
	                this.flipProgress = 1;
	                this.isFlipping = false;
	                this.isFlipped = true;
	            }
	        }
	    }

	    render() {
	        this.updateFlip();

	        // Calculate the scale factor for horizontal flipping
	        const scaleX = this.isFlipping ? Math.max(0, 1 - this.flipProgress * 2) : 1;

	        // Calculate the offset to keep the card in place
	        const offsetX = this.width * (1 - scaleX) / 2;

	        // Save context state
	        ctx.save();

	        // Translate to the card's position
	        ctx.translate(this.x + offsetX, this.y);

	        // Flip horizontally by scaling
	        ctx.scale(scaleX, 1);

	        // Render card
	        ctx.fillStyle = this.color.toHex();
	        ctx.beginPath();
	        ctx.roundRect(0, 0, this.width, this.height, this.world.cardEdgeRadius);
	        ctx.fill();

	        ctx.fillStyle = '#ffffff';
	        ctx.globalAlpha = 0.15;
	        ctx.fillRect(0, this.world.cardGap, this.width, this.height * 0.15);
	        ctx.fillRect(0, this.height - this.world.cardGap * 2.5, this.width, this.height * 0.15);
	        ctx.globalAlpha = 1;

	        // Restore context state
	        ctx.restore();

	        /*
	        ctx.fillStyle = '#ffffff';
	        ctx.globalAlpha = 0.25;
	        ctx.font = 'bold 20px sans-serif';
	        ctx.fillText(
	        	'?',
	        	this.x + (this.world.cardSize.width * 0.5),
	        	this.y + (this.world.cardSize.height * 0.5)
	        );
	        ctx.globalAlpha = 1;
	        */
	    }

		renderHighlight() {
			if (this.isFlipping) {
				return;
			}

			ctx.fillStyle = '#ffffff';
			ctx.globalAlpha = Math.abs(Math.sin(tick * 0.1));
			ctx.roundRect(this.x + this.offset.x, this.y + this.offset.y, this.width, this.height, this.world.cardEdgeRadius);
			ctx.fill();
			ctx.globalAlpha = 1;
		}
	}

	class World {
		constructor(game) {
			this.game = game;

			this.cardSize = new Dimensions(32, 45);
			this.cardGap = Math.floor(this.cardSize.width / 6);
			this.cardEdgeRadius = Math.floor(this.cardSize.width / 6);

			let mapWidth = Math.floor(canvas.width / this.cardSize.width);
			this.mapWidth = mapWidth + (mapWidth * this.cardGap);
			let mapHeight = Math.floor(canvas.height / this.cardSize.height);
			this.mapHeight = mapHeight + (mapHeight * this.cardGap);

			this.cursorRequestors = [];

			this.cardMap = array2d(this.mapWidth, this.mapHeight);

			this.seed = randInt(0, 25565);

			this.generateSeas();

			canvas.addEventListener('click', () => {
				console.log('clicked');

				for (let x = 0; x < this.cardMap.length; x++) {
					for (let y = 0; y < this.cardMap[x].length; y++) {
						let card = this.cardMap[x][y];

						if (card.isHighlighted) {

							card.flip();

							cardInterface.open(card);
						}
					}
				}
			});
		}

		generateSeas() {
			console.log('Generating seas (' + this.mapWidth + ', ' + this.mapHeight + ') with seed: ', this.seed);
			for (let x = 0; x < this.mapWidth; x++) {
				for (let y = 0; y < this.mapHeight; y++) {
					let card = new Card(this, (x * this.cardSize.width) + (x * this.cardGap), (y * this.cardSize.height) + (y * this.cardGap));
					card.title = 'Test Card';
					let noise = noise2d(x / 3, y / 3, this.seed);
					console.log(noise);
					let greyValue = noise * 255;

					let color = new Color( greyValue, greyValue, greyValue );

					if (noise < 0.4) {
						card.title = 'DEEP SEA';
					}
					else if (noise < 0.7) {
						card.title = 'SHALLOW SEA';
					}


					if (noise < 0.65) {
						color = new Color( 0, 0, snapToGrid(greyValue, 50) );
					}
					else if (noise >= 0.65 && noise < 0.8) {
						color = new Color(200, 170, greyValue );
						console.log('GENERATING SAND');
						card.title = 'BEACH';
					}
					else {
						color = new Color(0, Math.floor(greyValue * 0.65), 0);
						card.title = 'GRASS HILLS';
					}

					card.color = new Color(20, 20, 20);

					this.cardMap[x][y] = card;
				}
			}
			console.log('Generated seas: ', this.cardMap);
		}

		render() {
			for (let x = 0; x < this.cardMap.length; x++) {
				for (let y = 0; y < this.cardMap[x].length; y++) {
					let card = this.cardMap[x][y];

					card.render();

					if (mousePos.x > card.x && mousePos.x < card.x + this.cardSize.width &&
						mousePos.y > card.y && mousePos.y < card.y + this.cardSize.height) {
						card.isHighlighted = true;
						this.game.addCursorRequestor('c-' + x + '-' + y, 'pointer');
					}
					else {
						card.isHighlighted = false;
						this.game.removeCursorRequestor('c-' + x + '-' + y);
					}

					if (card.isHighlighted) {
						card.renderHighlight();
					}
				}
			}
		}
	}

	class Game {
		constructor() {
			this.world = new World(this);

			this.cursorRequestors = [];

			this.startLoop();
		}

		addCursorRequestor(key, cursor) {
			let alreadyExists = false;
			for (let i = 0; i < this.cursorRequestors.length; i++) {
				if (this.cursorRequestors[i].key == key) {
					alreadyExists = true;
				}
			}

			if (alreadyExists) {
				return false;
			}

			this.cursorRequestors.push({ key: key, cursor: cursor });

			return true;
		}

		removeCursorRequestor(key) {
			for (let i = 0; i < this.cursorRequestors.length; i++) {
				if (this.cursorRequestors[i].key == key) {
					this.cursorRequestors.splice(i, 1);
					i--;
				}
			}
		}

		parseCursorRequests() {
			if (this.cursorRequestors.length > 0) {
				canvas.style.cursor = 'pointer';
			}
			else {
				canvas.style.cursor = 'default';
			}
		}

		update() {
			this.parseCursorRequests();
			tick++;
		}

		render() {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			this.world.render();
		}

		loop() {
			this.update();
			this.render();
			window.requestAnimationFrame(this.loop.bind(this));
		}

		startLoop() {
			console.log('starting loop');
			this.loop();
		}
	}

	const game = new Game();

	const canvasZIndex = parseInt(window.getComputedStyle(canvas).zIndex) || 0;

	document.addEventListener("mousemove", function(event) {
		const elementUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
	
		if (elementUnderMouse !== canvas) {
			const elementZIndex = parseInt(window.getComputedStyle(elementUnderMouse).zIndex) || 0;
	
			if (elementZIndex > canvasZIndex) {
				// Stop mouse input to the canvas
				game.cursorRequestors.length = 0;
				canvas.style.pointerEvents = 'none';
			} else {
				// Allow mouse input to the canvas
				canvas.style.pointerEvents = 'auto';
			}
		}
	});
	
	canvas.addEventListener("click", function(event) {
		const elementUnderMouse = document.elementFromPoint(event.clientX, event.clientY);
		const elementZIndex = parseInt(window.getComputedStyle(elementUnderMouse).zIndex) || 0;
	
		if (elementUnderMouse !== canvas && elementZIndex > canvasZIndex) {
			game.cursorRequestors.length = 0;
			// An element with a higher z-index is on top of the canvas, so ignore the click
			event.stopImmediatePropagation();
			return;
		}
	
		// Handle the click event on the canvas here
		console.log("Canvas clicked!");
	});

});

