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

    class State {
        static Initializing = 0;
        static Playing = 1;
        static Menu = 2;
        static TheEnd = 3;
    };

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
        /** @type {Number} */
        _state = State.Initializing;
        /** @type {String[]} */
        _moves = [];
        /** @type {Number} */
        _cellSize = CELL_SIZE;
        /** @type {HTMLElement[][]} */
        _tiles;
        /** @type {Vec2} */
        _pos;

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
    background-size: calc(8 * var(--cell-size)) calc(8 * var(--cell-size));
    width: var(--cell-size);
    height: var(--cell-size);
    cursor: inherit;
    box-sizing: content-box;
    background-repeat: no-repeat;
    image-rendering: -moz-pixelated;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: pixelated;
    -ms-interpolation-mode: nearest-neighbor;
}
.floor {
  background-position: calc(-1 * var(--cell-size)) calc(-4 * var(--cell-size));
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
            this._activateEventListeners();
            this._board = document.createElement("div");
            this._board.className = "board";
            this._shadow.appendChild(this._board);
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
            this._moves = [];
            this._buildLevel();
        }
        /**
         * @param {Number} levelNum
         */
        set levelNum(levelNum) {
            if (levelNum >= this._levels.length)
                return;
            this._levelNum = levelNum;
            this._restartLevel();
        }
        /** @returns {Number} */
        get levelNum() {
            this._levelNum;
        }
        enterLoop() {
            this._state = State.Playing;
            // requestAnimationFrame(this._update.bind(this));
        }
        _activateEventListeners() {
            window.addEventListener("hashchange", this._onHashChange.bind(this));
            dispatchEvent(new HashChangeEvent("hashchange"));
            window.addEventListener("keyup", this._onKeyUp.bind(this));
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
            const dstTile = this._level.at(dst.x, dst.y);
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
            const dstTile2 = this._level.at(dst2.x, dst2.y);
            if ((dstTile2 & Tile.Wall) || (dstTile2 & Tile.Crate))
                return;
            this._level.moveTo(this._pos, dst, Tile.Player);
            this._level.moveTo(dst, dst2, Tile.Crate);
            this._pos = dst;
            this._moves.push(direction);
            this._buildLevel();
        }
        _dumpLevel() {
            console.debug(this._level.toString());
        }
        /** @param {number} t (in milliseconds since page loaded) */
        _update(t) {
            switch (this._state) {
                case State.Playing:
                    this._updateGame(t);
                    break;
                case State.Menu:
                    this._menu(t);
                    break;
                case State.TheEnd:
                    this._theEnd(t);
                    break;
                default:
                    break;
            }
            requestAnimationFrame(this._update.bind(this));
        }
    }

    let el = {};

    function main() {
        console.info("%cSokoban started.", "color: green; font-weight: bold");
        customElements.define("sokoban-game", SokobanGame);
        el.game = document.querySelector("sokoban-game");
        el.game.loadFromUrl("xsokoban_large_test_suite/Microban II_135.xsb");
        el.game.enterLoop();
    }

    window.addEventListener("load", main);

})(window);
