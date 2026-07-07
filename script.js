// --- PROCESAMIENTO E IMPRESIÓN EXCLUSIVA POR IMAGEN CON RESPALDO DE TEXTO ---

function procesarEImprimirNativo(contenedor, textoAlternativo) {
    document.body.appendChild(contenedor);
    
    setTimeout(() => {
        // Si html2canvas está listo, intentamos la foto perfecta
        if (typeof html2canvas !== "undefined") {
            html2canvas(contenedor, {
                scale: 2,
                backgroundColor: "#ffffff",
                logging: false,
                useCORS: true
            }).then(canvas => {
                const base64Data = canvas.toDataURL("image/png").split(',')[1];
                if (window.AndroidPrinter && window.AndroidPrinter.imprimirImagenBase64) {
                    window.AndroidPrinter.imprimirImagenBase64(base64Data);
                } else {
                    window.print();
                }
                contenedor.remove();
            }).catch(err => {
                // Si la foto falla, enviamos el texto de respaldo para que imprima sí o sí
                forzarImpresionTextoPlano(textoAlternativo);
                contenedor.remove();
            });
        } else {
            // Si la librería no cargó a tiempo, no bloqueamos la app, mandamos el texto de una vez
            forzarImpresionTextoPlano(textoAlternativo);
            contenedor.remove();
        }
    }, 300);
}

// Función de auxilio para que el POS imprima aunque falle el diseño gráfico
function forzarImpresionTextoPlano(texto) {
    if (window.AndroidPrinter) {
        // Si tu MainActivity viejo o nuevo tiene el puente de texto, lo usará
        if (typeof window.AndroidPrinter.imprimirVista === "function") {
            window.AndroidPrinter.imprimirVista(texto);
        } else if (typeof window.AndroidPrinter.imprimirImagenBase64 === "function") {
            // Si solo tiene el de imágenes, abrimos el menú genérico para no congelar la pantalla
            window.print();
        }
    } else {
        window.print();
    }
}

function imprimirTicketEntrada(v){
    const fechaHora = new Date();
    const contenedor = document.createElement('div');
    contenedor.className = 'ticket-print';
    contenedor.style.width = "280px";
    contenedor.style.padding = "15px";
    contenedor.style.background = "#ffffff";
    contenedor.style.color = "#000000";
    
    contenedor.innerHTML = `
        <center>
            <h2 style="font-size: 16px; font-weight: bold; margin: 2px 0;">TORRE GRANADOS</h2>
            <p style="font-size: 11px; margin: 2px 0;">CONTROL DE PARQUEO</p>
            <hr style="border-top: 1px dashed #000; margin: 8px 0;">
            <h1 style="font-size: 38px; margin: 12px 0; font-weight: bold;">${v.placa}</h1>
            <hr style="border-top: 1px dashed #000; margin: 8px 0;">
        </center>
        <p style="font-size: 13px; margin: 5px 0;"><b>ENTRADA:</b> ${fechaHora.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        <p style="font-size: 13px; margin: 5px 0;"><b>FECHA:</b> ${fechaHora.toLocaleDateString()}</p>
    `;
    
    procesarEImprimirNativo(contenedor, "Entrada_" + v.placa);
}

function imprimirTicketSalida(h){
    const visualPrecio = h.precio > 0 ? `Q${h.precio}.00` : `Q0.00`;
    const contenedor = document.createElement('div');
    contenedor.className = 'ticket-print';
    contenedor.style.width = "280px";
    contenedor.style.padding = "15px";
    contenedor.style.background = "#ffffff";
    contenedor.style.color = "#000000";
    
    contenedor.innerHTML = `
        <center>
            <h2 style="font-size: 16px; font-weight: bold; margin: 2px 0;">TORRE GRANADOS</h2>
            <hr style="border-top: 1px dashed #000; margin: 8px 0;">
            <p style="font-size: 15px; font-weight: bold; margin: 5px 0;">PLACA: ${h.placa}</p>
            <h1 style="font-size: 42px; margin: 10px 0; font-weight: bold;">${visualPrecio}</h1>
            <hr style="border-top: 1px dashed #000; margin: 8px 0;">
        </center>
        <p style="font-size: 13px; margin: 5px 0;"><b>E:</b> ${h.horaE} | <b>S:</b> ${h.horaS}</p>
        <p style="font-size: 13px; margin: 5px 0;"><b>FECHA:</b> ${h.fecha}</p>
    `;
    
    procesarEImprimirNativo(contenedor, "Salida_" + h.placa);
}

function imprimirTicketServicioExtra(reg, totalTexto){
    const contenedor = document.createElement('div');
    contenedor.className = 'ticket-print';
    contenedor.style.width = "280px";
    contenedor.style.padding = "15px";
    contenedor.style.background = "#ffffff";
    contenedor.style.color = "#000000";
    
    contenedor.innerHTML = `
        <center>
            <h2 style="font-size: 16px; font-weight: bold; margin: 2px 0;">TORRE GRANADOS</h2>
            <hr style="border-top: 1px dashed #000; margin: 8px 0;">
            <p style="font-size: 15px; font-weight: bold; margin: 5px 0;">${reg.tipo}</p>
            <h1 style="font-size: 36px; margin: 10px 0; font-weight: bold;">${totalTexto}</h1>
            <hr style="border-top: 1px dashed #000; margin: 8px 0;">
        </center>
        <p style="font-size: 13px; margin: 5px 0;"><b>DETALLE:</b> ${reg.placa}</p>
        <p style="font-size: 13px; margin: 5px 0;"><b>FECHA:</b> ${reg.fecha}</p>
    `;
    
    procesarEImprimirNativo(contenedor, "Extra_" + reg.tipo);
}
