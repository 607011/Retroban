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
    at(x, y) {
        return this._data[y][x];
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

if (typeof window === 'undefined') {
    const fs = require('node:fs');
    fs.readFile('xsokoban_large_test_suite/GrigrSpecial_40.xsb', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        let levels = XSBReader.parseMulti(data);
        for (const level of levels) {
            console.debug(level);

        }
    });
}
