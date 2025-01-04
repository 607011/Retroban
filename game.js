(function (window) {
    "use strict";

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

        /**
         * Compare this vector to another vector.
         * @param {Vec2} v - The vector to compare to.
         * @returns {Boolean} `true` if vectors are equal, `false` otherwise.
         */
        equals(v) {
            return this.x === v.x && this.y === v.y;
        }

        /**
         * Convert the vector to a string.
         * @returns {String} A string representation of the vector.
         */
        toString() {
            return `${this.x},${this.y}`;
        }
    };

    /**
     * A kind of enumeration of directions.
     */
    class Direction {
        static Up = "U";
        static Right = "R";
        static Down = "D";
        static Left = "L";
    }

    /**
     * Movement vectors for each direction.
     */
    const MOVE = {
        [Direction.Up]: new Vec2(0, -1),
        [Direction.Right]: new Vec2(+1, 0),
        [Direction.Down]: new Vec2(0, +1),
        [Direction.Left]: new Vec2(-1, 0),
    };

    class SafeMap {
        constructor() {
            this._map = new Map();
        }
        set(v, value) {
            this._map.set(v.toString(), value);
        }
        get(v) {
            return this._map.get(v.toString());
        }
    }

    /**
     * Workaround class to store `Vec2` objects in a kind of set,
     * because `Set` compares objects by reference.
     */
    class SafeSet {
        /**
         * 
         * @param {*|*[]} elements - The element(s) to add to the set.
         */
        constructor(elements) {
            this._map = new Map();
            if (elements instanceof Array) {
                for (const v of elements) {
                    this.add(v);
                }
            }
            else {
                this.add(elements)
            }
        }
        /**
         * Add a single element to the set.
         * @param {*} v - The element to add.
         */
        add(v) {
            this._map.set(v.toString(), v);
        }
        /**
         * Check if the set contains a given element.
         * @param {*} v - The element to check for.
         * @returns {Boolean} `true` if the set contains the element, `false` otherwise.
         */
        has(v) {
            return this._map.has(v.toString());
        }
    }

    class SokobanLevel {
        /**
         * Create a Sokoban level.
         * @param {string[]} data - The level data, each element is a row of the level.
         * @param {string} [title] - The title of the level.
         * @param {string} [author] - The author of the level.
         * @param {string} [solution] - The moves to solve the level.
         */
        constructor(data, title, author, solution) {
            this._rawData = data;
            this.data = data;
            this._title = title;
            this._author = author;
            this._solution = solution;
        }

        /**
         * Create a deep copy of the level.
         * @returns {SokobanLevel} Deep copy of the level.
         */
        clone() {
            return new SokobanLevel(
                this._rawData.map(row => row.slice()), // deep copy
                this._title,
                this._author,
                this._solution);
        }

        get title() { return this._title; }
        get author() { return this._author; }
        get solution() { return this._solution; }
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

        /** 
         * Get the tile at a given position.
         * @param {Vec2} pos - Position in the level
         * @returns {Tile} The tile at the given position
         */
        at(pos) {
            return this._data[pos.y][pos.x];
        }

        /**
         * Move a crate or the player to the next field.
         * @param {Vec2} a - Coordinate of the current field
         * @param {Vec2} b - Coordinate of the destination field
         * @param {Tile} what - What/whom to move
         * @returns {Vec2} The new position of the moved object
         */
        moveTo(a, b, what) {
            this._data[b.y][b.x] |= what;
            this._data[a.y][a.x] &= ~what;
            return b;
        }

        /**
         * Move a crate or the player to the next field.
         * @param {Vec2} pos - Coordinate of the current field
         * @param {Direction} dir - Direction to move to
         * @param {Tile} what - What/whom to move
         * @returns {Vec2} The new position of the moved object
         */
        movePlayer(pos, dir) {
            const d = MOVE[dir];
            const dst = pos.add(d);
            const dstTile = this.at(dst);
            if (dstTile === Tile.Wall)
                return pos; // Cannot move into a wall
            if (!(dstTile & Tile.Crate))
                return this.moveTo(pos, dst, Tile.Player); // Player can move freely
            const d2 = d.mul(2);
            const dst2 = pos.add(d2);
            const dstTile2 = this.at(dst2);
            if ((dstTile2 & Tile.Wall) || (dstTile2 & Tile.Crate))
                return pos; // Cannot push crate into a wall or another crate
            this.moveTo(pos, dst, Tile.Player);
            this.moveTo(dst, dst2, Tile.Crate);
            return dst;
        }

        /** 
         * Breadth-first search through level.
         * @param {Vec2} a start position
         * @param {Vec2} b target position
         * @returns {String} URDL sequence of moves to get from `a` to `b`
         */
        shortestPath(a, b) {
            let visited = new SafeSet([a]);
            let parent = new SafeMap();
            let queue = [a];
            while (queue.length > 0) {
                let current = queue.shift();
                if (current.equals(b))
                    break;
                for (const dir of Object.values(MOVE)) {
                    let next = current.add(dir);
                    let neighbor = this.at(next);
                    if ((neighbor & Tile.Wall) || (neighbor & Tile.Crate))
                        continue;
                    if (visited.has(next))
                        continue;
                    visited.add(next);
                    parent.set(next, current);
                    queue.push(next);
                }
            }
            // Construct sequence of moves by going backwards from target to start
            let path = [];
            let current = b;
            let last = current;
            while (current && !current.equals(a)) {
                last = current;
                current = parent.get(current);
                if (last.x > current.x)
                    path.unshift(Direction.Right);
                else if (last.x < current.x)
                    path.unshift(Direction.Left);
                else if (last.y > current.y)
                    path.unshift(Direction.Down);
                else if (last.y < current.y)
                    path.unshift(Direction.Up);
            }
            return path.join("");
        }

        /** 
         * Check if all crates are placed on goals.
         * @return {Boolean} `true`, if all crates are placed on goals, `false` otherwise
         */
        missionAccomplished() {
            return !this._data.some(row => row.some(tile => (tile & Tile.Goal) && !(tile & Tile.Crate)))
        }

        /**
         * Convert the level to a string.
         * @returns {String} A string representation of the level. 
         */
        toString() {
            return this._data.map(row => row.map(tile => TileReverseMap[tile]).join("")).join("\n");
        }
    }

    /** 
     * Read and parse XSokoban (XSB) data into `SokobanLevel` objects.
     */
    class XSBReader {
        /** 
         * Parse data containing multiple levels.
         * @param {string} data - XSB data to parse.
         * @returns {SokobanLevel[]} An array of `SokobanLevel` objects.
         */
        static parseMulti(data) {
            const reRow = /^[@\+ \$\.\*#]{2,}$/;
            const reLE = /\n|\r\n|\r/;
            const reTitle = /^Title:\s*(.*)/g;
            const reAuthor = /^Author:\s*(.*)/g;
            const reSolution = /^Solution:\s*(.*)/g;
            let levels = [];
            let level = [];
            let title, author, solution;
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
                const solutionMatch = [...line.matchAll(reSolution)];
                if (solutionMatch.length > 0) {
                    solution = solutionMatch[0][1];
                    continue;
                }
                if (line.match(reRow)) {
                    level.push(line);
                }
                else if (level.length > 0) {
                    levels.push(new SokobanLevel(level, title, author, solution));
                    title = undefined;
                    author = undefined;
                    solution = undefined;
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

    /**
     * Custom web element representing a Sokoban game.
     */
    class SokobanGame extends HTMLElement {
        /** 
         * Array of available Sokoban levels.
         * @type {SokobanLevel[]}
         */
        _levels = [];

        /** 
         * Current level number (counting from 0).
         * @type {Number}
         */
        _levelNum = 0;

        /** 
         * Current Sokoban level.
         * @type {SokobanLevel} */
        _level;

        /** 
         * List of moves (URDL format).
         * @type {String[]}
         */
        _moves = [];

        /** 
         * Width and height in pixels of a single cell.
         * @type {Number}
         */
        _cellSize;

        /**
         * 2D array of HTML elements representing the game board. 
         * @type {HTMLElement[][]}
         */
        _tiles;

        /** 
         * The player's current position.
         * @type {Vec2}
         */
        _pos;

        /** 
         * The HTML element of the player 
         * @type {HTMLElement}
         */
        _player;

        /** 
         * Handle for inactivity timer.
         * @type {number}
         */
        _inactivityTimer = setTimeout(this._relaxPlayer.bind(this), 5000);

        constructor() {
            super();
            this._undoStack = [];
        }

        connectedCallback() {
            this._shadow = this.attachShadow({ mode: "open" });
            this._style = document.createElement("style");
            this._style.textContent = `
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
.board {
    position: relative;
    margin: 0 auto;
    width: fit-content;
}
.disabled {
    opacity: 0.5;
    pointer-events: none;
}
.tile, .char {
    position: absolute;
    display: inline-block;
    background-image: url("images/tileset-colors-8x8.png");
    background-size: calc(6 * var(--cell-size)) calc(6 * var(--cell-size));
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
.tile.player.relaxed {
    background-position: 0 calc(-4 * var(--cell-size));
}
.tile.player.left {
    background-position: 0 0;
}
.tile.player.right {
    background-position: calc(-2 * var(--cell-size)) 0;
}
.tile.player.goal {
    background-position: calc(-3 * var(--cell-size)) calc(-2 * var(--cell-size));
}
.tile.player.goal.relaxed {
    background-position: calc(-1 * var(--cell-size)) calc(-4 * var(--cell-size));
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
.tile.prev {
    position: relative;
    background-position: calc(-3 * var(--cell-size)) 0;
    cursor: pointer;
}
.tile.next {
    position: relative;
    background-position: calc(-3 * var(--cell-size)) calc(-1 * var(--cell-size));
    cursor: pointer;
}
.tile.question-mark {
    position: relative;
    background-position: calc(-3 * var(--cell-size)) calc(-3 * var(--cell-size));
    cursor: pointer;
}
.titlebar {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin-bottom: calc(var(--cell-size) / 2);
}
.toolbar {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin-top: calc(var(--cell-size) / 2);
}
.move-count, .title {
    transform: scale(0.5);
}
.char {
    opacity: 0.2;
    position: relative;
    background-image: url("images/font-8x8.png");
    background-size: calc(16 * var(--cell-size)) calc(16 * var(--cell-size));
}
`;
            // Generate CSS classes for characters
            for (let j = 2; j < 28; ++j) {
                for (let i = 0; i < 16; ++i) {
                    const idx = j * 16 + i;
                    this._style.textContent += `.char.c${idx} { background-position: calc(-${i} * var(--cell-size)) calc(-${j} * var(--cell-size)); }`;
                }
            }
            // Build level's style, will be updated later in _setLevelStyles()
            this._levelStyle = document.createElement("style");
            // Build title bar
            let titlebar = document.createElement("div");
            titlebar.className = "titlebar";
            this._levelNameEl = document.createElement("div");
            this._levelNameEl.className = "title";
            titlebar.appendChild(this._levelNameEl);
            this._shadow.appendChild(titlebar);
            this._board = document.createElement("div");
            this._board.className = "board";
            // Build tool bar
            let toolbar = document.createElement("div");
            toolbar.className = "toolbar";
            this._prevLevelButton = document.createElement("div");
            this._prevLevelButton.className = "tile prev";
            this._prevLevelButton.title = "P)revious level";
            this._prevLevelButton.addEventListener("click", this.prevLevel.bind(this));
            toolbar.appendChild(this._prevLevelButton);
            let resetButton = document.createElement("div");
            resetButton.className = "tile reset";
            resetButton.title = "R)estart level";
            resetButton.addEventListener("click", this.reset.bind(this));
            toolbar.appendChild(resetButton);
            this._moveCountEl = document.createElement("div");
            this._moveCountEl.className = "move-count"
            toolbar.appendChild(this._moveCountEl);
            let undoButton = document.createElement("div");
            undoButton.className = "tile undo";
            undoButton.title = "U)ndo last move";
            undoButton.addEventListener("click", this._undo.bind(this));
            toolbar.appendChild(undoButton);
            this._nextLevelButton = document.createElement("div");
            this._nextLevelButton.className = "tile next";
            this._nextLevelButton.title = "N)ext level";
            this._nextLevelButton.addEventListener("click", this.nextLevel.bind(this));
            toolbar.appendChild(this._nextLevelButton);
            this._shadow.appendChild(toolbar);
            this._activateEventListeners();
            this._updateDisplay();
            dispatchEvent(new HashChangeEvent("hashchange"));
        }

        _setLevelStyles() {
            this._levelStyle.textContent = `
:host {
    --cell-size: ${this._cellSize}px;
}
.board {
    width: calc(var(--cell-size) * ${this._level.width});
    height: calc(var(--cell-size) * ${this._level.height});
}`;
        }

        /** 
         * Load a set of levels from a given URL.
         * @param {String} url
         */
        _loadFromUrl(url) {
            fetch(url)
                .then(async response => {
                    if (response.headers.get("Content-Type") === "application/octet-stream") {
                        return response.arrayBuffer().then(buffer => {
                            const decoder = new TextDecoder("utf-8");
                            return decoder.decode(buffer);
                        });
                    }
                    else {
                        return response.text();
                    }
                })
                .then(levelsData => {
                    this._levels = XSBReader.parseMulti(levelsData);
                    console.info(`${this._levels.length} levels loaded.`);
                    this._restartLevel();
                })
                .catch(err => console.error(err));
        }

        /** 
         * Reset game data to its initial state.
         */
        reset() {
            this._restartLevel();
        }


        /**
         * Convert a ksokoban.online solution to URDL format.
         * E.g. the solution sequence for Warehouse level 3 is
         * l3,6-1r1d1,8-4l1u1,8-2l4,3-3u1,2-1r3,7-6u3,8-2l4,3-3u1,2-1r2,5-4r1,7-5u2,8-2l4,3-3u1,2-1r1,5-6u1,4-4r2,7-5u2,8-2l1,1-4r5,7-5u2
         * and the resulting URDL sequence is LLLUUURRRRDRDDLURULLLLULLLDDRRUDLLUURRRRDRRRDDDDLUUURULLLLULLLDDRRUDLLUURRRDLDDRRRLLLUURRRRRDDDLUURULLLLULLLDDRRUDLLUURRDRRRRDDDDLLUDRRUUUULLLLDDRRRLDDRRUUURULDDLLLLULLDRRRRRLDDRRUUU
         * @param {String} seq 
         * @returns {String} URDL sequence
         */
        convertToURDL(seq) {
            const level = this._level.clone();
            const tokenized = function* (seq) {
                const re = /([URDL]\d+)|(\d+-\d+)/i;
                let match;
                while (match = re.exec(seq)) {
                    yield match[0];
                    seq = seq.slice(match.index + match[0].length);
                }
            };
            let result = "";
            let pos = this._pos;
            for (const token of tokenized(seq)) {
                if (token.match(/[URDL]\d+/i)) {
                    const dir = token[0].toUpperCase();
                    const n = parseInt(token.slice(1));
                    for (let i = 0; i < n; ++i) {
                        pos = level.movePlayer(pos, dir);
                    }
                    result += dir.repeat(n).toUpperCase();
                }
                else if (token.match(/\d+-\d+/i)) {
                    const [x, y] = token.split("-").map(x => parseInt(x));
                    const dst = new Vec2(x, y);
                    const path = level.shortestPath(pos, dst);
                    pos = level.moveTo(pos, dst, Tile.Player);
                    if (!path) {
                        console.error("No path found.");
                        return null;
                    }
                    result += path;
                }
            }
            console.info(`${seq} -> ${result}`);
            return result;
        }

        _adjustCellSize() {
            const MARGIN_FOR_TITLE_AND_TOOLBAR = 5;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const maxWidth = Math.floor(viewportWidth / this._level.width);
            const maxHeight = Math.floor(viewportHeight / (this._level.height + MARGIN_FOR_TITLE_AND_TOOLBAR));
            let newSize = Math.min(maxWidth, maxHeight);
            newSize -= newSize % 8;
            this._cellSize = newSize;
            this._setLevelStyles();
        }

        _updateLevelName() {
            let chars = [];
            for (const digit of `${this._collection} ${(this._levelNum + 1).toString()}`) {
                const div = document.createElement("div");
                div.className = `char c${digit.charCodeAt(0)}`;
                chars.push(div);
            }
            this._levelNameEl.replaceChildren(...chars);
        }

        _updateDisplay() {
            let digits = [];
            for (const digit of this._moves.length.toString()) {
                const div = document.createElement("div");
                div.className = `char c${digit.charCodeAt(0)}`;
                digits.push(div);
            }
            this._moveCountEl.replaceChildren(...digits);
            if (this._levelNum === 0) {
                this._prevLevelButton.classList.add("disabled");
            }
            else {
                this._prevLevelButton.classList.remove("disabled");
            }
            if (this._levelNum + 1 >= this._levels.length) {
                this._nextLevelButton.classList.add("disabled");
            }
            else {
                this._nextLevelButton.classList.remove("disabled");
            }
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
            this._updateDisplay();
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

        prevLevel() {
            if (this._levelNum > 0) {
                --this._levelNum;
                this._buildHash();
                this._restartLevel();
            }
        }

        _activateEventListeners() {
            window.addEventListener("hashchange", this._onHashChange.bind(this));
            window.addEventListener("resize", this._onResize.bind(this));
            window.addEventListener("keydown", this._onKeyDown.bind(this));
            window.addEventListener("keypress", this._onKeyPress.bind(this));
            window.addEventListener("touchstart", this._onTouchStart.bind(this));
            window.addEventListener("touchend", this._onTouchEnd.bind(this));
        }

        _restartLevel() {
            if (this._levelNum >= 0 && this._levelNum < this._levels.length) {
                this._moves = [];
                this._undoStack = [];
                this._level = this._levels[this._levelNum].clone();
                this._adjustCellSize();
                this._buildLevel();
                this._updateDisplay();
                this._updateLevelName();
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
                    div.style.top = `calc(var(--cell-size) * ${row})`;
                    div.style.left = `calc(var(--cell-size) * ${col})`;
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
            window.location.hash = `#collection=${this._collection};level=${this._levelNum + 1}`;
        }

        _onResize(e) {
            this._adjustCellSize();
        }

        /** @param {TouchEvent} _e  */
        _onTouchStart(_e) {
            this._touchStartTime = performance.now();
            this._stimulatePlayer();
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
            this._stimulatePlayer();
        }

        /** @param {KeyboardEvent} e */
        _onKeyDown(e) {
            this._stimulatePlayer();
            switch (e.key) {
                case "u":
                // fallthrough
                case "z":
                    this._undo();
                    break;
                case "ArrowUp":
                // fallthrough
                case "w":
                    this.move(Direction.Up);
                    break;
                case "ArrowRight":
                // fallthrough
                case "d":
                    this.move(Direction.Right);
                    break;
                case "ArrowDown":
                // fallthrough
                case "s":
                    this.move(Direction.Down);
                    break;
                case "ArrowLeft":
                // fallthrough
                case "a":
                    this.move(Direction.Left);
                    break;
            }
        }

        /** @param {KeyboardEvent} e */
        _onKeyPress(e) {
            this._stimulatePlayer();
            switch (e.key) {
                case "?":
                    if (this._level.solution) {
                        this.play(this._level.solution);
                    }
                    break;
                case "r":
                    this._restartLevel();
                    break;
                case "n":
                // fallthrough
                case ".":
                    this.nextLevel();
                    break;
                case "p":
                // fallthrough
                case ",":
                    this.prevLevel();
                    break;
                default:
                    break;
            }
        }

        /** @param {HashChangeEvent} _e  */
        _onHashChange(_e) {
            const param = parseHash({ level: "1", collection: "Novoban" });
            if (this._collection !== param.collection) {
                this._collection = param.collection;
                this.loadFromUrl(`puzzles/xsb/${this._collection}.xsb`);
            }
            this.levelNum = parseInt(param.level) - 1;
            this._buildHash();
        }

        _relaxPlayer() {
            this._player.classList.add("relaxed");
            this._player.classList.remove("left", "right");
            clearTimeout(this._inactivityTimer);
        }

        _stimulatePlayer() {
            this._player.classList.remove("relaxed");
            clearTimeout(this._inactivityTimer);
            this._inactivityTimer = setTimeout(this._relaxPlayer.bind(this), 5000);
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
                        alert(`Congratulations! Mission accomplished with ${this._moves.length} moves: ${this._moves.join("")}. Head over to the next level by pressing OK.`);
                        this.nextLevel();
                    }
                    else {
                        alert(`Congratulations! Mission accomplished with ${this._moves.length} moves: ${this._moves.join("")}`);
                    }
                }, 10);
            };
        }

        /**
         * Plays a sequence of moves in the game.
         *
         * @param {string} seq - A string representing the sequence of moves to be played.
         */
        play(seq) {
            if (!seq.match(/^[URDL]+$/i)) {
                // It's probably a ksokoban sequence, so we need to convert it to URDL format
                seq = this.convertToURDL(seq);
                if (!seq) {
                    console.error("Invalid sequence.");
                    return;
                }
            }
            if (seq.length === 0)
                return;
            this.reset();
            let moves = seq.split("");
            let t0 = performance.now();
            const autoplay = () => {
                if (moves.length > 0 && performance.now() > t0 + 150) {
                    const move = moves.shift();
                    this.move(move.toUpperCase());
                    t0 = performance.now()
                }
                requestAnimationFrame(autoplay);
            }
            requestAnimationFrame(autoplay);
        }
    }

    /**
     * Plays a sequence of moves in the game.
     *
     * @param {string} seq - A string representing the sequence of moves to be played.
     */
    function play(seq) {
        el.game.play(seq);
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
