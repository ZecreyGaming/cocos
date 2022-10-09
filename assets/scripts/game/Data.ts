import DataFactory from "./DataFactory";

export class FrameData {
    public frame = -1;                  // uint32
    public mapSize = 0;                 // uint32
    public mapData = [];                // uint8 / 一个字节标识两个格子
    public playerCount = 0;             // uint32
    public players: Array<PlayerData> = [];
    public itemCount = 0;               // uint32;  
    public items: Array<ItemData> = [];

    public static reset(fd: FrameData) {
        fd.frame = -1;
        fd.playerCount = 0;
        fd.mapSize = 0;
        fd.players.splice(0, fd.players.length);
        fd.items.splice(0, fd.items.length);
    }

    public static parse(v: DataView, offset: number, fd: FrameData, factory: DataFactory) {
        fd.frame = v.getUint32(offset);
        offset += 4;
        fd.mapSize = v.getUint32(offset);
        offset += 4;
        if (v.byteLength > offset) {
            let mapIdx = 0;
            for (let i = 0; i < fd.mapSize; i++) {
                let n = v.getInt8(offset);
                offset += 1;
                let hei = (n & 0xf0) >> 4;
                let low = n & 0x0f;
                fd.mapData[mapIdx] = hei;
                mapIdx += 1;
                fd.mapData[mapIdx] = low;
                mapIdx += 1;
            }
        }
        if (v.byteLength > offset) {
            fd.playerCount = v.getUint32(offset);
            offset += 4;
            for (let i = 0; i < fd.playerCount; i++) {
                let pd = factory.createPlayerData();
                offset = PlayerData.parse(v, offset, pd);
                fd.players.push(pd);
            }
        }
        if (v.byteLength > offset) {
            fd.itemCount = v.getUint32(offset);
            offset += 4;
            for (let i = 0; i < fd.itemCount; i++) {
                let itemData = factory.createItemData()
                offset = ItemData.parse(v, offset, itemData);
                fd.items.push(itemData);
            }
        }
        return offset;
    }
}

export class PlayerData {
    public id: string = null;     // uint64 - 8
    public rotation = 0;          // uint16 - 2
    public x = 0;                 // float64 - 8
    public y = 0;                 // float64 - 8

    public static parse(v: DataView, offset: number, out: PlayerData) {
        let getBigUint64func = v['getBigUint64'];
        if (getBigUint64func instanceof Function) {
            out.id =  v['getBigUint64'](offset) + '';
        }
        offset += 8;
        out.rotation = v.getInt16(offset);
        offset += 2;
        out.x = v.getFloat64(offset);
        offset += 8;
        out.y = v.getFloat64(offset);
        offset += 8;
        return offset;
    }

    public static reset(pd: PlayerData) {
        pd.rotation = 0;
        pd.id  = null;
        pd.x = 0;
        pd.y = 0;
    }
}

// count uint32
export class ItemData {
    public id: number = 0;      // uint32
    public type: number = 0;    // uint8
    public x: number = 0;       // float64
    public y: number = 0;       // float64

    public static parse(v: DataView, offset: number, out: ItemData): number {
        out.id = v.getUint32(offset);
        offset += 4;
        out.type = v.getUint8(offset);
        offset += 1;
        out.x = v.getFloat64(offset);
        offset += 8;
        out.y = v.getFloat64(offset);
        offset += 8;
        return offset;
    }

    public static reset(itemData: ItemData) {
        itemData.id = 0;
        itemData.x = 0;
        itemData.y = 0;
        itemData.type = 0;
    }
}