Object.defineProperty(window, "vultr", {
  get() {
    return {
      "scheme": "mm_exp",
      "servers": [{
        "ip": "mohmohx",
        "scheme": "mm_exp",
        "region": "0",
        "index": 0,
        "games": [{
          "playerCount": 0,
          "isPrivate": false
        }]
      }],
      "regionInfo": [{
        "name": "Pulsar's server"
      }]
    };
  }, set(_) {
    console.trace("Detected modification to window.vultr. Probably a bug of your script");
  }
});

if (window.location.search.length > 0) {
  window.location.search = "";
}

window.setInterval = new Proxy(window.setInterval, {
  __proto__: null,

  apply(targetObj, thisObj, argsArr) {
    if (/for\s\(let\s(\w+)\sof\svultr\.servers/gm.test(argsArr[0].toString())) {
      console.debug("Trying to remove reducant fixId by it's performant alternative");
      
      argsArr[0] = function adequateFixId() {
        let _Object$values;

        let copyServers = {};

        for (let s of window.vultr.servers) {
          copyServers[s.region] || (copyServers[s.region] = []);
          copyServers[s.region].push(s);
        }

        try {
          vultrClient.servers = copyServers;
        } catch(e) { }

        if (typeof vultrClient !== "undefined")
          clearInterval(fixId);
      }
    }

    return targetObj.apply(thisObj, argsArr);
  }
});

XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, {
  __proto__: null,
  apply(target, that, args) {
    if (/ping/gm.test(args[1])) args[1] = "//" + location.host;
    return target.apply(that, args);
  }
});

let __socket__;

WebSocket = new Proxy(WebSocket, {
  __proto__: null,
  construct(target, args) {
    if (__socket__) {
      __socket__.close();
      
      __socket__.onmessage = null;
      __socket__.onopen = null;
      __socket__.onclose = null;
      __socket__.onerror = null;

      __socket__ = null;
    }

    __socket__ = new target(location.href.includes("127.0.0.1") ? "ws://127.0.0.1:10000" : "wss://mohmohx.onrender.com", ["antibot-xss", "v3.penguin-stats.live+proto"]);

    window.__socket__ = __socket__;

    return window.__socket__;
  }
})

class CoreEncode {
  buffer = [];
  view = new DataView(new ArrayBuffer(8));

  write(...bytes) {
    this.buffer.push(...bytes);
  }

  start_arr(len) {
    if (len > 15 && len < 65535) {
      this.write(0xdc, len >>> 8, len);
    } else if (len < 15)
      this.write(0x90 + len);
    else {
      this.write(0xdd, len >>> 24, len >>> 16, len >>> 8, len);
    }

    return this;
  }

  fixstr(str) {
    const strenc = str.split("").map(_ => _.charCodeAt(0));
    if (strenc.length <= 31) {
      return this.write(0xa0 + strenc.length, ...strenc);
    } else if (strenc.length < 255) {
      this.write(0xd9, strenc.length, ...strenc);
    } else if (strenc.length < 65535) {
      this.write(0xda, strenc.length >>> 8, strenc.length, ...strenc);
    } else if (strenc.length < 4294967295) {
      this.write(0xdb, strenc.length >>> 24, strenc.length >>> 16, strenc.length >>> 8, strenc.length, ...strenc);
    }

    return this;
  }

  map(length) {
    if (length > 15 && length < 65535) {
      this.write(0xde, length >>> 8, length);
    } else if (length < 15)
      this.write(0x80 + length);
    else {
      this.write(0xdf, length >>> 24, length >>> 16, length >>> 8, length);
    }

    return this;
  }

