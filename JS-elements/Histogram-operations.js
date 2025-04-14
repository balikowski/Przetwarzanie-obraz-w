// operacja clampowania wartości macierzy do wskazanego zakresu

function clampVal(val, low, high) {
    if (val < low) return low;
    if (val > high) return high;
    return val;
  }

export function clampImage(imageData, low, high) {
    // Przycina wartości R, G, B do [low, high].
    const { width, height, R, G, B } = imageData;
  
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        R[r][c] = clampVal(R[r][c], low, high);
        G[r][c] = clampVal(G[r][c], low, high);
        B[r][c] = clampVal(B[r][c], low, high);
      }
    }
  }
  

// operacja normalizowania wartości macierzy i skalowania do wybranego zakresu

export function normalizeImage(imageData, newMin = 0, newMax = 255) {
    const { width, height, R, G, B } = imageData;
    
    // Kanałowa funkcja do normalizacji
    function normalizeChannel(channel) {
      let oldMin = 255, oldMax = 0;
      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          const val = channel[r][c];
          if (val < oldMin) oldMin = val;
          if (val > oldMax) oldMax = val;
        }
      }
      if (oldMin === oldMax) return; // brak rozciągania, obraz jednorodny
  
      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          const val = channel[r][c];
          let valNew = (val - oldMin) * (newMax - newMin) / (oldMax - oldMin) + newMin;
          valNew = Math.round(valNew);
          if (valNew < 0) valNew = 0;
          if (valNew > 255) valNew = 255;
          channel[r][c] = valNew;
        }
      }
    }
  
    normalizeChannel(R);
    normalizeChannel(G);
    normalizeChannel(B);
  }
  
// operacja rozjaśniania/przyciemniania obrazu poprzez sumowanie z wartością

export function addConstant(imageData, constant) {
    const { width, height, R, G, B } = imageData;
  
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        // Kanał R
        let rv = R[r][c] + constant;
        if (rv < 0) rv = 0;
        if (rv > 255) rv = 255;
        R[r][c] = rv;
  
        // Kanał G
        let gv = G[r][c] + constant;
        if (gv < 0) gv = 0;
        if (gv > 255) gv = 255;
        G[r][c] = gv;
  
        // Kanał B
        let bv = B[r][c] + constant;
        if (bv < 0) bv = 0;
        if (bv > 255) bv = 255;
        B[r][c] = bv;
      }
    }
  }
  
// operacja rozjaśniania obrazu skalowanie histogramu w przedziale [0, 255-B] lub [B, 255] 
function clampByte(val) {
    val = Math.round(val);
    if (val < 0) return 0;
    if (val > 255) return 255;
    return val;
  }

export function brightenWithRange(imageData, B, mode='upper') {
    const { width, height, R, G, B: Bl } = imageData;
    
    let a, b;
    if (mode === 'upper') {
      a = (255 - B) / 255;
      b = B;
    } else {
      a = (255 - B) / 255;
      b = 0;
    }
  
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        R[r][c] = clampByte(a * R[r][c] + b);
        G[r][c] = clampByte(a * G[r][c] + b);
        Bl[r][c] = clampByte(a * Bl[r][c] + b);
      }
    }
  }
  
  


// operacja poprawy kontrastu obrazu
export function adjustContrast(imageData, alpha) {
    const { width, height, R, G, B } = imageData;
    
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        R[r][c] = clampByte(alpha * (R[r][c] - 128) + 128);
        G[r][c] = clampByte(alpha * (G[r][c] - 128) + 128);
        B[r][c] = clampByte(alpha * (B[r][c] - 128) + 128);
      }
    }
  }
  
  
  
// operacja rozciągania histogramu do wskazanego przedziału
export function stretchHistogram(imageData, low, high) {
    normalizeImage(imageData, low, high);
  }
  