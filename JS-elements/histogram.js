export function createHistogram(img){
    if(img.height === 0 || img.width === 0)
        console.error("Img obj is empty!");

    let histogram = {
        R: new Array(256).fill(0),
        G: new Array(256).fill(0),
        B: new Array(256).fill(0),
    }

    for(let i = 0; i< img.height; i+=1){
        for(let j = 0; j < img.width; j+=1){
            histogram.R[img.R[i][j]]+=1;
            histogram.G[img.G[i][j]]+=1;
            histogram.B[img.B[i][j]]+=1;
        }
    }
    
    return histogram;
}

export function printHistogram(array){
    const ctx = document.getElementById("myChart").getContext('2d');

    // Jeśli wykres już istnieje – zniszcz go
    if (window.myChart && typeof window.myChart.destroy === 'function') {
        window.myChart.destroy();
    }
    
    // Utwórz nowy wykres i zapisz go globalnie
    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: 256 }, (_, i) => i),
            datasets: [{
                label: "Liczba pikseli",
                data: array,
                borderWidth: 1,
                backgroundColor: 'rgb(0, 0, 0)'
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
