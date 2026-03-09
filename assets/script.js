/* ============================================================
   Qryptix — Main Script
   Modules: QR Generation, Customization, UI, Settings,
   History, Clipboard, Export, Toast, Vault, TOTP, PasswordGen
   ============================================================ */

"use strict";

/* ────────────────────────────────────────────────────────────
   MODULE: QR Code Generator (Pure JS, no external API)
   Based on QR Code specification ISO 18004
   ──────────────────────────────────────────────────────────── */
const QR = (() => {
    // Error correction codewords and block info
    const EC_CODEWORDS_TABLE = [
        // [total, ec_per_block, blocks_group1, data_cw_g1, blocks_group2, data_cw_g2]
        // Version 1-40, L/M/Q/H
    ];

    // Simplified QR code generation using Canvas
    // We'll use the proven qrcode-generator algorithm (MIT equivalent approach)

    const MODE_NUMBER = 1,
        MODE_ALPHA = 2,
        MODE_BYTE = 4,
        MODE_KANJI = 8;

    // Reed-Solomon / Galois field math
    const GF256_EXP = new Uint8Array(256);
    const GF256_LOG = new Uint8Array(256);
    (function initGF() {
        let x = 1;
        for (let i = 0; i < 255; i++) {
            GF256_EXP[i] = x;
            GF256_LOG[x] = i;
            x <<= 1;
            if (x & 0x100) x ^= 0x11d;
        }
        GF256_EXP[255] = GF256_EXP[0];
    })();

    function gfMul(a, b) {
        if (a === 0 || b === 0) return 0;
        return GF256_EXP[(GF256_LOG[a] + GF256_LOG[b]) % 255];
    }

    function polyMul(p1, p2) {
        const result = new Uint8Array(p1.length + p2.length - 1);
        for (let i = 0; i < p1.length; i++) {
            for (let j = 0; j < p2.length; j++) {
                result[i + j] ^= gfMul(p1[i], p2[j]);
            }
        }
        return result;
    }

    function rsGenPoly(nsym) {
        let g = new Uint8Array([1]);
        for (let i = 0; i < nsym; i++) {
            g = polyMul(g, new Uint8Array([1, GF256_EXP[i]]));
        }
        return g;
    }

    function rsEncode(data, nsym) {
        const gen = rsGenPoly(nsym);
        const msg = new Uint8Array(data.length + nsym);
        msg.set(data);
        for (let i = 0; i < data.length; i++) {
            const coef = msg[i];
            if (coef !== 0) {
                for (let j = 0; j < gen.length; j++) {
                    msg[i + j] ^= gfMul(gen[j], coef);
                }
            }
        }
        return msg.slice(data.length);
    }

    // QR Code data capacity table [version][ecl] = capacity in bytes (8-bit mode)
    const CAPACITIES = [
        null,
        [17, 14, 11, 7],
        [32, 26, 20, 14],
        [53, 42, 32, 24],
        [78, 62, 46, 34],
        [106, 84, 60, 44],
        [134, 106, 74, 58],
        [154, 122, 86, 64],
        [192, 152, 108, 84],
        [230, 180, 130, 98],
        [271, 213, 151, 119],
        [321, 251, 177, 137],
        [367, 287, 203, 155],
        [425, 331, 241, 177],
        [458, 362, 258, 194],
        [520, 412, 292, 220],
        [586, 450, 322, 250],
        [644, 504, 364, 280],
        [718, 560, 394, 310],
        [792, 624, 442, 338],
        [858, 666, 482, 382],
        [929, 711, 509, 403],
        [1003, 779, 565, 439],
        [1091, 857, 611, 461],
        [1171, 911, 661, 511],
        [1273, 997, 715, 535],
        [1367, 1059, 751, 593],
        [1465, 1125, 805, 625],
        [1528, 1190, 868, 658],
        [1628, 1264, 908, 698],
        [1732, 1370, 982, 742],
        [1840, 1452, 1030, 790],
        [1952, 1538, 1112, 842],
        [2068, 1628, 1168, 898],
        [2188, 1722, 1228, 958],
        [2303, 1809, 1283, 983],
        [2431, 1911, 1351, 1051],
        [2563, 1989, 1423, 1093],
        [2699, 2099, 1499, 1139],
        [2809, 2213, 1579, 1219],
        [2953, 2331, 1663, 1273],
    ];

    // EC codewords per block
    const EC_TABLE = [
        null,
        [7, 10, 13, 17],
        [10, 16, 22, 28],
        [15, 26, 18, 22],
        [20, 18, 26, 16],
        [26, 24, 18, 22],
        [18, 16, 24, 28],
        [20, 18, 18, 26],
        [24, 22, 22, 26],
        [30, 22, 20, 24],
        [18, 26, 24, 28],
        [20, 30, 28, 24],
        [24, 22, 26, 28],
        [26, 22, 24, 22],
        [30, 24, 20, 24],
        [22, 24, 30, 24],
        [24, 28, 24, 30],
        [28, 28, 28, 28],
        [30, 26, 28, 28],
        [28, 26, 26, 26],
        [28, 26, 28, 28],
        [28, 26, 30, 28],
        [28, 28, 24, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [26, 28, 30, 30],
        [28, 28, 28, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
        [30, 28, 30, 30],
    ];

    // Number of RS blocks
    const NUM_BLOCKS = [
        null,
        [1, 1, 1, 1],
        [1, 1, 1, 1],
        [1, 1, 2, 2],
        [1, 2, 2, 4],
        [1, 2, 4, 4],
        [2, 4, 4, 4],
        [2, 4, 6, 5],
        [2, 4, 6, 6],
        [2, 5, 8, 8],
        [4, 5, 8, 8],
        [4, 5, 8, 11],
        [4, 8, 10, 11],
        [4, 9, 12, 16],
        [4, 9, 16, 16],
        [6, 10, 12, 18],
        [6, 10, 17, 16],
        [6, 11, 16, 19],
        [6, 13, 18, 21],
        [7, 14, 21, 25],
        [8, 16, 20, 25],
        [8, 17, 23, 25],
        [9, 17, 23, 34],
        [9, 18, 25, 30],
        [10, 20, 27, 32],
        [12, 21, 29, 35],
        [12, 23, 34, 37],
        [12, 25, 34, 40],
        [13, 26, 35, 42],
        [14, 28, 38, 45],
        [15, 29, 40, 48],
        [16, 31, 43, 51],
        [17, 33, 45, 54],
        [18, 35, 48, 57],
        [19, 37, 51, 60],
        [19, 38, 53, 63],
        [20, 40, 56, 66],
        [21, 43, 59, 70],
        [22, 45, 62, 74],
        [24, 47, 65, 77],
        [25, 49, 68, 81],
    ];

    const ECL_MAP = { L: 0, M: 1, Q: 2, H: 3 };

    function getVersion(dataLen, ecl) {
        const eclIdx = ECL_MAP[ecl] || 0;
        for (let v = 1; v <= 40; v++) {
            // Account for mode indicator (4 bits), char count indicator, and terminator
            const charCountBits = v <= 9 ? 8 : 16;
            const overhead = Math.ceil((4 + charCountBits + 4) / 8); // mode + count + terminator
            if (CAPACITIES[v][eclIdx] >= dataLen) return v;
        }
        return 40;
    }

    function getSize(version) {
        return version * 4 + 17;
    }

    // Alignment pattern positions
    function getAlignmentPositions(version) {
        if (version === 1) return [];
        const positions = [6];
        const size = getSize(version);
        const last = size - 7;
        const count = Math.ceil((last - 6) / 28) + 1;
        let step = count > 1 ? Math.ceil((last - 6) / (count - 1)) : 0;
        if (step % 2 !== 0) step++;
        const result = [6];
        for (let pos = last; result.length < count; pos -= step) {
            result.splice(1, 0, pos);
        }
        return result;
    }

    // Create module matrix
    function createMatrix(version) {
        const size = getSize(version);
        const matrix = Array.from({ length: size }, () => new Int8Array(size)); // 0=unset, 1=black, -1=white(reserved)
        const reserved = Array.from(
            { length: size },
            () => new Uint8Array(size),
        ); // 1=reserved

        // Finder patterns
        function setFinderPattern(row, col) {
            for (let r = -1; r <= 7; r++) {
                for (let c = -1; c <= 7; c++) {
                    const rr = row + r,
                        cc = col + c;
                    if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
                    const isBlack =
                        (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                        (r >= 2 && r <= 4 && c >= 2 && c <= 4);
                    matrix[rr][cc] = isBlack ? 1 : -1;
                    reserved[rr][cc] = 1;
                }
            }
        }

        setFinderPattern(0, 0);
        setFinderPattern(0, size - 7);
        setFinderPattern(size - 7, 0);

        // Timing patterns
        for (let i = 8; i < size - 8; i++) {
            const val = i % 2 === 0 ? 1 : -1;
            if (!reserved[6][i]) {
                matrix[6][i] = val;
                reserved[6][i] = 1;
            }
            if (!reserved[i][6]) {
                matrix[i][6] = val;
                reserved[i][6] = 1;
            }
        }

        // Alignment patterns
        const alignPos = getAlignmentPositions(version);
        for (const row of alignPos) {
            for (const col of alignPos) {
                if (reserved[row][col]) continue;
                for (let r = -2; r <= 2; r++) {
                    for (let c = -2; c <= 2; c++) {
                        const isBlack =
                            Math.abs(r) === 2 ||
                            Math.abs(c) === 2 ||
                            (r === 0 && c === 0);
                        matrix[row + r][col + c] = isBlack ? 1 : -1;
                        reserved[row + r][col + c] = 1;
                    }
                }
            }
        }

        // Dark module
        matrix[size - 8][8] = 1;
        reserved[size - 8][8] = 1;

        // Reserve format info areas
        for (let i = 0; i < 8; i++) {
            if (!reserved[8][i]) reserved[8][i] = 1;
            if (!reserved[8][size - 1 - i]) reserved[8][size - 1 - i] = 1;
            if (!reserved[i][8]) reserved[i][8] = 1;
            if (!reserved[size - 1 - i][8]) reserved[size - 1 - i][8] = 1;
        }
        reserved[8][8] = 1;

        // Reserve version info areas (version >= 7)
        if (version >= 7) {
            for (let i = 0; i < 6; i++) {
                for (let j = 0; j < 3; j++) {
                    reserved[i][size - 11 + j] = 1;
                    reserved[size - 11 + j][i] = 1;
                }
            }
        }

        return { matrix, reserved, size };
    }

    // Encode data to bit stream
    function encodeData(text, version, ecl) {
        const eclIdx = ECL_MAP[ecl];
        const totalCW =
            CAPACITIES[version][eclIdx] +
            EC_TABLE[version][eclIdx] * NUM_BLOCKS[version][eclIdx];

        // For simplicity: byte mode encoding
        const utf8 = new TextEncoder().encode(text);
        const bits = [];

        function addBits(value, length) {
            for (let i = length - 1; i >= 0; i--) {
                bits.push((value >> i) & 1);
            }
        }

        // Mode indicator (byte mode = 0100)
        addBits(MODE_BYTE, 4);

        // Character count
        const ccBits = version <= 9 ? 8 : 16;
        addBits(utf8.length, ccBits);

        // Data
        for (const byte of utf8) {
            addBits(byte, 8);
        }

        // Terminator
        const totalBits = CAPACITIES[version][eclIdx] * 8;
        const remaining = totalBits - bits.length;
        addBits(0, Math.min(4, remaining));

        // Pad to byte boundary
        while (bits.length % 8 !== 0) bits.push(0);

        // Pad bytes
        const PAD = [0xec, 0x11];
        let padIdx = 0;
        while (bits.length < totalBits) {
            addBits(PAD[padIdx], 8);
            padIdx ^= 1;
        }

        // Convert to bytes
        const dataBytes = new Uint8Array(bits.length / 8);
        for (let i = 0; i < dataBytes.length; i++) {
            let byte = 0;
            for (let j = 0; j < 8; j++) {
                byte = (byte << 1) | bits[i * 8 + j];
            }
            dataBytes[i] = byte;
        }

        return dataBytes;
    }

    function addErrorCorrection(data, version, ecl) {
        const eclIdx = ECL_MAP[ecl];
        const numBlocks = NUM_BLOCKS[version][eclIdx];
        const ecCWPerBlock = EC_TABLE[version][eclIdx];
        const totalDataCW = CAPACITIES[version][eclIdx];
        const shortBlockLen = Math.floor(totalDataCW / numBlocks);
        const longBlocks = totalDataCW % numBlocks;

        const blocks = [];
        const ecBlocks = [];
        let offset = 0;

        for (let i = 0; i < numBlocks; i++) {
            const blockLen =
                shortBlockLen + (i >= numBlocks - longBlocks ? 1 : 0);
            const blockData = data.slice(offset, offset + blockLen);
            blocks.push(blockData);
            ecBlocks.push(rsEncode(blockData, ecCWPerBlock));
            offset += blockLen;
        }

        // Interleave data
        const result = [];
        const maxDataLen = shortBlockLen + (longBlocks > 0 ? 1 : 0);
        for (let i = 0; i < maxDataLen; i++) {
            for (let j = 0; j < numBlocks; j++) {
                if (i < blocks[j].length) result.push(blocks[j][i]);
            }
        }

        // Interleave EC
        for (let i = 0; i < ecCWPerBlock; i++) {
            for (let j = 0; j < numBlocks; j++) {
                result.push(ecBlocks[j][i]);
            }
        }

        return result;
    }

    function placeData(matrix, reserved, size, codewords) {
        const bits = [];
        for (const cw of codewords) {
            for (let i = 7; i >= 0; i--) bits.push((cw >> i) & 1);
        }

        let bitIdx = 0;
        let upward = true;
        for (let col = size - 1; col >= 0; col -= 2) {
            if (col === 6) col = 5; // skip timing column
            const rows = upward
                ? Array.from({ length: size }, (_, i) => size - 1 - i)
                : Array.from({ length: size }, (_, i) => i);
            for (const row of rows) {
                for (const c of [col, col - 1]) {
                    if (c < 0 || reserved[row][c]) continue;
                    if (bitIdx < bits.length) {
                        matrix[row][c] = bits[bitIdx] ? 1 : -1;
                        bitIdx++;
                    } else {
                        matrix[row][c] = -1;
                    }
                }
            }
            upward = !upward;
        }
    }

    // Masking
    const MASK_FNS = [
        (r, c) => (r + c) % 2 === 0,
        (r, c) => r % 2 === 0,
        (r, c) => c % 3 === 0,
        (r, c) => (r + c) % 3 === 0,
        (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
        (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
        (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
        (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
    ];

    function applyMask(matrix, reserved, size, maskIndex) {
        const fn = MASK_FNS[maskIndex];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (!reserved[r][c] && fn(r, c)) {
                    matrix[r][c] = matrix[r][c] === 1 ? -1 : 1;
                }
            }
        }
    }

    function penaltyScore(matrix, size) {
        let penalty = 0;

        // Rule 1: consecutive same-color modules
        for (let r = 0; r < size; r++) {
            let count = 1;
            for (let c = 1; c < size; c++) {
                if (matrix[r][c] > 0 === matrix[r][c - 1] > 0) {
                    count++;
                    if (count === 5) penalty += 3;
                    else if (count > 5) penalty++;
                } else count = 1;
            }
        }
        for (let c = 0; c < size; c++) {
            let count = 1;
            for (let r = 1; r < size; r++) {
                if (matrix[r][c] > 0 === matrix[r - 1][c] > 0) {
                    count++;
                    if (count === 5) penalty += 3;
                    else if (count > 5) penalty++;
                } else count = 1;
            }
        }

        // Rule 2: 2x2 blocks of same color
        for (let r = 0; r < size - 1; r++) {
            for (let c = 0; c < size - 1; c++) {
                const v = matrix[r][c] > 0;
                if (
                    v === matrix[r][c + 1] > 0 &&
                    v === matrix[r + 1][c] > 0 &&
                    v === matrix[r + 1][c + 1] > 0
                ) {
                    penalty += 3;
                }
            }
        }

        // Rule 3: finder-like patterns
        const patterns = [
            [1, -1, 1, 1, 1, -1, 1, -1, -1, -1, -1],
            [-1, -1, -1, -1, 1, -1, 1, 1, 1, -1, 1],
        ];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c <= size - 11; c++) {
                for (const pat of patterns) {
                    let match = true;
                    for (let i = 0; i < 11; i++) {
                        if ((matrix[r][c + i] > 0 ? 1 : -1) !== pat[i]) {
                            match = false;
                            break;
                        }
                    }
                    if (match) penalty += 40;
                }
            }
        }
        for (let c = 0; c < size; c++) {
            for (let r = 0; r <= size - 11; r++) {
                for (const pat of patterns) {
                    let match = true;
                    for (let i = 0; i < 11; i++) {
                        if ((matrix[r + i][c] > 0 ? 1 : -1) !== pat[i]) {
                            match = false;
                            break;
                        }
                    }
                    if (match) penalty += 40;
                }
            }
        }

        // Rule 4: proportion of dark modules
        let dark = 0;
        for (let r = 0; r < size; r++)
            for (let c = 0; c < size; c++) if (matrix[r][c] > 0) dark++;
        const pct = (dark / (size * size)) * 100;
        const prev5 = Math.floor(pct / 5) * 5;
        const next5 = prev5 + 5;
        penalty +=
            Math.min(Math.abs(prev5 - 50) / 5, Math.abs(next5 - 50) / 5) * 10;

        return penalty;
    }

    // Format info
    const FORMAT_POLY = 0x537;
    const FORMAT_MASK = 0x5412;

    function getFormatBits(ecl, mask) {
        const eclBits = [1, 0, 3, 2][ECL_MAP[ecl]]; // L=01, M=00, Q=11, H=10
        let data = (eclBits << 3) | mask;
        let rem = data;
        for (let i = 0; i < 10; i++) {
            rem = (rem << 1) ^ ((rem >> 9) * FORMAT_POLY);
        }
        const bits = ((data << 10) | rem) ^ FORMAT_MASK;
        return bits;
    }

    function placeFormatBits(matrix, size, ecl, mask) {
        const bits = getFormatBits(ecl, mask);
        const positions1 = [
            [8, 0],
            [8, 1],
            [8, 2],
            [8, 3],
            [8, 4],
            [8, 5],
            [8, 7],
            [8, 8],
            [7, 8],
            [5, 8],
            [4, 8],
            [3, 8],
            [2, 8],
            [1, 8],
            [0, 8],
        ];
        const positions2 = [
            [size - 1, 8],
            [size - 2, 8],
            [size - 3, 8],
            [size - 4, 8],
            [size - 5, 8],
            [size - 6, 8],
            [size - 7, 8],
            [8, size - 8],
            [8, size - 7],
            [8, size - 6],
            [8, size - 5],
            [8, size - 4],
            [8, size - 3],
            [8, size - 2],
            [8, size - 1],
        ];

        for (let i = 0; i < 15; i++) {
            const bit = (bits >> (14 - i)) & 1;
            const val = bit ? 1 : -1;
            matrix[positions1[i][0]][positions1[i][1]] = val;
            matrix[positions2[i][0]][positions2[i][1]] = val;
        }
    }

    // Version info (version >= 7)
    function placeVersionBits(matrix, size, version) {
        if (version < 7) return;
        let rem = version;
        for (let i = 0; i < 12; i++) {
            rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
        }
        const bits = (version << 12) | rem;
        for (let i = 0; i < 18; i++) {
            const bit = (bits >> i) & 1;
            const val = bit ? 1 : -1;
            const r = Math.floor(i / 3);
            const c = i % 3;
            matrix[r][size - 11 + c] = val;
            matrix[size - 11 + c][r] = val;
        }
    }

    // Main generate function - returns a 2D boolean array (true = black)
    function generate(text, ecl = "M") {
        if (!text) return null;
        const utf8 = new TextEncoder().encode(text);
        const version = getVersion(utf8.length, ecl);
        const { matrix, reserved, size } = createMatrix(version);
        const data = encodeData(text, version, ecl);
        const codewords = addErrorCorrection(data, version, ecl);
        placeData(matrix, reserved, size, codewords);

        // Try all masks, pick best
        let bestMask = 0,
            bestScore = Infinity;
        const origMatrix = matrix.map((r) => r.slice());
        for (let m = 0; m < 8; m++) {
            // Reset matrix
            for (let r = 0; r < size; r++)
                for (let c = 0; c < size; c++) matrix[r][c] = origMatrix[r][c];
            applyMask(matrix, reserved, size, m);
            placeFormatBits(matrix, size, ecl, m);
            placeVersionBits(matrix, size, version);
            const score = penaltyScore(matrix, size);
            if (score < bestScore) {
                bestScore = score;
                bestMask = m;
            }
        }

        // Apply best mask
        for (let r = 0; r < size; r++)
            for (let c = 0; c < size; c++) matrix[r][c] = origMatrix[r][c];
        applyMask(matrix, reserved, size, bestMask);
        placeFormatBits(matrix, size, ecl, bestMask);
        placeVersionBits(matrix, size, version);

        // Convert to boolean
        const result = [];
        for (let r = 0; r < size; r++) {
            result[r] = [];
            for (let c = 0; c < size; c++) {
                result[r][c] = matrix[r][c] > 0;
            }
        }
        return { modules: result, size, version };
    }

    return { generate };
})();

/* ────────────────────────────────────────────────────────────
   MODULE: Toast Messages
   ──────────────────────────────────────────────────────────── */
const Toast = (() => {
    const container = document.getElementById("toast-container");

    function show(message, type = "info", duration = 3000) {
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add("removing");
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    return {
        show,
        success: (m) => show(m, "success"),
        error: (m) => show(m, "error"),
        info: (m) => show(m, "info"),
        warning: (m) => show(m, "warning"),
    };
})();

/* ────────────────────────────────────────────────────────────
   MODULE: Settings Manager
   ──────────────────────────────────────────────────────────── */
const Settings = (() => {
    const DEFAULTS = {
        theme: "dark",
        accent: "#6366f1",
        defaultEC: "M",
        defaultSize: 400,
        livePreview: true,
        autoLockMinutes: 5,
    };

    let current = {};

    function load() {
        try {
            const stored = localStorage.getItem("qryptix_settings");
            current = stored
                ? { ...DEFAULTS, ...JSON.parse(stored) }
                : { ...DEFAULTS };
        } catch {
            current = { ...DEFAULTS };
        }
        apply();
    }

    function save() {
        localStorage.setItem("qryptix_settings", JSON.stringify(current));
        apply();
    }

    function apply() {
        document.documentElement.setAttribute("data-theme", current.theme);
        document.documentElement.style.setProperty("--accent", current.accent);
        // Compute hover
        document.documentElement.style.setProperty(
            "--accent-hover",
            current.accent,
        );
        document.documentElement.style.setProperty(
            "--accent-light",
            current.accent + "1f",
        );
    }

    function get(key) {
        return current[key] ?? DEFAULTS[key];
    }
    function set(key, value) {
        current[key] = value;
        save();
    }
    function reset() {
        current = { ...DEFAULTS };
        save();
    }

    return { load, save, get, set, reset, getAll: () => ({ ...current }) };
})();

/* ────────────────────────────────────────────────────────────
   MODULE: Data Detection
   ──────────────────────────────────────────────────────────── */
const DataDetector = (() => {
    const patterns = {
        url: /^https?:\/\/.+/i,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^\+?[\d\s\-().]{7,20}$/,
    };

    function detect(text) {
        if (!text || text.trim() === "") return "text";
        const t = text.trim();
        if (patterns.url.test(t)) return "url";
        if (patterns.email.test(t)) return "email";
        if (patterns.phone.test(t)) return "phone";
        return "text";
    }

    return { detect };
})();

/* ────────────────────────────────────────────────────────────
   MODULE: QR Rendering (Canvas & SVG)
   ──────────────────────────────────────────────────────────── */
const QRRenderer = (() => {
    function toCanvas(canvas, qr, options = {}) {
        const {
            size = 400,
            fgColor = "#000000",
            bgColor = "#ffffff",
            logo = null,
        } = options;
        const ctx = canvas.getContext("2d");
        canvas.width = size;
        canvas.height = size;

        const modules = qr.modules;
        const moduleCount = qr.size;
        const quiet = 4; // quiet zone
        const totalModules = moduleCount + quiet * 2;
        const cellSize = size / totalModules;

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);

        // Modules
        ctx.fillStyle = fgColor;
        for (let r = 0; r < moduleCount; r++) {
            for (let c = 0; c < moduleCount; c++) {
                if (modules[r][c]) {
                    ctx.fillRect(
                        (c + quiet) * cellSize,
                        (r + quiet) * cellSize,
                        cellSize + 0.5,
                        cellSize + 0.5,
                    );
                }
            }
        }

        // Logo overlay
        if (logo) {
            const logoSize = size * 0.2;
            const logoX = (size - logoSize) / 2;
            const logoY = (size - logoSize) / 2;
            const pad = 4;

            ctx.fillStyle = bgColor;
            ctx.fillRect(
                logoX - pad,
                logoY - pad,
                logoSize + pad * 2,
                logoSize + pad * 2,
            );

            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        }
    }

    function toSVG(qr, options = {}) {
        const {
            size = 400,
            fgColor = "#000000",
            bgColor = "#ffffff",
        } = options;
        const modules = qr.modules;
        const moduleCount = qr.size;
        const quiet = 4;
        const totalModules = moduleCount + quiet * 2;
        const cellSize = size / totalModules;

        let paths = "";
        for (let r = 0; r < moduleCount; r++) {
            for (let c = 0; c < moduleCount; c++) {
                if (modules[r][c]) {
                    const x = (c + quiet) * cellSize;
                    const y = (r + quiet) * cellSize;
                    paths += `<rect x="${x}" y="${y}" width="${cellSize + 0.5}" height="${cellSize + 0.5}"/>`;
                }
            }
        }

        return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${bgColor}"/>
  <g fill="${fgColor}">${paths}</g>
</svg>`;
    }

    return { toCanvas, toSVG };
})();

/* ────────────────────────────────────────────────────────────
   MODULE: History Manager
   ──────────────────────────────────────────────────────────── */
const History = (() => {
    const KEY = "qryptix_history";
    let items = [];

    function load() {
        try {
            items = JSON.parse(localStorage.getItem(KEY)) || [];
        } catch {
            items = [];
        }
    }

    function save() {
        localStorage.setItem(KEY, JSON.stringify(items));
    }

    function add(data, type, options) {
        items.unshift({
            id:
                Date.now().toString(36) +
                Math.random().toString(36).slice(2, 6),
            data,
            type,
            options,
            timestamp: Date.now(),
        });
        if (items.length > 100) items = items.slice(0, 100);
        save();
    }

    function remove(id) {
        items = items.filter((i) => i.id !== id);
        save();
    }

    function clear() {
        items = [];
        save();
    }

    function getAll() {
        return [...items];
    }

    return { load, add, remove, clear, getAll };
})();

/* ────────────────────────────────────────────────────────────
   MODULE: Crypto Utilities (for Vault)
   Uses Web Crypto API — AES-GCM with PBKDF2 derived key
   ──────────────────────────────────────────────────────────── */
const CryptoUtils = (() => {
    async function deriveKey(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            "PBKDF2",
            false,
            ["deriveKey"],
        );
        return crypto.subtle.deriveKey(
            { name: "PBKDF2", salt, iterations: 600000, hash: "SHA-256" },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"],
        );
    }

    async function encrypt(plaintext, password) {
        const enc = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveKey(password, salt);
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv },
            key,
            enc.encode(plaintext),
        );
        // Combine salt + iv + ciphertext
        const result = new Uint8Array(
            salt.length + iv.length + encrypted.byteLength,
        );
        result.set(salt);
        result.set(iv, salt.length);
        result.set(new Uint8Array(encrypted), salt.length + iv.length);
        return btoa(String.fromCharCode(...result));
    }

    async function decrypt(ciphertext, password) {
        const data = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const encrypted = data.slice(28);
        const key = await deriveKey(password, salt);
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encrypted,
        );
        return new TextDecoder().decode(decrypted);
    }

    return { encrypt, decrypt };
})();

/* ────────────────────────────────────────────────────────────
   MODULE: Password Vault
   ──────────────────────────────────────────────────────────── */
const Vault = (() => {
    const KEY = "qryptix_vault";
    const HASH_KEY = "qryptix_vault_hash";
    let entries = [];
    let masterPw = null;
    let lockTimer = null;

    function isSetUp() {
        return !!localStorage.getItem(HASH_KEY);
    }

    async function hashPassword(pw) {
        const enc = new TextEncoder();
        const hash = await crypto.subtle.digest(
            "SHA-256",
            enc.encode("qryptix_salt_" + pw),
        );
        return btoa(String.fromCharCode(...new Uint8Array(hash)));
    }

    async function setup(password) {
        const hash = await hashPassword(password);
        localStorage.setItem(HASH_KEY, hash);
        masterPw = password;
        entries = [];
        await saveEntries();
    }

    async function unlock(password) {
        const hash = await hashPassword(password);
        const stored = localStorage.getItem(HASH_KEY);
        if (hash !== stored) throw new Error("Invalid master password");
        masterPw = password;
        await loadEntries();
        resetLockTimer();
    }

    function lock() {
        masterPw = null;
        entries = [];
        clearTimeout(lockTimer);
    }

    function isUnlocked() {
        return masterPw !== null;
    }

    async function loadEntries() {
        const encrypted = localStorage.getItem(KEY);
        if (!encrypted) {
            entries = [];
            return;
        }
        try {
            const json = await CryptoUtils.decrypt(encrypted, masterPw);
            entries = JSON.parse(json);
        } catch {
            entries = [];
        }
    }

    async function saveEntries() {
        if (!masterPw) return;
        const json = JSON.stringify(entries);
        const encrypted = await CryptoUtils.encrypt(json, masterPw);
        localStorage.setItem(KEY, encrypted);
    }

    function resetLockTimer() {
        clearTimeout(lockTimer);
        const minutes = Settings.get("autoLockMinutes") || 5;
        lockTimer = setTimeout(
            () => {
                lock();
                UI.renderVault();
                Toast.warning("Vault auto-locked due to inactivity");
            },
            minutes * 60 * 1000,
        );
    }

    async function addEntry(entry) {
        entry.id =
            Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        entry.createdAt = Date.now();
        entry.updatedAt = Date.now();
        entries.unshift(entry);
        await saveEntries();
        resetLockTimer();
    }

    async function updateEntry(id, data) {
        const idx = entries.findIndex((e) => e.id === id);
        if (idx === -1) return;
        entries[idx] = { ...entries[idx], ...data, updatedAt: Date.now() };
        await saveEntries();
        resetLockTimer();
    }

    async function deleteEntry(id) {
        entries = entries.filter((e) => e.id !== id);
        await saveEntries();
        resetLockTimer();
    }

    function getEntries(search = "") {
        if (!search) return [...entries];
        const s = search.toLowerCase();
        return entries.filter(
            (e) =>
                (e.title || "").toLowerCase().includes(s) ||
                (e.username || "").toLowerCase().includes(s) ||
                (e.category || "").toLowerCase().includes(s) ||
                (e.url || "").toLowerCase().includes(s),
        );
    }

    async function wipeAll() {
        localStorage.removeItem(KEY);
        localStorage.removeItem(HASH_KEY);
        entries = [];
        masterPw = null;
    }

    return {
        isSetUp,
        setup,
        unlock,
        lock,
        isUnlocked,
        addEntry,
        updateEntry,
        deleteEntry,
        getEntries,
        resetLockTimer,
        wipeAll,
    };
})();

/* ────────────────────────────────────────────────────────────
   MODULE: TOTP (Time-based One-Time Password)
   RFC 6238 implementation using Web Crypto API
   ──────────────────────────────────────────────────────────── */
const TOTP = (() => {
    const KEY = "qryptix_totp";
    let accounts = [];

    function load() {
        try {
            accounts = JSON.parse(localStorage.getItem(KEY)) || [];
        } catch {
            accounts = [];
        }
    }

    function save() {
        localStorage.setItem(KEY, JSON.stringify(accounts));
    }

    function addAccount(account) {
        account.id =
            Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        accounts.push(account);
        save();
    }

    function removeAccount(id) {
        accounts = accounts.filter((a) => a.id !== id);
        save();
    }

    function getAccounts() {
        return [...accounts];
    }

    // Base32 decode
    function base32Decode(input) {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        const cleaned = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
        let bits = "";
        for (const c of cleaned) {
            const val = alphabet.indexOf(c);
            if (val === -1) continue;
            bits += val.toString(2).padStart(5, "0");
        }
        const bytes = new Uint8Array(Math.floor(bits.length / 8));
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
        }
        return bytes;
    }

    async function generateCode(account) {
        const period = account.period || 30;
        const digits = account.digits || 6;
        const algorithm = account.algorithm || "SHA-1";

        const time = Math.floor(Date.now() / 1000);
        const counter = Math.floor(time / period);

        // Convert counter to 8-byte big-endian
        const counterBytes = new Uint8Array(8);
        let tmp = counter;
        for (let i = 7; i >= 0; i--) {
            counterBytes[i] = tmp & 0xff;
            tmp = Math.floor(tmp / 256);
        }

        const secretBytes = base32Decode(account.secret);

        // Map algorithm name
        const algoMap = {
            "SHA-1": "SHA-1",
            "SHA-256": "SHA-256",
            "SHA-512": "SHA-512",
        };
        const algo = algoMap[algorithm] || "SHA-1";

        const key = await crypto.subtle.importKey(
            "raw",
            secretBytes,
            { name: "HMAC", hash: algo },
            false,
            ["sign"],
        );

        const signature = await crypto.subtle.sign("HMAC", key, counterBytes);
        const hmac = new Uint8Array(signature);

        // Dynamic truncation
        const offset = hmac[hmac.length - 1] & 0x0f;
        const code =
            ((hmac[offset] & 0x7f) << 24) |
            ((hmac[offset + 1] & 0xff) << 16) |
            ((hmac[offset + 2] & 0xff) << 8) |
            (hmac[offset + 3] & 0xff);

        const otp = (code % Math.pow(10, digits))
            .toString()
            .padStart(digits, "0");
        const remaining = period - (time % period);

        return { code: otp, remaining, period };
    }

    return { load, save, addAccount, removeAccount, getAccounts, generateCode };
})();

/* ────────────────────────────────────────────────────────────
   MODULE: Password Generator
   ──────────────────────────────────────────────────────────── */
const PasswordGen = (() => {
    const WORDLIST = [
        "apple",
        "brave",
        "cloud",
        "dance",
        "eagle",
        "flame",
        "grape",
        "heart",
        "ivory",
        "jewel",
        "knack",
        "lemon",
        "maple",
        "noble",
        "ocean",
        "pearl",
        "quest",
        "river",
        "storm",
        "tiger",
        "ultra",
        "vivid",
        "whale",
        "xenon",
        "yacht",
        "zebra",
        "amber",
        "blaze",
        "coral",
        "delta",
        "ember",
        "frost",
        "glint",
        "haven",
        "irony",
        "joker",
        "karma",
        "lunar",
        "mirth",
        "nexus",
        "oasis",
        "pixel",
        "quirk",
        "reign",
        "solar",
        "torch",
        "unity",
        "vigor",
        "wrath",
        "zesty",
        "alpha",
        "brisk",
        "craft",
        "drift",
        "epoch",
        "forge",
        "gleam",
        "hover",
        "index",
        "jumbo",
        "kneel",
        "light",
        "mango",
        "nerve",
        "orbit",
        "prime",
        "quota",
        "royal",
        "shine",
        "trace",
        "urban",
        "vault",
        "wings",
        "exude",
        "yield",
        "zones",
        "acorn",
        "bench",
        "crest",
        "dew",
        "elbow",
        "fable",
        "glyph",
        "haste",
        "inked",
        "jazzy",
        "kudos",
        "lyric",
        "mural",
        "novel",
        "olive",
        "plume",
        "quiet",
        "roost",
        "swift",
        "tulip",
        "umbra",
        "verse",
        "woven",
        "extra",
    ];

    function generate(options = {}) {
        const {
            length = 16,
            uppercase = true,
            lowercase = true,
            digits = true,
            symbols = true,
            excludeAmbiguous = false,
            customChars = "",
            type = "random",
            wordCount = 4,
            wordSeparator = "-",
            wordCapitalize = true,
        } = options;

        if (type === "memorable")
            return generateMemorable(wordCount, wordSeparator, wordCapitalize);
        if (type === "pin") return generatePin(length);

        let charset = "";
        if (customChars) {
            charset = customChars;
        } else {
            if (uppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            if (lowercase) charset += "abcdefghijklmnopqrstuvwxyz";
            if (digits) charset += "0123456789";
            if (symbols) charset += "!@#$%^&*()_+-=[]{}|;:,.<>?";

            if (excludeAmbiguous) {
                charset = charset.replace(/[0OlI1|]/g, "");
            }
        }

        if (!charset) charset = "abcdefghijklmnopqrstuvwxyz";

        const array = new Uint32Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, (v) => charset[v % charset.length]).join("");
    }

    function generateMemorable(count, separator, capitalize) {
        const array = new Uint32Array(count);
        crypto.getRandomValues(array);
        return Array.from(array, (v) => {
            let word = WORDLIST[v % WORDLIST.length];
            if (capitalize) word = word[0].toUpperCase() + word.slice(1);
            return word;
        }).join(separator);
    }

    function generatePin(length) {
        const array = new Uint32Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, (v) => (v % 10).toString()).join("");
    }

    function strength(password) {
        if (!password) return { score: 0, label: "—", color: "#666" };
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (password.length >= 16) score++;
        if (password.length >= 24) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;
        // Unique chars
        const unique = new Set(password).size;
        if (unique >= 10) score++;
        if (unique >= 20) score++;

        if (score <= 2)
            return { score: 20, label: "Very Weak", color: "#ef4444" };
        if (score <= 4) return { score: 40, label: "Weak", color: "#f59e0b" };
        if (score <= 6)
            return { score: 60, label: "Moderate", color: "#eab308" };
        if (score <= 8) return { score: 80, label: "Strong", color: "#10b981" };
        return { score: 100, label: "Very Strong", color: "#059669" };
    }

    return { generate, strength };
})();

/* ────────────────────────────────────────────────────────────
   MODULE: UI Controller
   ──────────────────────────────────────────────────────────── */
const UI = (() => {
    let currentTab = "qr-generator";
    let currentDataType = "auto";
    let currentQR = null;
    let logoImage = null;
    let totpInterval = null;

    function init() {
        Settings.load();
        History.load();
        TOTP.load();

        bindNavigation();
        bindThemeToggle();
        bindMobileMenu();
        bindQRGenerator();
        bindVault();
        bindTOTP();
        bindPasswordGen();
        bindHistory();
        bindSettings();

        applySettingsToUI();
        renderHistory();
    }

    // ── Navigation ──
    function bindNavigation() {
        document.querySelectorAll(".nav-btn").forEach((btn) => {
            btn.addEventListener("click", () => switchTab(btn.dataset.tab));
        });
    }

    function switchTab(tabId) {
        currentTab = tabId;
        document
            .querySelectorAll(".nav-btn")
            .forEach((b) =>
                b.classList.toggle("active", b.dataset.tab === tabId),
            );
        document
            .querySelectorAll(".tab-content")
            .forEach((t) =>
                t.classList.toggle("active", t.id === "tab-" + tabId),
            );

        // Close mobile sidebar
        document.getElementById("sidebar").classList.remove("open");
        document.getElementById("sidebarOverlay").classList.remove("active");

        // Start/stop TOTP timer
        if (tabId === "totp") startTotpTimer();
        else stopTotpTimer();
    }

    // ── Theme ──
    function bindThemeToggle() {
        ["themeToggle", "mobileThemeToggle"].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener("click", toggleTheme);
        });
    }

    function toggleTheme() {
        const newTheme = Settings.get("theme") === "dark" ? "light" : "dark";
        Settings.set("theme", newTheme);
        document.getElementById("settingTheme").value = newTheme;
    }

    // ── Mobile Menu ──
    function bindMobileMenu() {
        const hamburger = document.getElementById("hamburger");
        const sidebar = document.getElementById("sidebar");
        const overlay = document.getElementById("sidebarOverlay");

        if (hamburger) {
            hamburger.addEventListener("click", () => {
                sidebar.classList.toggle("open");
                overlay.classList.toggle("active");
            });
        }
        if (overlay) {
            overlay.addEventListener("click", () => {
                sidebar.classList.remove("open");
                overlay.classList.remove("active");
            });
        }
    }

    // ── QR Generator ──
    function bindQRGenerator() {
        // Data type chips
        document.querySelectorAll(".chip[data-type]").forEach((chip) => {
            chip.addEventListener("click", () =>
                selectDataType(chip.dataset.type),
            );
        });

        // Generate button
        document
            .getElementById("generateBtn")
            .addEventListener("click", generateQRCode);
        document
            .getElementById("clearBtn")
            .addEventListener("click", clearQRInput);

        // Size slider
        const sizeSlider = document.getElementById("qrSize");
        const sizeVal = document.getElementById("qrSizeVal");
        sizeSlider.addEventListener("input", () => {
            sizeVal.textContent = sizeSlider.value;
        });

        // Live preview
        const dataInput = document.getElementById("qrDataInput");
        let liveTimeout;
        dataInput.addEventListener("input", () => {
            // Detect type
            const detected = DataDetector.detect(dataInput.value);
            document.getElementById("detectedType").textContent =
                detected !== "text"
                    ? `Detected: ${detected.toUpperCase()}`
                    : "";

            if (Settings.get("livePreview")) {
                clearTimeout(liveTimeout);
                liveTimeout = setTimeout(generateQRCode, 300);
            }
        });

        // Logo
        document
            .getElementById("qrLogo")
            .addEventListener("change", handleLogoUpload);
        document.getElementById("removeLogo").addEventListener("click", () => {
            logoImage = null;
            document.getElementById("qrLogo").value = "";
            document.getElementById("removeLogo").style.display = "none";
            if (currentQR) renderQR();
        });

        // Export
        document
            .getElementById("downloadPNG")
            .addEventListener("click", exportPNG);
        document
            .getElementById("downloadSVG")
            .addEventListener("click", exportSVG);
        document
            .getElementById("copyClipboard")
            .addEventListener("click", copyToClipboard);

        // Batch
        document
            .getElementById("batchGenerate")
            .addEventListener("click", batchGenerate);
    }

    function selectDataType(type) {
        currentDataType = type;
        document.querySelectorAll(".chip[data-type]").forEach((c) => {
            c.classList.toggle("active", c.dataset.type === type);
            c.setAttribute("aria-checked", c.dataset.type === type);
        });

        // Show/hide field groups
        const fieldIds = ["auto", "email", "phone", "wifi", "vcard", "event"];
        const mapping = {
            auto: "auto",
            url: "auto",
            text: "auto",
            email: "email",
            phone: "phone",
            wifi: "wifi",
            vcard: "vcard",
            event: "event",
        };
        const show = mapping[type] || "auto";
        fieldIds.forEach((id) => {
            document
                .getElementById("field-" + id)
                .classList.toggle("hidden", id !== show);
        });
    }

    function getQRData() {
        const type = currentDataType;

        if (type === "auto" || type === "url" || type === "text") {
            return document.getElementById("qrDataInput").value.trim();
        }
        if (type === "email") {
            const to = document.getElementById("emailTo").value.trim();
            const subject = document
                .getElementById("emailSubject")
                .value.trim();
            const body = document.getElementById("emailBody").value.trim();
            if (!to) {
                Toast.error("Please enter an email address");
                return null;
            }
            return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
        if (type === "phone") {
            const phone = document.getElementById("phoneNumber").value.trim();
            if (!phone) {
                Toast.error("Please enter a phone number");
                return null;
            }
            return `tel:${phone}`;
        }
        if (type === "wifi") {
            const ssid = document.getElementById("wifiSSID").value.trim();
            const pw = document.getElementById("wifiPassword").value;
            const enc = document.getElementById("wifiEncryption").value;
            const hidden = document.getElementById("wifiHidden").checked;
            if (!ssid) {
                Toast.error("Please enter an SSID");
                return null;
            }
            return `WIFI:T:${enc};S:${ssid};P:${pw};H:${hidden ? "true" : "false"};;`;
        }
        if (type === "vcard") {
            const fn = document.getElementById("vcardFirstName").value.trim();
            const ln = document.getElementById("vcardLastName").value.trim();
            const org = document.getElementById("vcardOrg").value.trim();
            const phone = document.getElementById("vcardPhone").value.trim();
            const email = document.getElementById("vcardEmail").value.trim();
            const url = document.getElementById("vcardUrl").value.trim();
            if (!fn && !ln) {
                Toast.error("Please enter a name");
                return null;
            }
            return `BEGIN:VCARD\nVERSION:3.0\nN:${ln};${fn}\nFN:${fn} ${ln}\n${org ? "ORG:" + org + "\n" : ""}${phone ? "TEL:" + phone + "\n" : ""}${email ? "EMAIL:" + email + "\n" : ""}${url ? "URL:" + url + "\n" : ""}END:VCARD`;
        }
        if (type === "event") {
            const title = document.getElementById("eventTitle").value.trim();
            const loc = document.getElementById("eventLocation").value.trim();
            const start = document.getElementById("eventStart").value;
            const end = document.getElementById("eventEnd").value;
            const desc = document.getElementById("eventDesc").value.trim();
            if (!title) {
                Toast.error("Please enter an event title");
                return null;
            }
            const fmt = (d) =>
                d ? d.replace(/[-:]/g, "").replace("T", "T") + "00" : "";
            return `BEGIN:VEVENT\nSUMMARY:${title}\n${loc ? "LOCATION:" + loc + "\n" : ""}${start ? "DTSTART:" + fmt(start) + "\n" : ""}${end ? "DTEND:" + fmt(end) + "\n" : ""}${desc ? "DESCRIPTION:" + desc + "\n" : ""}END:VEVENT`;
        }

        return "";
    }

    function generateQRCode() {
        const data = getQRData();
        if (!data) return;

        const ecl = document.getElementById("qrErrorLevel").value;
        const size = parseInt(document.getElementById("qrSize").value);
        const fgColor = document.getElementById("qrFgColor").value;
        const bgColor = document.getElementById("qrBgColor").value;

        try {
            currentQR = QR.generate(data, ecl);
            if (!currentQR) {
                Toast.error("Failed to generate QR code");
                return;
            }

            renderQR(size, fgColor, bgColor);

            // Add to history
            History.add(data, currentDataType || DataDetector.detect(data), {
                ecl,
                size,
                fgColor,
                bgColor,
            });
            renderHistory();

            Toast.success("QR code generated!");
        } catch (e) {
            Toast.error("Error generating QR code: " + e.message);
        }
    }

    function renderQR(size, fgColor, bgColor) {
        if (!currentQR) return;
        size = size || parseInt(document.getElementById("qrSize").value);
        fgColor = fgColor || document.getElementById("qrFgColor").value;
        bgColor = bgColor || document.getElementById("qrBgColor").value;

        const canvas = document.getElementById("qrCanvas");
        QRRenderer.toCanvas(canvas, currentQR, {
            size,
            fgColor,
            bgColor,
            logo: logoImage,
        });

        canvas.style.display = "block";
        document.getElementById("qrPlaceholder").style.display = "none";
        document.getElementById("exportActions").style.display = "flex";
    }

    function clearQRInput() {
        document.getElementById("qrDataInput").value = "";
        document.getElementById("detectedType").textContent = "";
        document.getElementById("qrCanvas").style.display = "none";
        document.getElementById("qrPlaceholder").style.display = "flex";
        document.getElementById("exportActions").style.display = "none";
        currentQR = null;
    }

    function handleLogoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const img = new Image();
        img.onload = () => {
            logoImage = img;
            document.getElementById("removeLogo").style.display = "inline-flex";
            if (currentQR) renderQR();
            Toast.info("Logo added");
        };
        img.src = URL.createObjectURL(file);
    }

    function exportPNG() {
        const canvas = document.getElementById("qrCanvas");
        const link = document.createElement("a");
        link.download = "qryptix-qr.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
        Toast.success("PNG downloaded");
    }

    function exportSVG() {
        if (!currentQR) return;
        const fgColor = document.getElementById("qrFgColor").value;
        const bgColor = document.getElementById("qrBgColor").value;
        const size = parseInt(document.getElementById("qrSize").value);
        const svg = QRRenderer.toSVG(currentQR, { size, fgColor, bgColor });
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = "qryptix-qr.svg";
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        Toast.success("SVG downloaded");
    }

    async function copyToClipboard() {
        const canvas = document.getElementById("qrCanvas");
        try {
            const blob = await new Promise((resolve) =>
                canvas.toBlob(resolve, "image/png"),
            );
            await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
            ]);
            Toast.success("Copied to clipboard");
        } catch {
            Toast.error("Failed to copy. Try downloading instead.");
        }
    }

    function batchGenerate() {
        const input = document.getElementById("batchInput").value.trim();
        if (!input) {
            Toast.error("Enter data, one per line");
            return;
        }
        const lines = input.split("\n").filter((l) => l.trim());
        const container = document.getElementById("batchResults");
        container.innerHTML = "";

        const ecl = document.getElementById("qrErrorLevel").value;
        const fgColor = document.getElementById("qrFgColor").value;
        const bgColor = document.getElementById("qrBgColor").value;

        lines.forEach((line) => {
            const data = line.trim();
            const qr = QR.generate(data, ecl);
            if (!qr) return;

            const item = document.createElement("div");
            item.className = "batch-item";
            const canvas = document.createElement("canvas");
            QRRenderer.toCanvas(canvas, qr, { size: 200, fgColor, bgColor });
            const label = document.createElement("div");
            label.className = "batch-label";
            label.textContent =
                data.length > 40 ? data.slice(0, 40) + "…" : data;

            const dlBtn = document.createElement("button");
            dlBtn.className = "btn btn-sm btn-ghost";
            dlBtn.textContent = "Download";
            dlBtn.addEventListener("click", () => {
                const link = document.createElement("a");
                link.download = `qr-${data.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_")}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
            });

            item.appendChild(canvas);
            item.appendChild(label);
            item.appendChild(dlBtn);
            container.appendChild(item);
        });

        Toast.success(`Generated ${lines.length} QR codes`);
    }

    // ── Vault UI ──
    function bindVault() {
        const unlockBtn = document.getElementById("unlockVaultBtn");
        const lockBtn = document.getElementById("lockVaultBtn");
        const addBtn = document.getElementById("addEntryBtn");
        const closeModal = document.getElementById("closeEntryModal");
        const cancelModal = document.getElementById("cancelEntryModal");
        const saveBtn = document.getElementById("saveEntryBtn");
        const searchInput = document.getElementById("vaultSearch");
        const togglePw = document.getElementById("toggleEntryPw");
        const genPw = document.getElementById("genEntryPw");

        unlockBtn.addEventListener("click", handleVaultUnlock);
        document
            .getElementById("masterPassword")
            .addEventListener("keydown", (e) => {
                if (e.key === "Enter") handleVaultUnlock();
            });
        lockBtn.addEventListener("click", () => {
            Vault.lock();
            renderVault();
        });
        addBtn.addEventListener("click", () => openEntryModal());
        closeModal.addEventListener("click", closeEntryModal);
        cancelModal.addEventListener("click", closeEntryModal);
        saveBtn.addEventListener("click", saveVaultEntry);
        searchInput.addEventListener("input", () =>
            renderVaultEntries(searchInput.value),
        );

        togglePw.addEventListener("click", () => {
            const pw = document.getElementById("entryPassword");
            pw.type = pw.type === "password" ? "text" : "password";
        });

        genPw.addEventListener("click", () => {
            const pw = PasswordGen.generate({ length: 20, symbols: true });
            document.getElementById("entryPassword").value = pw;
            document.getElementById("entryPassword").type = "text";
        });

        // Color dots
        document.querySelectorAll(".color-dot").forEach((dot) => {
            dot.addEventListener("click", () => {
                document
                    .querySelectorAll(".color-dot")
                    .forEach((d) => d.classList.remove("active"));
                dot.classList.add("active");
            });
        });

        renderVault();
    }

    async function handleVaultUnlock() {
        const pwInput = document.getElementById("masterPassword");
        const pwConfirm = document.getElementById("masterPasswordConfirm");
        const pw = pwInput.value;

        if (!pw) {
            Toast.error("Enter a master password");
            return;
        }

        if (!Vault.isSetUp()) {
            // First time setup
            if (pwConfirm.classList.contains("hidden")) {
                pwConfirm.classList.remove("hidden");
                document.getElementById("vaultLockTitle").textContent =
                    "Create Master Password";
                document.getElementById("vaultLockSubtitle").textContent =
                    "Confirm your master password";
                document.getElementById("unlockVaultBtn").textContent =
                    "Create Vault";
                pwConfirm.focus();
                return;
            }
            if (pw !== pwConfirm.value) {
                Toast.error("Passwords do not match");
                return;
            }
            if (pw.length < 8) {
                Toast.error("Password must be at least 8 characters");
                return;
            }
            await Vault.setup(pw);
            Toast.success("Vault created!");
        } else {
            try {
                await Vault.unlock(pw);
                Toast.success("Vault unlocked");
            } catch {
                Toast.error("Invalid master password");
                return;
            }
        }

        pwInput.value = "";
        pwConfirm.value = "";
        pwConfirm.classList.add("hidden");
        renderVault();
    }

    function renderVault() {
        const lockScreen = document.getElementById("vaultLock");
        const content = document.getElementById("vaultContent");

        if (Vault.isUnlocked()) {
            lockScreen.classList.add("hidden");
            content.classList.remove("hidden");
            renderVaultEntries();
        } else {
            lockScreen.classList.remove("hidden");
            content.classList.add("hidden");
            // Reset lock screen state
            document.getElementById("vaultLockTitle").textContent =
                Vault.isSetUp() ? "Unlock Vault" : "Create Vault";
            document.getElementById("vaultLockSubtitle").textContent =
                Vault.isSetUp()
                    ? "Enter your master password"
                    : "Set a master password to encrypt your vault";
            document.getElementById("unlockVaultBtn").textContent =
                Vault.isSetUp() ? "Unlock" : "Continue";
            document
                .getElementById("masterPasswordConfirm")
                .classList.add("hidden");
        }
    }

    function renderVaultEntries(search = "") {
        const container = document.getElementById("vaultEntries");
        const entries = Vault.getEntries(search);
        const emptyState = document.getElementById("vaultEmpty");

        // Remove existing entries (keep empty state)
        container.querySelectorAll(".vault-entry").forEach((e) => e.remove());

        if (entries.length === 0) {
            emptyState.style.display = "flex";
            return;
        }

        emptyState.style.display = "none";

        entries.forEach((entry) => {
            const el = document.createElement("div");
            el.className = "vault-entry";
            el.innerHTML = `
                <div class="entry-color" style="background:${escapeAttr(entry.color || "#6366f1")}"></div>
                <div class="entry-info">
                    <div class="entry-title">${escapeHtml(entry.title || "Untitled")}</div>
                    <div class="entry-username">${escapeHtml(entry.username || "")}</div>
                </div>
                <span class="entry-category-badge">${escapeHtml(entry.category || "general")}</span>
                <div class="entry-actions">
                    <button class="btn btn-icon copy-pw-btn" aria-label="Copy password" title="Copy password">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button class="btn btn-icon edit-entry-btn" aria-label="Edit" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn btn-icon delete-entry-btn" aria-label="Delete" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            `;

            el.querySelector(".copy-pw-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                if (entry.password) {
                    navigator.clipboard
                        .writeText(entry.password)
                        .then(() => Toast.success("Password copied"));
                }
            });

            el.querySelector(".edit-entry-btn").addEventListener(
                "click",
                (e) => {
                    e.stopPropagation();
                    openEntryModal(entry);
                },
            );

            el.querySelector(".delete-entry-btn").addEventListener(
                "click",
                async (e) => {
                    e.stopPropagation();
                    if (confirm("Delete this entry?")) {
                        await Vault.deleteEntry(entry.id);
                        renderVaultEntries(search);
                        Toast.success("Entry deleted");
                    }
                },
            );

            container.appendChild(el);
        });
    }

    function openEntryModal(entry = null) {
        const modal = document.getElementById("entryModal");
        modal.classList.remove("hidden");

        document.getElementById("entryModalTitle").textContent = entry
            ? "Edit Entry"
            : "Add Entry";
        document.getElementById("entryTitle").value = entry?.title || "";
        document.getElementById("entryUsername").value = entry?.username || "";
        document.getElementById("entryPassword").value = entry?.password || "";
        document.getElementById("entryPassword").type = "password";
        document.getElementById("entryUrl").value = entry?.url || "";
        document.getElementById("entryCategory").value =
            entry?.category || "general";
        document.getElementById("entryNotes").value = entry?.notes || "";
        document.getElementById("entryId").value = entry?.id || "";

        // Color
        const color = entry?.color || "#6366f1";
        document.querySelectorAll(".color-dot").forEach((d) => {
            d.classList.toggle("active", d.dataset.color === color);
        });
    }

    function closeEntryModal() {
        document.getElementById("entryModal").classList.add("hidden");
    }

    async function saveVaultEntry() {
        const title = document.getElementById("entryTitle").value.trim();
        const username = document.getElementById("entryUsername").value.trim();
        const password = document.getElementById("entryPassword").value;
        const url = document.getElementById("entryUrl").value.trim();
        const category = document.getElementById("entryCategory").value;
        const notes = document.getElementById("entryNotes").value.trim();
        const id = document.getElementById("entryId").value;
        const activeColor = document.querySelector(".color-dot.active");
        const color = activeColor ? activeColor.dataset.color : "#6366f1";

        if (!title) {
            Toast.error("Please enter a title");
            return;
        }

        const data = { title, username, password, url, category, notes, color };

        if (id) {
            await Vault.updateEntry(id, data);
            Toast.success("Entry updated");
        } else {
            await Vault.addEntry(data);
            Toast.success("Entry added");
        }

        closeEntryModal();
        renderVaultEntries();
    }

    // ── TOTP UI ──
    function bindTOTP() {
        document.getElementById("addTotpBtn").addEventListener("click", () => {
            document.getElementById("totpModal").classList.remove("hidden");
        });
        document
            .getElementById("closeTotpModal")
            .addEventListener("click", () => {
                document.getElementById("totpModal").classList.add("hidden");
            });
        document
            .getElementById("cancelTotpModal")
            .addEventListener("click", () => {
                document.getElementById("totpModal").classList.add("hidden");
            });
        document
            .getElementById("saveTotpBtn")
            .addEventListener("click", saveTotpAccount);

        renderTotpList();
    }

    function saveTotpAccount() {
        const name = document.getElementById("totpName").value.trim();
        const issuer = document.getElementById("totpIssuer").value.trim();
        const secret = document
            .getElementById("totpSecret")
            .value.trim()
            .replace(/\s/g, "");
        const algorithm = document.getElementById("totpAlgorithm").value;
        const digits = parseInt(document.getElementById("totpDigits").value);
        const period = parseInt(document.getElementById("totpPeriod").value);

        if (!name) {
            Toast.error("Enter an account name");
            return;
        }
        if (!secret) {
            Toast.error("Enter a secret key");
            return;
        }
        if (!/^[A-Z2-7=]+$/i.test(secret)) {
            Toast.error("Invalid Base32 secret key");
            return;
        }

        TOTP.addAccount({ name, issuer, secret, algorithm, digits, period });

        // Clear form
        document.getElementById("totpName").value = "";
        document.getElementById("totpIssuer").value = "";
        document.getElementById("totpSecret").value = "";
        document.getElementById("totpModal").classList.add("hidden");

        renderTotpList();
        Toast.success("TOTP account added");
    }

    async function renderTotpList() {
        const container = document.getElementById("totpList");
        const accounts = TOTP.getAccounts();
        const emptyState = document.getElementById("totpEmpty");

        container.querySelectorAll(".totp-card").forEach((c) => c.remove());

        if (accounts.length === 0) {
            emptyState.style.display = "flex";
            return;
        }
        emptyState.style.display = "none";

        for (const account of accounts) {
            try {
                const { code, remaining, period } =
                    await TOTP.generateCode(account);
                const pct = (remaining / period) * 100;
                const circumference = 2 * Math.PI * 14;
                const offset = circumference * (1 - remaining / period);

                const card = document.createElement("div");
                card.className = "totp-card";
                card.dataset.id = account.id;
                card.innerHTML = `
                    <div class="totp-info">
                        <div class="totp-issuer">${escapeHtml(account.issuer || "")}</div>
                        <div class="totp-name">${escapeHtml(account.name)}</div>
                    </div>
                    <div class="totp-code-group">
                        <span class="totp-code" data-account-id="${escapeAttr(account.id)}">${escapeHtml(code)}</span>
                        <div class="totp-timer">
                            <svg width="36" height="36" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border)" stroke-width="3"/>
                                <circle class="totp-timer-circle" cx="18" cy="18" r="14" fill="none" stroke="var(--accent)" stroke-width="3"
                                    stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"/>
                            </svg>
                        </div>
                    </div>
                    <div class="totp-actions">
                        <button class="btn btn-icon copy-totp-btn" aria-label="Copy code" title="Copy code">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                        <button class="btn btn-icon delete-totp-btn" aria-label="Delete" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                `;

                card.querySelector(".copy-totp-btn").addEventListener(
                    "click",
                    () => {
                        navigator.clipboard
                            .writeText(code)
                            .then(() => Toast.success("Code copied"));
                    },
                );

                card.querySelector(".delete-totp-btn").addEventListener(
                    "click",
                    () => {
                        if (confirm("Remove this TOTP account?")) {
                            TOTP.removeAccount(account.id);
                            renderTotpList();
                            Toast.success("Account removed");
                        }
                    },
                );

                container.appendChild(card);
            } catch (e) {
                // Skip invalid accounts
                console.warn("TOTP error for", account.name, e);
            }
        }
    }

    function startTotpTimer() {
        stopTotpTimer();
        totpInterval = setInterval(updateTotpCodes, 1000);
    }

    function stopTotpTimer() {
        if (totpInterval) {
            clearInterval(totpInterval);
            totpInterval = null;
        }
    }

    async function updateTotpCodes() {
        const accounts = TOTP.getAccounts();
        for (const account of accounts) {
            try {
                const { code, remaining, period } =
                    await TOTP.generateCode(account);
                const codeEl = document.querySelector(
                    `[data-account-id="${CSS.escape(account.id)}"]`,
                );
                if (codeEl) codeEl.textContent = code;

                const card = document.querySelector(
                    `.totp-card[data-id="${CSS.escape(account.id)}"]`,
                );
                if (card) {
                    const circle = card.querySelector(".totp-timer-circle");
                    if (circle) {
                        const circumference = 2 * Math.PI * 14;
                        circle.setAttribute(
                            "stroke-dashoffset",
                            circumference * (1 - remaining / period),
                        );
                    }
                }
            } catch {
                /* skip */
            }
        }
    }

    // ── Password Generator UI ──
    function bindPasswordGen() {
        const genBtn = document.getElementById("generatePasswordBtn");
        const copyBtn = document.getElementById("copyGenPassword");
        const regenBtn = document.getElementById("regeneratePassword");
        const lengthSlider = document.getElementById("pwLength");
        const lengthVal = document.getElementById("pwLengthVal");
        const typeSelect = document.getElementById("pwType");
        const customCheck = document.getElementById("pwCustom");
        const customChars = document.getElementById("pwCustomChars");
        const wordCountSlider = document.getElementById("pwWordCount");
        const wordCountVal = document.getElementById("pwWordCountVal");

        genBtn.addEventListener("click", generatePassword);
        regenBtn.addEventListener("click", generatePassword);
        copyBtn.addEventListener("click", () => {
            const pw = document.getElementById("generatedPassword").textContent;
            if (pw && pw !== 'Click "Generate" to create a password') {
                navigator.clipboard
                    .writeText(pw)
                    .then(() => Toast.success("Password copied"));
            }
        });

        lengthSlider.addEventListener("input", () => {
            lengthVal.textContent = lengthSlider.value;
        });
        wordCountSlider.addEventListener("input", () => {
            wordCountVal.textContent = wordCountSlider.value;
        });

        typeSelect.addEventListener("change", () => {
            document
                .getElementById("memorableOptions")
                .classList.toggle("hidden", typeSelect.value !== "memorable");
        });

        customCheck.addEventListener("change", () => {
            customChars.classList.toggle("hidden", !customCheck.checked);
        });
    }

    function generatePassword() {
        const options = {
            length: parseInt(document.getElementById("pwLength").value),
            uppercase: document.getElementById("pwUppercase").checked,
            lowercase: document.getElementById("pwLowercase").checked,
            digits: document.getElementById("pwDigits").checked,
            symbols: document.getElementById("pwSymbols").checked,
            excludeAmbiguous: document.getElementById("pwAmbiguous").checked,
            customChars: document.getElementById("pwCustom").checked
                ? document.getElementById("pwCustomChars").value
                : "",
            type: document.getElementById("pwType").value,
            wordCount: parseInt(document.getElementById("pwWordCount").value),
            wordSeparator: document.getElementById("pwWordSeparator").value,
            wordCapitalize: document.getElementById("pwWordCapitalize").checked,
        };

        const pw = PasswordGen.generate(options);
        document.getElementById("generatedPassword").textContent = pw;

        const s = PasswordGen.strength(pw);
        document.getElementById("strengthFill").style.width = s.score + "%";
        document.getElementById("strengthFill").style.background = s.color;
        document.getElementById("strengthLabel").textContent = s.label;
        document.getElementById("strengthLabel").style.color = s.color;
    }

    // ── History UI ──
    function bindHistory() {
        document
            .getElementById("clearHistory")
            .addEventListener("click", () => {
                if (confirm("Clear all QR code history?")) {
                    History.clear();
                    renderHistory();
                    Toast.success("History cleared");
                }
            });
    }

    function renderHistory() {
        const container = document.getElementById("historyGrid");
        const items = History.getAll();
        const emptyState = document.getElementById("historyEmpty");

        container.querySelectorAll(".history-card").forEach((c) => c.remove());

        if (items.length === 0) {
            emptyState.style.display = "flex";
            return;
        }
        emptyState.style.display = "none";

        items.forEach((item) => {
            const qr = QR.generate(item.data, item.options?.ecl || "M");
            if (!qr) return;

            const card = document.createElement("div");
            card.className = "history-card";

            const canvas = document.createElement("canvas");
            QRRenderer.toCanvas(canvas, qr, {
                size: 160,
                fgColor: item.options?.fgColor || "#000",
                bgColor: item.options?.bgColor || "#fff",
            });

            const dataDiv = document.createElement("div");
            dataDiv.className = "history-card-data";
            dataDiv.textContent = item.data;

            const dateDiv = document.createElement("div");
            dateDiv.className = "history-card-date";
            dateDiv.textContent = new Date(item.timestamp).toLocaleString();

            const actions = document.createElement("div");
            actions.className = "history-card-actions";

            const dlBtn = document.createElement("button");
            dlBtn.className = "btn btn-sm btn-ghost";
            dlBtn.textContent = "PNG";
            dlBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const link = document.createElement("a");
                link.download = "qr.png";
                link.href = canvas.toDataURL("image/png");
                link.click();
            });

            const delBtn = document.createElement("button");
            delBtn.className = "btn btn-sm btn-ghost";
            delBtn.textContent = "Delete";
            delBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                History.remove(item.id);
                renderHistory();
            });

            actions.appendChild(dlBtn);
            actions.appendChild(delBtn);
            card.appendChild(canvas);
            card.appendChild(dataDiv);
            card.appendChild(dateDiv);
            card.appendChild(actions);
            container.appendChild(card);
        });
    }

    // ── Settings UI ──
    function bindSettings() {
        document
            .getElementById("settingTheme")
            .addEventListener("change", (e) => {
                Settings.set("theme", e.target.value);
            });

        document
            .getElementById("settingAccent")
            .addEventListener("change", (e) => {
                Settings.set("accent", e.target.value);
            });

        document
            .getElementById("settingDefaultEC")
            .addEventListener("change", (e) => {
                Settings.set("defaultEC", e.target.value);
                document.getElementById("qrErrorLevel").value = e.target.value;
            });

        document
            .getElementById("settingDefaultSize")
            .addEventListener("change", (e) => {
                const val = parseInt(e.target.value);
                Settings.set("defaultSize", val);
                document.getElementById("qrSize").value = val;
                document.getElementById("qrSizeVal").textContent = val;
            });

        document
            .getElementById("settingLivePreview")
            .addEventListener("change", (e) => {
                Settings.set("livePreview", e.target.checked);
            });

        document
            .getElementById("settingAutoLock")
            .addEventListener("change", (e) => {
                Settings.set("autoLockMinutes", parseInt(e.target.value));
            });

        document
            .getElementById("resetSettings")
            .addEventListener("click", () => {
                if (confirm("Reset all settings to defaults?")) {
                    Settings.reset();
                    applySettingsToUI();
                    Toast.success("Settings reset");
                }
            });

        document
            .getElementById("wipeAll")
            .addEventListener("click", async () => {
                if (
                    confirm(
                        "This will delete ALL data including vault, history, TOTP accounts and settings. Continue?",
                    )
                ) {
                    await Vault.wipeAll();
                    History.clear();
                    localStorage.removeItem("qryptix_totp");
                    Settings.reset();
                    applySettingsToUI();
                    renderVault();
                    renderHistory();
                    TOTP.load();
                    renderTotpList();
                    Toast.success("All data wiped");
                }
            });

        document
            .getElementById("exportData")
            .addEventListener("click", exportAllData);
        document
            .getElementById("importData")
            .addEventListener("change", importAllData);
    }

    function applySettingsToUI() {
        document.getElementById("settingTheme").value = Settings.get("theme");
        document.getElementById("settingAccent").value = Settings.get("accent");
        document.getElementById("settingDefaultEC").value =
            Settings.get("defaultEC");
        document.getElementById("settingDefaultSize").value =
            Settings.get("defaultSize");
        document.getElementById("settingLivePreview").checked =
            Settings.get("livePreview");
        document.getElementById("settingAutoLock").value =
            Settings.get("autoLockMinutes");

        // Apply to QR generator
        document.getElementById("qrErrorLevel").value =
            Settings.get("defaultEC");
        document.getElementById("qrSize").value = Settings.get("defaultSize");
        document.getElementById("qrSizeVal").textContent =
            Settings.get("defaultSize");
    }

    function exportAllData() {
        const data = {
            settings: Settings.getAll(),
            history: History.getAll(),
            totp: TOTP.getAccounts(),
            vault_encrypted: localStorage.getItem("qryptix_vault"),
            vault_hash: localStorage.getItem("qryptix_vault_hash"),
            exported_at: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `qryptix-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        Toast.success("Data exported");
    }

    function importAllData(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.settings) {
                    localStorage.setItem(
                        "qryptix_settings",
                        JSON.stringify(data.settings),
                    );
                    Settings.load();
                }
                if (data.history) {
                    localStorage.setItem(
                        "qryptix_history",
                        JSON.stringify(data.history),
                    );
                    History.load();
                }
                if (data.totp) {
                    localStorage.setItem(
                        "qryptix_totp",
                        JSON.stringify(data.totp),
                    );
                    TOTP.load();
                }
                if (data.vault_encrypted) {
                    localStorage.setItem("qryptix_vault", data.vault_encrypted);
                }
                if (data.vault_hash) {
                    localStorage.setItem("qryptix_vault_hash", data.vault_hash);
                }
                applySettingsToUI();
                renderHistory();
                renderVault();
                renderTotpList();
                Toast.success("Data imported successfully");
            } catch {
                Toast.error("Invalid backup file");
            }
        };
        reader.readAsText(file);
        e.target.value = "";
    }

    // ── Helpers ──
    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    return { init, renderVault, renderHistory };
})();

/* ────────────────────────────────────────────────────────────
   Init on DOM ready
   ──────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => UI.init());