  add_num(num) {
    if (typeof num == "bigint") num = Number(num);
    if (!Number.isInteger(num)) {
      this.view.setFloat64(0, num);

      this.write(0xcb, ...new Uint8Array(this.view.buffer));

      return this;
    }

    if (num == 0) this.write(0);
    else if (num > 0) {
      if (num < 127) {
        this.write(num);
      } else if (num < 256) {
        this.write(0xcc, num);
      } else if (num < 65535) {
        this.write(0xcd, num >>> 8, num);
        } else if (num < 4294967296) {
          this.write(0xce, num >>> 24, num >>> 16, num >>> 8, num  );
        } else if (num <= 18446744073709552000) {
          let h = num / 4294967296, l = num % 4294967296;
          this.write(0xcf, h >>> 24, h >>> 16, h >>> 8, h, l >>> 24, l >>> 16, l >>> 8, l);
        } else this.write(0xcf, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff);
      } else {
      if (num > -128) {
        this.write(0xd0, num);
      } else if (num > -32768) {
        this.write(0xd1, num >>> 8, num);
      } else if (num > -4294967296) {
          this.write(0xd2, num >>> 24, num >>> 16, num >>> 8, num);
        } else if (num >= -18446744073709552000) {
          let h = num / 4294967296, l = num % 4294967296;
          this.write(0xd3, h >>> 24, h >>> 16, h >>> 8, h, l >>> 24, l >>> 16, l >>> 8, l);
        } else this.write(0xd3, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    }

    return this;
  }

  encode(data, noReset) {
    if (!noReset) this.buffer.length = 0;
    if (data?.constructor?.name == "Array") {
      this.start_arr(data.length);
      for (let i = 0; i < data.length; i++) this.encode(data[i], true);
    } else if (typeof data == "object" && !!data) {
      const keys = Object.keys(data);
      this.map(keys.length);

      for (let i = 0; i < keys.length; i++) {
        this.encode(keys[i], true);
        this.encode(data[keys[i]], true);
      }
    } else if (typeof data == "string") this.fixstr(data);
    else if (typeof data == "number" || typeof data == "bigint") this.add_num(data);
    else if (typeof data == "boolean") this.write(data ? 0xC3 : 0xC2);
    else if (typeof data == "undefined" || isNaN(data) || data == null) this.write(0xc0);

    return new Uint8Array(this.buffer);
  }
}

class CoreDecode {
  buffer = [];
  offset = 0;

  readByte() {
    return this.buffer[this.offset++];
  }

  readBytes(amount) {
    return this.buffer.slice(this.offset, this.offset += amount);
  }

  skip(amount) {
    this.offset += amount;
  }

