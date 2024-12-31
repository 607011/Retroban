import("./sokoban.js");

(function (window) {
    "use strict";

    function parseHash(hash, defaults = {}) {
        let result = {};
        for (const arg of hash.split(";")) {
            const [key, value] = arg.split("=");
            result[key] = value;
        }
        return Object.assign(defaults, result);
    }

    const CELL_SIZE = 64;

    const MOVE = {
        U: new Vec2(0, -1),
        R: new Vec2(+1, 0),
        D: new Vec2(0, +1),
        L: new Vec2(-1, 0),
    }

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
    background-image: url("images/tileset-bw-8x8.png");
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
.floor {
    background-position: 0 calc(-2 * var(--cell-size));
}
.goal {
    background-position: calc(-1 * var(--cell-size)) 0;
}
.crate {
    background-position: calc(-1 * var(--cell-size)) calc(-1 * var(--cell-size));
}
.crate.goal {
    background-position: calc(-1 * var(--cell-size)) calc(-2 * var(--cell-size));
}
.wall {
    background-position: 0 calc(-3 * var(--cell-size));
}
.player {
    background-position: 0 0;
}
.player.goal {
    background-position: calc(-1 * var(--cell-size)) calc(-3 * var(--cell-size));
}
`;
            this._shadow.appendChild(this._style);
            this._levelStyle = document.createElement("style");
            this._shadow.appendChild(this._levelStyle);
            this._board = document.createElement("div");
            this._board.className = "board";
            this._shadow.appendChild(this._board);
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
        }

        _activateEventListeners() {
            window.addEventListener("hashchange", this._onHashChange.bind(this));
            dispatchEvent(new HashChangeEvent("hashchange"));
            window.addEventListener("keyup", this._onKeyUp.bind(this));
            window.addEventListener("click", this._onClick.bind(this));
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
            window.location.hash = `#level=${this._currentLevelNum}`;
        }

        _onClick(e) {
            const playerRect = this._player.getBoundingClientRect();
            const inHoriRange = playerRect.left < e.clientX && e.clientX < playerRect.right;
            const inVertRange = playerRect.top < e.clientY && e.clientY < playerRect.bottom;
            if ((inHoriRange && inVertRange) || (!inHoriRange && !inVertRange))
                return;
            if (e.clientX < playerRect.left) {
                this.move("L");
            }
            else if (e.clientX > playerRect.right) {
                this.move("R");
            }
            else if (e.clientY < playerRect.top) {
                this.move("U");
            }
            else if (e.clientY > playerRect.bottom) {
                this.move("D");
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
                    this.move("U");
                    break;
                case "ArrowRight":
                case "d":
                    this.move("R");
                    break;
                case "ArrowDown":
                case "s":
                    this.move("D");
                    break;
                case "ArrowLeft":
                case "a":
                    this.move("L");
                    break;
            }
        }

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
