import("./sokoban.js");

(function (window) {
    "use strict";

    const CELL_SIZE = 64;

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

    class Vec2 {
        x;
        y;
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
        mul(s) {
            return new Vec2(this.x * s, this.y * s);
        }
        add(v) {
            return new Vec2(this.x + v.x, this.y + v.y);
        }
    };

    class SokobanLevel {
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

    class XSBReader {
        static parseMulti(data) {
            const reRow = /^[@\+ \$\.\*#]{2,}$/;
            const reLE = /"\n|\r\n|\r"/;
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

    function parseHash(hash, defaults = {}) {
        let result = {};
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
        static observedAttributes = [/* attribute names to observe */];

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
            this._internals = this.attachInternals();
        }

        attributeChangedCallback(name, _oldValue, newValue) {
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
.tile {
    position: absolute;
    display: inline-block;
    background-image: url("images/tileset-colors-8x8.png");
    background-size: calc(2 * var(--cell-size)) calc(4 * var(--cell-size));
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
    background-position: 0 calc(-3 * var(--cell-size));
}
.tile.player {
    background-position: 0 0;
}
.tile.player.goal {
    background-position: calc(-1 * var(--cell-size)) calc(-3 * var(--cell-size));
}
.tile.reset {
    background-position: 0 calc(-1 * var(--cell-size));
    cursor: pointer;
}
`;
            this._shadow.appendChild(this._style);
            this._levelStyle = document.createElement("style");
            this._shadow.appendChild(this._levelStyle);
            this._board = document.createElement("div");
            this._board.className = "board";
            this._shadow.appendChild(this._board);
            let resetButton = document.createElement("div");
            resetButton.className = "tile reset";
            resetButton.addEventListener("click", this.reset.bind(this));
            this._shadow.appendChild(resetButton);
            this._activateEventListeners();
        }

        disconnectedCallback() {
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
                .then(response => response.text())
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

        /**
         * @param {number} levelNum
         */
        set levelNum(levelNum) {
            if (levelNum >= this._levels.length)
                return;
            this._levelNum = levelNum;
            this._restartLevel();
        }

        /** @returns {number} */
        get levelNum() {
            return this._levelNum;
        }

        nextLevel() {
            ++this.levelNum;
            this._buildHash();
        }

        _activateEventListeners() {
            window.addEventListener("hashchange", this._onHashChange.bind(this));
            dispatchEvent(new HashChangeEvent("hashchange"));
            window.addEventListener("keyup", this._onKeyUp.bind(this));
            window.addEventListener("touchstart", this._onTouchStart.bind(this));
            window.addEventListener("touchend", this._onTouchEnd.bind(this));
        }

        _restartLevel() {
            this._moves = [];
            this._level = this._levels[this._levelNum].clone();
            this._buildLevel();
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
            window.location.hash = `#level=${this._levelNum}`;
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
        _onKeyUp(e) {
            switch (e.key) {
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
            let { level } = parseHash(window.location.hash.substring(1), { level: "0" });
            this.levelNum = parseInt(level);
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
                this._pos = dst;
                this._moves.push(direction);
                this._buildLevel();
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
            this._pos = dst;
            this._moves.push(direction);
            this._buildLevel();
            if (this._level.missionAccomplished()) {
                setTimeout(() => {
                    alert(`Congratulations! Mission accomplished within ${this._moves.length} moves: ${this._moves.join("")}`);
                    this.nextLevel();
                }, 0);
            };
        }

        _dumpLevel() {
            console.debug(this._level.toString());
        }
    }

    function play(seq) {
        el.game.reset();
        let moves = seq.split("");
        let t0 = performance.now();
        const autoplay = () => {
            if (moves.length > 0 && performance.now() > t0 + 50) {
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
        console.info("%cSokoban started.", "color: green; font-weight: bold");
        customElements.define("sokoban-game", SokobanGame);
        el.game = document.querySelector("sokoban-game");
        el.game.loadFromUrl("xsokoban_large_test_suite/Microban II_135.xsb");
    }

    window.addEventListener("load", main);

    window.exports = {
        play
    };

})(window);