  decode(buff) {
    if (buff) {
      this.buffer = buff;
      this.view = new DataView(new Uint8Array(this.buffer).buffer);
      this.offset = 0;
    }

    const byte = this.readByte();
    if (byte >= 0xa0 && byte <= 0xbf) {
      const length = byte - 0xa0;
      return String.fromCharCode(...this.readBytes(length));
    } else if (byte == 0xd9) {
      return String.fromCharCode(...this.readBytes(this.readByte()));
    } else if (byte == 0xda) {
      return String.fromCharCode(...this.readBytes(this.readByte() << 8 | this.readByte()));
    } else if (byte == 0xdb) {
      return String.fromCharCode(...this.readBytes(this.readByte() >>> 24 | this.readByte() >>> 16 | this.readByte() >>> 8 | this.readByte()));
    } else if ((byte >= 0x90 && byte <= 0x9f) || byte == 0xdc || byte == 0xdd) {
      const length = byte == 0xdc ? (this.readByte() << 8 | this.readByte()) : byte == 0xdd ? (this.readByte() >>> 24 | this.readByte() >>> 16 | this.readByte() >>> 8 | this.readByte()) : byte - 0x90;
      const array = [];
      for (let i = 0; i < length; i++) {
        array.push(this.decode());
      }
      return array;
    } else if ((byte >= 0x80 && byte <= 0x8f) || byte == 0xde || byte == 0xdf) {
      const length = byte == 0xde ? (this.readByte() << 8 | this.readByte()) : byte == 0xdf ? (this.readByte() >>> 24 | this.readByte() >>> 16 | this.readByte() >>> 8 | this.readByte()) : byte - 0x80;
      const map = {};
      for (let i = 0; i < length; i++) {
        const key = this.decode();
        const value = this.decode();
        if (key != "__proto__") map[key] = value;
      }
      return map;
    } else if (byte > 0 && byte < 0x7f) {
      return byte;
    } else if (byte == 0xcc) {
      return this.readByte();
    } else if (byte == 0xcd) {
      return this.readByte() << 8 | this.readByte();
    } else if (byte == 0xce) {
      return this.readByte() << 24 | this.readByte() << 16 | this.readByte() << 8 | this.readByte();
    } else if (byte == 0xcf) {
      return BigInt(this.readByte()) << 8n | BigInt(this.readByte()) << 16n | BigInt(this.readByte()) << 24n | BigInt(this.readByte()) << 32n | BigInt(this.readByte()) << 40n | BigInt(this.readByte()) << 48n | BigInt(this.readByte()) << 56n | BigInt(this.readByte()) << 64n;
    } else if (byte >= 0xe0 && byte <= 0xff) {
      return 0xff - byte - 1;
    } else if (byte == 0xd0) {
      return this.readByte() - 256;
    } else if (byte == 0xd1) {
      return -(this.readByte() << 8 | this.readByte());
    } else if (byte == 0xd2) {
      return -(this.readByte() << 24 | this.readByte() << 16 | this.readByte() << 8 | this.readByte());
    } else if (byte == 0xd3) {
      return (0n | BigInt(this.readByte()) << 8n | BigInt(this.readByte()) << 16n | BigInt(this.readByte()) << 24n | BigInt(this.readByte()) << 32n | BigInt(this.readByte()) << 40n | BigInt(this.readByte()) << 48n | BigInt(this.readByte()) << 56n | BigInt(this.readByte()) << 64n) * (-1n);
    } else if (byte == 0xcb) {
      const res = this.view.getFloat64(this.offset);
      this.skip(8);
      return res;
    } else if (byte == 0xc3) return true;
    else if (byte == 0xc2) return false;
    else if (byte == 0xc0) return null;
    else return byte;
  }
}

const encoder = new CoreEncode();
const decoder = new CoreDecode();

const msgpack = {
  pack(data) {
    return new Promise((accept, reject) => {
      try {
        accept(this._encode(data));
      } catch(e) {
        reject(e);
      }
    })
  },
  unpack(buffer) {
    return new Promise((accept, reject) => {
      try {
        accept(this._decode(buffer));
      } catch(e) {
        reject(e);
      }
    });
  },
  _encode: encoder.encode.bind(encoder),
  _decode: decoder.decode.bind(decoder),
  encode: encoder.encode.bind(encoder),
  decode: decoder.decode.bind(decoder)
};

if (!window.msgpack)
  Object.defineProperty(window, "msgpack", {
    __proto__: null,
    get() {
      return msgpack;
    }, set(value) { }
  });

class Hook {
  constructor(object, prop, newVal) {
    try {
      Object.defineProperty(object, prop, {
        configurable: true,
        get() {
          return newVal;
        }, set(value) { }
      })
    } catch(e) { }
  }
}

window._css_updatePingCounter = new Function;
window._css_updateVariantProgress = new Function;
window.consentBlock = { style: {} };
window.cpmstarAPI = () => {};

new Hook(Object.prototype, "maxPlayers", 55);
new Hook(Object.prototype, "snowBiomeTop", 600);
new Hook(Object.prototype, "mapScale", 8000);
new Hook(Object.prototype, "riverWidth", 100);

try {
  Object.defineProperty(window, "captchaCallback", {
    __proto__: null,
    set(callback) {
      callback({ });
    }, get() {
      return window.cpmstarAPI;
    }
  });
} catch(e) { }

localStorage.setItem("consent", true);

window.consentBlock = { style: { } };

window.grecaptcha = new class {
  constructor() {
    this.maxCalls = 3;
  }

  async execute(token, options) {
    if (!this.maxCalls--) throw new SyntaxError("Failed to accumulate beta photons for byte 0xC3");

    return "flowerpro";
  }
};

document.getElementById = new Proxy(document.getElementById, {
  __proto__: null,
  apply(targetObj, thisObj, argsArr) {
    if (argsArr[0] == "menuCardHolder") {
      const interval = setInterval(() => {
        targetObj.apply(thisObj, argsArr).style.display = "flex";
      }, 1);

      setTimeout(() => {
        clearInterval(interval);
      }, 3000);
    }

    const element = targetObj.apply(thisObj, argsArr);
    
    if (!element) {
      return document.createElement("p");
    }
    
    return element;
  }
})

