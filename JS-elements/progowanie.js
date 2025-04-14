// thresholding.js

// Pomocnicza funkcja do konwersji obrazu RGB na odcienie szarości
function toGrayscale(image) {
    const height = image.R.length;
    const width = image.R[0].length;
    const gray = Array.from({ length: height }, () => new Array(width));

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            gray[i][j] = Math.round(0.299 * image.R[i][j] + 0.587 * image.G[i][j] + 0.114 * image.B[i][j]);
        }
    }
    return gray;
}

// 1. Progowanie z progiem globalnym ustalanym ręcznie
export function thresholdManual(image, threshold) {
    const gray = toGrayscale(image);
    const bin = gray.map(row => row.map(value => value >= threshold ? 255 : 0));
    return bin;
}

// 2. Progowanie z progiem globalnym (minimum między dwoma maksimami)
export function thresholdMinBetweenMaxima(image) {
    const gray = toGrayscale(image);
    const histogram = new Array(256).fill(0);

    for (let row of gray) for (let val of row) histogram[val]++;

    let peaks = [];
    for (let i = 1; i < 255; i++) {
        if (histogram[i] > histogram[i - 1] && histogram[i] > histogram[i + 1]) {
            peaks.push(i);
        }
    }

    if (peaks.length < 2) return thresholdManual(image, 128);
    const t = Math.floor((peaks[0] + peaks[1]) / 2);
    return thresholdManual(image, t);
}

// 3. Progowanie metodą Otsu
export function thresholdOtsu(image) {
    const gray = toGrayscale(image);
    const histogram = new Array(256).fill(0);
    for (let row of gray) for (let val of row) histogram[val]++;

    const total = gray.length * gray[0].length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];

    let sumB = 0, wB = 0, wF = 0, varMax = 0, threshold = 0;
    for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;

        wF = total - wB;
        if (wF === 0) break;

        sumB += t * histogram[t];
        let mB = sumB / wB;
        let mF = (sum - sumB) / wF;
        let between = wB * wF * Math.pow(mB - mF, 2);

        if (between > varMax) {
            varMax = between;
            threshold = t;
        }
    }
    return thresholdManual(image, threshold);
}

// 4. Progowanie globalne dwuprogowe
export function thresholdDouble(image, tLow, tHigh) {
    const gray = toGrayscale(image);
    return gray.map(row => row.map(value => (value >= tLow && value <= tHigh) ? 255 : 0));
}

// 5. Progowanie globalne dwuprogowe z histerezą
export function thresholdDoubleHysteresis(image, tLow, tHigh) {
    const gray = toGrayscale(image);
    const height = gray.length;
    const width = gray[0].length;
    const result = Array.from({ length: height }, () => new Array(width).fill(0));

    const strong = 255, weak = 128;

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const val = gray[i][j];
            if (val >= tHigh) result[i][j] = strong;
            else if (val >= tLow) result[i][j] = weak;
        }
    }

    // Propagacja pikseli słabych sąsiadujących ze silnymi
    const isStrongNeighbor = (i, j) => {
        for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
                const ni = i + di, nj = j + dj;
                if (ni >= 0 && ni < height && nj >= 0 && nj < width) {
                    if (result[ni][nj] === strong) return true;
                }
            }
        }
        return false;
    };

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            if (result[i][j] === weak && isStrongNeighbor(i, j)) {
                result[i][j] = strong;
            } else if (result[i][j] === weak) {
                result[i][j] = 0;
            }
        }
    }

    return result;
}

// 6. Niblack
export function thresholdNiblack(image, windowSize = 15, k = -0.2) {
    const gray = toGrayscale(image);
    const height = gray.length;
    const width = gray[0].length;
    const half = Math.floor(windowSize / 2);

    const result = Array.from({ length: height }, () => new Array(width).fill(0));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0, sumSq = 0, count = 0;
            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        const val = gray[ny][nx];
                        sum += val;
                        sumSq += val * val;
                        count++;
                    }
                }
            }
            const mean = sum / count;
            const std = Math.sqrt((sumSq - sum * mean) / count);
            const threshold = mean + k * std;
            result[y][x] = gray[y][x] > threshold ? 255 : 0;
        }
    }
    return result;
}

// 7. Sauvola
export function thresholdSauvola(image, windowSize = 15, k = 0.5, R = 128) {
    const gray = toGrayscale(image);
    const height = gray.length;
    const width = gray[0].length;
    const half = Math.floor(windowSize / 2);

    const result = Array.from({ length: height }, () => new Array(width).fill(0));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0, sumSq = 0, count = 0;
            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        const val = gray[ny][nx];
                        sum += val;
                        sumSq += val * val;
                        count++;
                    }
                }
            }
            const mean = sum / count;
            const std = Math.sqrt((sumSq - sum * mean) / count);
            const threshold = mean * (1 + k * (std / R - 1));
            result[y][x] = gray[y][x] > threshold ? 255 : 0;
        }
    }
    return result;
}

// 8. Wolf-Jolion
export function thresholdWolfJolion(image, windowSize = 15, k = 0.5) {
    const gray = toGrayscale(image);
    const height = gray.length;
    const width = gray[0].length;
    const half = Math.floor(windowSize / 2);

    let minGray = 255;
    for (let row of gray) {
        for (let val of row) {
            if (val < minGray) minGray = val;
        }
    }

    const result = Array.from({ length: height }, () => new Array(width).fill(0));

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0, sumSq = 0, count = 0;
            for (let dy = -half; dy <= half; dy++) {
                for (let dx = -half; dx <= half; dx++) {
                    const ny = y + dy, nx = x + dx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        const val = gray[ny][nx];
                        sum += val;
                        sumSq += val * val;
                        count++;
                    }
                }
            }
            const mean = sum / count;
            const std = Math.sqrt((sumSq - sum * mean) / count);
            const threshold = (1 - k) * mean + k * minGray + k * (std / 128 - 1);
            result[y][x] = gray[y][x] > threshold ? 255 : 0;
        }
    }
    return result;
}