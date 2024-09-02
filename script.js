// huffman.js

class HuffmanNode {
    constructor(char, freq) {
        this.char = char;
        this.freq = freq;
        this.left = null;
        this.right = null;
    }
}

class HuffmanCoding {
    constructor() {
        this.root = null;
    }

    buildHuffmanTree(freqMap) {
        const pq = Array.from(freqMap, ([char, freq]) => new HuffmanNode(char, freq));
        pq.sort((a, b) => a.freq - b.freq);

        while (pq.length > 1) {
            const left = pq.shift();
            const right = pq.shift();
            const parent = new HuffmanNode(null, left.freq + right.freq);
            parent.left = left;
            parent.right = right;
            pq.push(parent);
            pq.sort((a, b) => a.freq - b.freq);
        }

        this.root = pq[0];
    }

    generateCodes() {
        const codes = new Map();
        this._generateCodesHelper(this.root, "", codes);
        return codes;
    }

    _generateCodesHelper(node, code, codes) {
        if (node.char) {
            codes.set(node.char, code);
        } else {
            this._generateCodesHelper(node.left, code + "0", codes);
            this._generateCodesHelper(node.right, code + "1", codes);
        }
    }

    compress(text) {
        const freqMap = new Map();
        for (const char of text) {
            freqMap.set(char, (freqMap.get(char) || 0) + 1);
        }

        this.buildHuffmanTree(freqMap);
        const codes = this.generateCodes();
        
        let encodedData = "";
        for (const char of text) {
            encodedData += codes.get(char);
        }

        const padding = 8 - (encodedData.length % 8);
        encodedData = encodedData.padEnd(encodedData.length + padding, '0');

        const compressedData = new Uint8Array(encodedData.length / 8);
        for (let i = 0; i < encodedData.length; i += 8) {
            compressedData[i / 8] = parseInt(encodedData.substr(i, 8), 2);
        }

        return { compressedData, freqMap, padding };
    }

    decompress(compressedData, freqMap, padding) {
        this.buildHuffmanTree(freqMap);
        const codes = this.generateCodes();
        const reverseCodes = new Map(Array.from(codes, ([k, v]) => [v, k]));
        
        let binaryString = "";
        for (let i = 0; i < compressedData.length; i++) {
            binaryString += compressedData[i].toString(2).padStart(8, '0');
        }
        
        binaryString = binaryString.slice(0, -padding);

        let current = "";
        let decompressed = "";
        for (const bit of binaryString) {
            current += bit;
            if (reverseCodes.has(current)) {
                decompressed += reverseCodes.get(current);
                current = "";
            }
        }
        return decompressed;
    }
}

const compressFile = document.getElementById('compressFile');
const decompressFile = document.getElementById('decompressFile');
const compressBtn = document.getElementById('compressBtn');
const decompressBtn = document.getElementById('decompressBtn');
const downloadCompressed = document.getElementById('downloadCompressed');
const downloadDecompressed = document.getElementById('downloadDecompressed');
const status = document.getElementById('status');

let compressedData = null;
let decompressedData = null;

compressBtn.addEventListener('click', async () => {
    const file = compressFile.files[0];
    if (!file) {
        status.textContent = 'Please select a file to compress.';
        return;
    }

    const text = await file.text();
    const huffman = new HuffmanCoding();
    const { compressedData: compressed, freqMap, padding } = huffman.compress(text);

    const header = new TextEncoder().encode(JSON.stringify({ freqMap: Array.from(freqMap), padding }));
    const headerLength = new Uint32Array([header.length]);
    
    compressedData = new Uint8Array([...new Uint8Array(headerLength.buffer), ...header, ...compressed]);
    
    status.textContent = `Compression complete! Original size: ${text.length} bytes, Compressed size: ${compressedData.length} bytes`;
    downloadCompressed.style.display = 'inline-block';
});

decompressBtn.addEventListener('click', async () => {
    const file = decompressFile.files[0];
    if (!file) {
        status.textContent = 'Please select a .huff file to decompress.';
        return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const dataView = new DataView(arrayBuffer);
    const headerLength = dataView.getUint32(0, true);
    
    const headerArray = new Uint8Array(arrayBuffer, 4, headerLength);
    const header = JSON.parse(new TextDecoder().decode(headerArray));
    
    const compressedData = new Uint8Array(arrayBuffer, 4 + headerLength);
    
    const huffman = new HuffmanCoding();
    decompressedData = huffman.decompress(compressedData, new Map(header.freqMap), header.padding);
    
    status.textContent = `Decompression complete! Compressed size: ${arrayBuffer.byteLength} bytes, Decompressed size: ${decompressedData.length} bytes`;
    downloadDecompressed.style.display = 'inline-block';
});

downloadCompressed.addEventListener('click', () => {
    if (compressedData) {
        const blob = new Blob([compressedData.buffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'compressed.huff';
        a.click();
        URL.revokeObjectURL(url);
    }
});

downloadDecompressed.addEventListener('click', () => {
    if (decompressedData) {
        const blob = new Blob([decompressedData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'decompressed.txt';
        a.click();
        URL.revokeObjectURL(url);
    }
});
