import {createHistogram, printHistogram} from './JS-elements/histogram.js'
import {clampImage, normalizeImage, addConstant, brightenWithRange, adjustContrast, stretchHistogram} from './JS-elements/Histogram-operations.js'
import {thresholdManual, thresholdMinBetweenMaxima, thresholdOtsu, thresholdDouble, thresholdDoubleHysteresis, thresholdNiblack, thresholdSauvola, thresholdWolfJolion} from './JS-elements/progowanie.js'
// DOM elements
const uploadImgButton = document.getElementById('file-upload');
const testButton = document.getElementById('test');
const downloadImgButton = document.getElementById("download-img");
const histRButton = document.getElementById("hist-R");
const histGButton = document.getElementById("hist-G");
const histBButton = document.getElementById("hist-B");
const showImgButton = document.getElementById("show-img");
const myChart = document.getElementById("myChart");
const clampingButton = document.getElementById("clamping-btn");


// main Obj having img prop
let image = {
    R: [],
    G: [],
    B: [],
    height: 0,
    width: 0
}

let histogram = undefined;



//  handleBMPUpload
uploadImgButton.addEventListener('change', handleBMPUpload);

function handleBMPUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        const data = new DataView(arrayBuffer);

        // BMP header parsing
        const fileType = String.fromCharCode(data.getUint8(0)) + String.fromCharCode(data.getUint8(1));
        if (fileType !== 'BM') {
            console.error('Not a BMP file');
            return;
        }

        const dataOffset = data.getUint32(10, true);
        const width = data.getInt32(18, true);
        const height = data.getInt32(22, true);
        image.width = width;
        image.height = height;
        
        const bitsPerPixel = data.getUint16(28, true);

        if (bitsPerPixel !== 24) {
            console.error('Only 24-bit BMP files are supported');
            return;
        }

        // BMP rows are padded to 4-byte boundaries
        const rowSize = Math.floor((bitsPerPixel * width + 31) / 32) * 4;

        const R = Array.from({ length: height }, () => new Array(width));
        const G = Array.from({ length: height }, () => new Array(width));
        const B = Array.from({ length: height }, () => new Array(width));

        for (let y = 0; y < height; y++) {
            const row = height - 1 - y; // BMP stores pixels bottom-up
            for (let x = 0; x < width; x++) {
                const pixelOffset = dataOffset + y * rowSize + x * 3;
                const b = data.getUint8(pixelOffset);
                const g = data.getUint8(pixelOffset + 1);
                const r = data.getUint8(pixelOffset + 2);

                R[row][x] = r;
                G[row][x] = g;
                B[row][x] = b;
            }
        }

        image.R = structuredClone(R);
        image.G = structuredClone(G);
        image.B = structuredClone(B);
        clampingButton.disabled = showImgButton.disabled = histRButton.disabled = histGButton.disabled= histBButton.disabled =downloadImgButton.disabled = false;
    };
    
    reader.readAsArrayBuffer(file);
}

// handleBMPDownload
downloadImgButton.addEventListener('click',()=>{
    const {R,G,B,height,width} = image;
    const rowPadding = (4 - (width * 3) % 4) % 4;
    const rowSize = width * 3 + rowPadding;
    const imageSize = rowSize * height;
    const fileSize = 54 + imageSize;

    const buffer = new ArrayBuffer(fileSize);
    const data = new DataView(buffer);

    // === BMP HEADER (14 bytes) ===
    data.setUint8(0, 'B'.charCodeAt(0));
    data.setUint8(1, 'M'.charCodeAt(0));
    data.setUint32(2, fileSize, true);      // File size
    data.setUint32(6, 0, true);             // Reserved
    data.setUint32(10, 54, true);           // Pixel data offset

    // === DIB HEADER (40 bytes) ===
    data.setUint32(14, 40, true);           // DIB header size
    data.setInt32(18, width, true);         // Width
    data.setInt32(22, height, true);        // Height
    data.setUint16(26, 1, true);            // Color planes
    data.setUint16(28, 24, true);           // Bits per pixel
    data.setUint32(30, 0, true);            // Compression (none)
    data.setUint32(34, imageSize, true);    // Image size
    data.setInt32(38, 2835, true);          // Horizontal resolution (72 DPI)
    data.setInt32(42, 2835, true);          // Vertical resolution (72 DPI)
    data.setUint32(46, 0, true);            // Number of colors in palette
    data.setUint32(50, 0, true);            // Important colors

    // === Pixel Data ===
    let offset = 54;
    for (let y = height - 1; y >= 0; y--) {
        for (let x = 0; x < width; x++) {
            data.setUint8(offset++, B[y][x]);
            data.setUint8(offset++, G[y][x]);
            data.setUint8(offset++, R[y][x]);
        }
        offset += rowPadding; // Padding
    }

    // === Save as file ===
    const blob = new Blob([buffer], { type: 'image/bmp' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.bmp';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});


// rysowanie canvas

function displayRGBOnCanvas(canvas, image) {
    const {R,G,B,p,q} = image;
    const height = R.length;
    const width = height > 0 ? R[0].length : 0;
    
    // Ustawiamy rozmiar canvasa na podstawie wymiarów macierzy
    canvas.width = width;
    canvas.height = height;
  
    // Pobieramy kontekst 2D
    const ctx = canvas.getContext('2d');
  
    // Tworzymy obiekt ImageData, który będzie miał wymiary width x height
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data; // to jest tablica typu Uint8ClampedArray
  
    // Wypełniamy piksele w imageData:
    //   data[i+0] = R
    //   data[i+1] = G
    //   data[i+2] = B
    //   data[i+3] = alpha (nieprzezroczystość)
    let index = 0; 
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        data[index++] = R[y][x];   // R
        data[index++] = G[y][x];   // G
        data[index++] = B[y][x];   // B
        data[index++] = 255;       // A (nieprzezroczystość)
      }
    }
  
    // Rysujemy tak wypełnione dane w kontekście
    ctx.putImageData(imageData, 0, 0);
}

// hist R
histRButton.addEventListener('click',()=>{
   histRButton.classList.add('active');
   histGButton.classList.remove('active');
   histBButton.classList.remove('active');
   if(!histogram){
        histogram = createHistogram(image);
   }
   printHistogram(histogram.R);

})

// hist G
histGButton.addEventListener('click',()=>{
    histGButton.classList.add('active');
    histRButton.classList.remove('active');
    histBButton.classList.remove('active');
    if(!histogram){
         histogram = createHistogram(image);
    }
    printHistogram(histogram.G);
 
 })

 // hist B
histBButton.addEventListener('click',()=>{
    histBButton.classList.add('active');
    histGButton.classList.remove('active');
    histRButton.classList.remove('active');
    if(!histogram){
         histogram = createHistogram(image);
    }
    printHistogram(histogram.B);
 
 })


showImgButton.addEventListener('click',()=>{
    displayRGBOnCanvas(myChart,image);
})

clampingButton.addEventListener('click',()=>{
    let low = prompt("Podaj dolną wartość: ");
    let high = prompt("Podaj górną wartość: ");
    clampImage(image,low,high);
    displayRGBOnCanvas(myChart,Image);
})