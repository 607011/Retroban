(function (window) {
    "use strict";

    const CELL_SIZE = 32;

    class Tile {
        static Floor = 1 << 0;
        static Player = 1 << 1;
        static Goal = 1 << 2;
        static Crate = 1 << 3;
        static Wall = 1 << 4;
    };

    class TileCharacter {
        static Floor = " ";
    };

    const TileMap = {
        "@": Tile.Player | Tile.Floor,
        "+": Tile.Player | Tile.Goal | Tile.Floor,
        " ": Tile.Floor,
        "$": Tile.Crate | Tile.Floor,
        ".": Tile.Goal | Tile.Floor,
        "*": Tile.Crate | Tile.Goal | Tile.Floor,
        "#": Tile.Wall,
    };

    const TileReverseMap = Object.entries(TileMap)
        .reduce((acc, [key, value]) => {
            acc[value] = key;
            return acc;
        }, {});

    /**
     * Class representing a 2D vector.
     */
    class Vec2 {
        /**
         * Create a vector.
         * @param {number} x - The x-coordinate.
         * @param {number} y - The y-coordinate.
         */
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }

        /**
         * Multiply the vector by a scalar.
         * @param {number} s - The scalar to multiply by.
         * @returns {Vec2} A new vector scaled by the given scalar.
         */
        mul(s) {
            return new Vec2(this.x * s, this.y * s);
        }

        /**
         * Add another vector to this vector.
         * @param {Vec2} v - The vector to add.
         * @returns {Vec2} A new vector that is the sum of the two vectors.
         */
        add(v) {
            return new Vec2(this.x + v.x, this.y + v.y);
        }
    };

    class SokobanLevel {
        /**
         * Create a Sokoban level.
         * @param {string[]} data - The level data.
         * @param {string} [title] - The title of the level.
         * @param {string} [author] - The author of the level.
         */
        constructor(data, title, author) {
            this._rawData = data;
            this.data = data;
            this._title = title;
            this._author = author;
        }
        clone() {
            return new SokobanLevel(
                this._rawData.map(row => row.slice()), // deep copy
                this._title,
                this._author);
        }
        get title() { return this._title; }
        get author() { return this._author; }
        get width() { return this._width; }
        get height() { return this._height; }
        get data() { return this._data; }
        set data(data) {
            this._width = Math.max(...(data.map(row => row.length)));
            this._height = data.length;
            this._data = data.map(row => row
                .padEnd(this._width, TileCharacter.Floor)
                .split("")
                .map(tile => TileMap[tile]));
        }
        /** @param {Vec2} pos */
        at(pos) {
            return this._data[pos.y][pos.x];
        }
        /**
         * Move a crate or the player to the next field.
         * @param {Vec2} a coordinate of the current field
         * @param {Vec2} b coordinate of the destination field
         * @param {Tile} what to move
         */
        moveTo(a, b, what) {
            this._data[b.y][b.x] |= what;
            this._data[a.y][a.x] &= ~what;
        }
        /** @return true, if all crates are placed on goals */
        missionAccomplished() {
            return !this._data.some(row => row.some(tile => (tile & Tile.Goal) && !(tile & Tile.Crate)))
        }
        toString() {
            return this._data.map(row => row.map(tile => TileReverseMap[tile]).join("")).join("\n");
        }
    }

    /** Read and parse XSokoban data into `SokobanLevel` objects. */
    class XSBReader {
        /** @param {string} data  */
        static parseMulti(data) {
            const reRow = /^[@\+ \$\.\*#]{2,}$/;
            const reLE = /\n|\r\n|\r/;
            const reTitle = /^Title:\s*(.*)/g;
            const reAuthor = /^Author:\s*(.*)/g;
            let levels = [];
            let level = [];
            let title;
            let author;
            for (const line of data.split(reLE)) {
                const titleMatch = [...line.matchAll(reTitle)];
                if (titleMatch.length > 0) {
                    title = titleMatch[0][1];
                    continue;
                }
                const authorMatch = [...line.matchAll(reAuthor)];
                if (authorMatch.length > 0) {
                    author = authorMatch[0][1];
                    continue;
                }
                if (line.match(reRow)) {
                    level.push(line);
                }
                else if (level.length > 0) {
                    levels.push(new SokobanLevel(level, title, author));
                    title = undefined;
                    author = undefined;
                    level = [];
                }
            }
            return levels;
        }
    }

    /** Extract key/value pairs from URL hash.
     * @param {Object} defaults default values
     */
    function parseHash(defaults = {}) {
        const hash = window.location.hash.substring(1);
        const result = {};
        for (const arg of hash.split(";")) {
            const [key, value] = arg.split("=");
            result[key] = value;
        }
        return Object.assign(defaults, result);
    }

    class Direction {
        static Up = "U";
        static Right = "R";
        static Down = "D";
        static Left = "L";
    }

    const MOVE = {
        [Direction.Up]: new Vec2(0, -1),
        [Direction.Right]: new Vec2(+1, 0),
        [Direction.Down]: new Vec2(0, +1),
        [Direction.Left]: new Vec2(-1, 0),
    };

    class SokobanGame extends HTMLElement {
        static observedAttributes = ["xsb-file"];

        /** @type {SokobanLevel[]} */
        _levels = [];
        /** @type {Number} */
        _levelNum = 0;
        /** @type {SokobanLevel} */
        _level;
        /** @type {String[]} */
        _moves = [];
        /** @type {Number} */
        _cellSize = CELL_SIZE;
        /** @type {HTMLElement[][]} */
        _tiles;
        /** @type {Vec2} */
        _pos;
        /** @type {HTMLElement} */
        _player;

        constructor() {
            super();
            this._undoStack = [];
        }

        connectedCallback() {
            this._shadow = this.attachShadow({ mode: "open" });
            this._style = document.createElement("style");
            this._style.textContent = `
:host {
    --cell-size: ${this._cellSize}px;
}
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
.board {
    position: relative;
}
.tile, .char {
    position: absolute;
    display: inline-block;
    background-image: url("images/tileset-colors-8x8.png");
    background-size: calc(4 * var(--cell-size)) calc(4 * var(--cell-size));
    width: var(--cell-size);
    height: var(--cell-size);
    box-sizing: content-box;
    background-repeat: no-repeat;
    image-rendering: -moz-pixelated;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: pixelated;
    -ms-interpolation-mode: nearest-neighbor;
}
.tile.floor {
    background-position: 0 calc(-2 * var(--cell-size));
}
.tile.goal {
    background-position: calc(-1 * var(--cell-size)) 0;
}
.tile.crate {
    background-position: calc(-1 * var(--cell-size)) calc(-1 * var(--cell-size));
}
.tile.crate.goal {
    background-position: calc(-1 * var(--cell-size)) calc(-2 * var(--cell-size));
}
.tile.wall {
    background-position: calc(-1 * var(--cell-size)) calc(-3 * var(--cell-size));
}
.tile.player {
    background-position: calc(-2 * var(--cell-size)) calc(-2 * var(--cell-size));
}
.tile.player.left {
    background-position: 0 0;
}
.tile.player.right {
    background-position: calc(-2 * var(--cell-size)) 0;
}
.tile.player.goal {
    background-position: calc(-2 * var(--cell-size)) calc(-2 * var(--cell-size));
}
.tile.player.goal.left {
    background-position: 0 calc(-3 * var(--cell-size));
}
.tile.player.goal.right {
    background-position: calc(-2 * var(--cell-size)) calc(-3 * var(--cell-size));
}
.tile.reset {
    position: relative;
    background-position: 0 calc(-1 * var(--cell-size));
    cursor: pointer;
}
.tile.undo {
    position: relative;
    background-position: calc(-2 * var(--cell-size)) calc(-1 * var(--cell-size));
    cursor: pointer;
}
.toolbar {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin-top: calc(var(--cell-size) / 2);
}
.move-count {
    transform: scale(0.5);
}
.char {
    opacity: 0.2;
    position: relative;
    background-image: url("images/font-8x8.png");
    background-size: calc(16 * var(--cell-size)) calc(16 * var(--cell-size));
}
`;
            for (let j = 2; j < 28; ++j) {
                for (let i = 0; i < 16; ++i) {
                    const idx = j * 16 + i;
                    this._style.textContent += 
`.char.c${idx} {
    background-position: calc(-${i} * var(--cell-size)) calc(-${j} * var(--cell-size));
}`;
                }
            }
            this._shadow.appendChild(this._style);
            this._levelStyle = document.createElement("style");
            this._shadow.appendChild(this._levelStyle);
            this._board = document.createElement("div");
            this._board.className = "board";
            this._shadow.appendChild(this._board);
            let toolbar = document.createElement("div");
            toolbar.className = "toolbar";
            let resetButton = document.createElement("div");
            resetButton.className = "tile reset";
            resetButton.title = "[R]estart level";
            resetButton.addEventListener("click", this.reset.bind(this));
            toolbar.appendChild(resetButton);
            this._moveCountEl = document.createElement("div");
            this._moveCountEl.className = "move-count"
            toolbar.appendChild(this._moveCountEl);
            let undoButton = document.createElement("div");
            undoButton.className = "tile undo";
            undoButton.title = "[U]ndo last move";
            undoButton.addEventListener("click", this._undo.bind(this));
            toolbar.appendChild(undoButton);
            this._shadow.appendChild(toolbar);
            this._activateEventListeners();
            this._updateDisplay();
            dispatchEvent(new HashChangeEvent("hashchange"));
        }

        _setLevelStyles() {
            this._levelStyle.textContent = `
.board {
    width: calc(var(--cell-size) * ${this._level.width});
    height: calc(var(--cell-size) * ${this._level.height});
}`;
        }

        /** @param {String} url */
        loadFromUrl(url) {
            fetch(url)
                .then(async response => {
                    if (response.headers.get("Content-Type") === "application/octet-stream") {
                        return response.arrayBuffer().then(buffer => {
                            const decoder = new TextDecoder('utf-8');
                            return decoder.decode(buffer);
                        });
                    } else {
                        return response.text();
                    }
                })
                .then(levelsData => {
                    this._levels = XSBReader.parseMulti(levelsData);
                    console.debug(`${this._levels.length} levels loaded.`);
                    this._restartLevel();
                })
                .catch(err => console.error(err));
        }

        /** Reset game data to its initial state  */
        reset() {
            this._restartLevel();
        }

        _updateDisplay() {
            let digits = [];
            for (const digit of this._moves.length.toString()) {
                const div = document.createElement("div");
                div.className = `char c${digit.charCodeAt(0)}`;
                digits.push(div);
            }
            this._moveCountEl.replaceChildren(...digits);
        }

        _undo() {
            const moves = this._undoStack.pop();
            if (!moves)
                return;
            this._moves.pop();
            for (const move of moves) {
                this._level.moveTo(move.to, move.from, move.what);
                if (move.what === Tile.Player) {
                    this._pos = move.from;
                }
            }
            this._buildLevel();
        }

        /**
         * @param {number} levelNum
         */
        set levelNum(levelNum) {
            this._levelNum = levelNum;
            if (this._levelNum < this._levels.length) {
                this._restartLevel();
            }
        }

        /** @returns {number} */
        get levelNum() {
            return this._levelNum;
        }

        nextLevel() {
            if (this._levelNum + 1 < this._levels.length) {
                ++this._levelNum;
                this._buildHash();
                this._restartLevel();
            }
            else {
                console.warn("No more levels available.");
            }
        }

        _activateEventListeners() {
            window.addEventListener("hashchange", this._onHashChange.bind(this));
            window.addEventListener("keydown", this._onKeyDown.bind(this));
            window.addEventListener("touchstart", this._onTouchStart.bind(this));
            window.addEventListener("touchend", this._onTouchEnd.bind(this));
        }

        _restartLevel() {
            if (this._levelNum >= 0 && this._levelNum < this._levels.length) {
                this._moves = [];
                this._undoStack = [];
                this._level = this._levels[this._levelNum].clone();
                this._buildLevel();
                this._updateDisplay();
            }
            else {
                console.error("Invalid level number:", this._levelNum);
            }
        }

        _buildLevel() {
            this._setLevelStyles();
            let tiles = [];
            for (const [row, rowObjs] of this._level.data.entries()) {
                for (const [col, tile] of rowObjs.entries()) {
                    let div = document.createElement("div");
                    div.style.top = `${row * this._cellSize}px`;
                    div.style.left = `${col * this._cellSize}px`;
                    div.className = "tile";
                    if (tile & Tile.Wall) {
                        div.classList.add("wall");
                    }
                    else {
                        if (tile & Tile.Crate) {
                            div.classList.add("crate");
                        }
                        if (tile & Tile.Goal) {
                            div.classList.add("goal");
                        }
                        if (tile & Tile.Player) {
                            div.classList.add("player");
                            this._pos = new Vec2(col, row);
                            this._player = div;
                        }
                        if (tile & Tile.Floor) {
                            div.classList.add("floor");
                        }
                    }
                    tiles.push(div);
                }
            }
            this._board.replaceChildren(...tiles);
        }

        _buildHash() {
            window.location.hash = `#collection=${this._collection};level=${this._levelNum}`;
        }

        /** @param {TouchEvent} _e  */
        _onTouchStart(_e) {
            this._touchStartTime = performance.now();
        }

        /** @param {TouchEvent} e  */
        _onTouchEnd(e) {
            const touchDuration = performance.now() - this._touchStartTime;
            if (touchDuration < 400) {
                this._onClick(e);
            }
        }

        /** @param {TouchEvent|PointerEvent} e  */
        _onClick(e) {
            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else if (e.changedTouches && e.changedTouches.length > 0) {
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            const playerRect = this._player.getBoundingClientRect();
            const inXRange = (playerRect.left < clientX) && (clientX < playerRect.right);
            const inYRange = (playerRect.top < clientY) && (clientY < playerRect.bottom);
            if ((inXRange && inYRange) || (!inXRange && !inYRange))
                return;
            if (clientX < playerRect.left) {
                this.move(Direction.Left);
            }
            else if (clientX > playerRect.right) {
                this.move(Direction.Right);
            }
            else if (clientY < playerRect.top) {
                this.move(Direction.Up);
            }
            else if (clientY > playerRect.bottom) {
                this.move(Direction.Down);
            }
        }

        /** @param {KeyboardEvent} e */
        _onKeyDown(e) {
            switch (e.key) {
                case "u":
                case "z":
                    this._undo();
                    break;
                case "r":
                    this._restartLevel();
                    break;
                case "ArrowUp":
                case "w":
                    this.move(Direction.Up);
                    break;
                case "ArrowRight":
                case "d":
                    this.move(Direction.Right);
                    break;
                case "ArrowDown":
                case "s":
                    this.move(Direction.Down);
                    break;
                case "ArrowLeft":
                case "a":
                    this.move(Direction.Left);
                    break;
            }
        }

        /** @param {HashChangeEvent} _e  */
        _onHashChange(_e) {
            const param = parseHash({ level: "0", collection: "Novoban" });
            if (this._collection !== param.collection) {
                this._collection = param.collection;
                this.loadFromUrl(`puzzles/${this._collection}.xsb`);
            }
            this.levelNum = parseInt(param.level);
            this._buildHash();
        }

        animatePlayer(direction) {
            switch (direction) {
                case Direction.Up:
                case Direction.Down:
                    this._player.classList.remove("left", "right");
                    break;
                case Direction.Right:
                    this._player.classList.add("right");
                    this._player.classList.remove("left");
                    break;
                case Direction.Left:
                    this._player.classList.add("left");
                    this._player.classList.remove("right");
                    break;
                default:
                    break;
            }
        }

        /** @param {string} direction */
        move(direction) {
            const d = MOVE[direction];
            const dst = this._pos.add(d);
            const dstTile = this._level.at(dst);
            if (dstTile === Tile.Wall)
                return;
            if (!(dstTile & Tile.Crate)) {
                this._level.moveTo(this._pos, dst, Tile.Player);
                this._undoStack.push([{ from: this._pos, to: dst, what: Tile.Player }]);
                this._pos = dst;
                this._moves.push(direction);
                this._updateDisplay();
                this._buildLevel();
                this.animatePlayer(direction);
                return;
            }
            // destination field is a crate
            const d2 = d.mul(2);
            const dst2 = this._pos.add(d2);
            const dstTile2 = this._level.at(dst2);
            if ((dstTile2 & Tile.Wall) || (dstTile2 & Tile.Crate))
                return;
            this._level.moveTo(this._pos, dst, Tile.Player);
            this._level.moveTo(dst, dst2, Tile.Crate);
            this._undoStack.push([
                { from: dst, to: dst2, what: Tile.Crate },
                { from: this._pos, to: dst, what: Tile.Player }
            ]);
            this._pos = dst;
            this._moves.push(direction);
            this._updateDisplay();
            this._buildLevel(); // XXX: Expensive operation! Should be optimized by moving only the necessary tiles.
            this.animatePlayer(direction);
            if (this._level.missionAccomplished()) {
                setTimeout(() => {
                    if (this._levelNum + 1 < this._levels.length) {
                        alert(`Congratulations! Mission accomplished within ${this._moves.length} moves: ${this._moves.join("")}. Head over to the next level by pressing OK.`);
                        this.nextLevel();
                    }
                    else {
                        alert(`Congratulations! Mission accomplished within ${this._moves.length} moves: ${this._moves.join("")}`);
                    }
                }, 10);
            };
        }
    }

    /**
     * Plays a sequence of moves in the game.
     *
     * @param {string} seq - A string representing the sequence of moves to be played.
     *                       Each character in the string corresponds to a move.
     */
    function play(seq) {
        el.game.reset();
        let moves = seq.split("");
        let t0 = performance.now();
        const autoplay = () => {
            if (moves.length > 0 && performance.now() > t0 + 150) {
                const move = moves.shift();
                el.game.move(move.toUpperCase());
                t0 = performance.now()
            }
            requestAnimationFrame(autoplay);
        }
        requestAnimationFrame(autoplay);
    }

    let el = {};

    function main() {
        console.info("%cMinimalist Sokoban started.", "color: green; font-weight: bold");
        customElements.define("sokoban-game", SokobanGame);
        el.game = document.querySelector("sokoban-game");
    }

    window.addEventListener("load", main);

    window.exports = {
        play
    };

})(window);
