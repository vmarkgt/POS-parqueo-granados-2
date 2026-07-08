// ==========================================================================
// CONFIGURACIÓN DE USUARIOS Y ACCESOS
// ==========================================================================
const usuariosSistemas = [
    {user: "admin", pass: "admin2026", rol: "ADMIN"},
    {user: "torregranados", pass: "torre2026", rol: "OPERADOR"}
];

let usuarioActivo = null;

window.onload = () => {
    const savedUser = localStorage.getItem("rememberedUser");
    if(savedUser) {
        document.getElementById("loginUser").value = savedUser;
        document.getElementById("rememberMe").checked = true;
    }
};

let activos = JSON.parse(localStorage.getItem("activos")) || [];
activos = activos.map(v => ({...v, horaEntrada: new Date(v.horaEntrada), sellos: v.sellos || 0}));
let historial = JSON.parse(localStorage.getItem("historial")) || [];

setInterval(() => {
    const relojCont = document.getElementById('reloj');
    if(!relojCont) return;
    const ahora = new Date();
    relojCont.innerText = ahora.toLocaleTimeString();
    document.getElementById('fecha').innerText = ahora.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}, 1000);

function login(){
    const u = document.getElementById("loginUser").value.trim();
    const p = document.getElementById("loginPass").value.trim();
    const rem = document.getElementById("rememberMe").checked;
    const encontrado = usuariosSistemas.find(x => x.user === u && x.pass === p);

    if(encontrado) {
        if(rem) localStorage.setItem("rememberedUser", u);
        else localStorage.removeItem("rememberedUser");
        usuarioActivo = encontrado;
        localStorage.setItem("usuarioLogueadoGenerico", JSON.stringify(encontrado));
        
        document.getElementById("loginCard").style.display = "none";
        document.getElementById("appCard").style.display = "block";
        document.getElementById("userDisplay").innerHTML = `👤 ${usuarioActivo.rol}: ${usuarioActivo.user.toUpperCase()}`;
        actualizarLista();
    } else {
        alert("Usuario o contraseña incorrectos");
    }
}

function obtenerOperadorActual() {
    if (usuarioActivo && usuarioActivo.user) return usuarioActivo.user.trim().toUpperCase();
    const respaldo = localStorage.getItem("usuarioLogueadoGenerico");
    if (respaldo) return JSON.parse(respaldo).user.trim().toUpperCase();
    return "TORREGRANADOS";
}

function obtenerRolActual() {
    if (usuarioActivo && usuarioActivo.rol) return usuarioActivo.rol.toUpperCase();
    const respaldo = localStorage.getItem("usuarioLogueadoGenerico");
    if (respaldo) return JSON.parse(respaldo).rol.toUpperCase();
    return "OPERADOR";
}

// ==========================================================================
// REGISTRO DE MOVIMIENTOS
// ==========================================================================
function registrarEntrada(){
    let input = document.getElementById("plateInput");
    let placa = input.value.trim().toUpperCase();
    if(!placa) return;
    let v = {placa, horaEntrada: new Date(), user: obtenerOperadorActual(), sellos: 0};
    activos.push(v);
    localStorage.setItem("activos", JSON.stringify(activos));
    imprimirTicketEntrada(v);
    input.value = "";
    actualizarLista();
}

function abrirModalMensual() { document.getElementById("modalMensual").style.display = "block"; }
function cerrarModalMensual() { document.getElementById("modalMensual").style.display = "none"; }

function abrirModalTicketPerdido() { 
    document.getElementById("tpPlaca").value = "";
    document.getElementById("modalTicketPerdido").style.display = "block"; 
}
function cerrarModalTicketPerdido() { document.getElementById("modalTicketPerdido").style.display = "none"; }

function abrirModalReporte() {
    document.getElementById("repTrabajador").value = ""; 
    document.getElementById("modalReporte").style.display = "block";
}
function cerrarModalReporte() { document.getElementById("modalReporte").style.display = "none"; }

function cerrarModalVerImagen() { document.getElementById("modalVerImagen").style.display = "none"; }

function cobrarTicketPerdido() { abrirModalTicketPerdido(); }

function guardarTicketPerdido() {
    let placa = document.getElementById("tpPlaca").value.trim().toUpperCase();
    if(!placa) return alert("Ingrese la placa del vehículo");
    
    let registro = {
        placa: placa, 
        tipo: "TICKET PERDIDO", 
        precio: 25, 
        fecha: new Date().toLocaleDateString(), 
        operador: obtenerOperadorActual(), 
        valorSello: 0
    };
    
    historial.push(registro);
    localStorage.setItem("historial", JSON.stringify(historial));
    
    if (window.AndroidPrinter && window.AndroidPrinter.ticketExtra) {
        window.AndroidPrinter.ticketExtra("REPOSICIÓN TICKET PERDIDO", "Q25.00", "PLACA: " + registro.placa, registro.fecha, registro.operador);
    }
    
    cerrarModalTicketPerdido();
    alert("Cobro registrado (Q25) - Ticket Impreso");
}

function cobrarBaño() {
    let registro = {
        placa: "USO DE BAÑO", 
        tipo: "BAÑO", 
        precio: 5, 
        fecha: new Date().toLocaleDateString(), 
        operador: obtenerOperadorActual(), 
        valorSello: 0
    };
    historial.push(registro);
    localStorage.setItem("historial", JSON.stringify(historial));
    
    const btnBaño = document.querySelector("button[onclick='cobrarBaño()']");
    if(btnBaño) {
        const textoOriginal = btnBaño.innerHTML;
        btnBaño.innerHTML = "✅ ¡REGISTRADO Q5!";
        btnBaño.style.background = "#34c759";
        btnBaño.style.color = "#fff";
        setTimeout(() => {
            btnBaño.innerHTML = textoOriginal;
            btnBaño.style.background = "";
            btnBaño.style.color = "";
        }, 2000);
    }
    alert("Uso de baño registrado (Q5)");
}

function guardarMensualidad() {
    const nombre = document.getElementById("mNombre").value.trim();
    const costo = parseFloat(document.getElementById("mCosto").value);
    if(!nombre || !costo) return alert("Faltan datos");
    
    historial.push({
        placa: `MENSUAL: ${nombre.toUpperCase()}`, 
        tipo: "MENSUAL", 
        precio: costo, 
        fecha: new Date().toLocaleDateString(), 
        operador: obtenerOperadorActual(), 
        valorSello: 0
    });
    localStorage.setItem("historial", JSON.stringify(historial));
    cerrarModalMensual();
    alert("Pago mensual guardado");
}

// ==========================================================================
// SALIDAS Y RECAUDACIÓN
// ==========================================================================
function agregarSello(index){
    activos[index].sellos += 1;
    let v = activos[index];
    let min = Math.ceil((new Date() - v.horaEntrada) / 60000);
    if((v.sellos * 30) >= min) darSalida(index);
    else { localStorage.setItem("activos", JSON.stringify(activos)); actualizarLista(); }
}

function darSalida(index){
    let v = activos[index];
    let salida = new Date();
    let minTotales = Math.ceil((salida - v.horaEntrada) / 60000);
    let minFinales = Math.max(0, minTotales - (v.sellos * 30));
    let inicial = v.placa[0];
    let precio = 0;
    
    let valSelloTotal = Math.ceil(minTotales / 30) * (inicial === "M" ? 3 : 5);
    if(minFinales > 0) precio = Math.ceil(minFinales / 30) * (inicial === "M" ? 3 : 5);

    let registro = {
        placa: v.placa,
        tipo: (minFinales === 0 && v.sellos > 0) ? "SELLO TOTAL" : "EFECTIVO",
        horaE: v.horaEntrada.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        horaS: salida.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        fecha: salida.toLocaleDateString(),
        sellos: v.sellos,
        valorSello: (v.sellos > 0) ? valSelloTotal - precio : 0,
        precio: precio,
        operador: obtenerOperadorActual()
    };

    historial.push(registro);
    imprimirTicketSalida(registro);
    activos.splice(index, 1);
    localStorage.setItem("activos", JSON.stringify(activos));
    localStorage.setItem("historial", JSON.stringify(historial));
    actualizarLista();
}

function actualizarLista(){
    let cont = document.getElementById("activeList");
    if(!cont) return;
    cont.innerHTML = "";
    activos.forEach((v, i) => {
        let div = document.createElement("div"); div.className = "vehiculo-item";
        div.innerHTML = `<div class="placa-badge">${v.placa}</div>
            <div style="display:flex; gap:8px;">
                <button class="btn-sello" onclick="agregarSello(${i})">SELLO (${v.sellos})</button>
                <button class="btn-salida-list" onclick="darSalida(${i})">SALIDA</button>
            </div>`;
        cont.appendChild(div);
    });
}

// ==========================================================================
// CIERRE DE TURNOS Y CAJA
// ==========================================================================
function toggleHistorial(){
    let box = document.getElementById("historialBox");
    if(!box) return;
    if(box.style.display === "none") {
        box.style.display = "block";
        let html = historial.slice().reverse().map(h => `<div style="padding:10px; border-bottom:1px solid #eee; font-size:12px; background:#fff; margin:2px 0;"><b>${h.placa}</b> - Q${h.precio} (${h.tipo})</div>`).join('');
        if(obtenerRolActual() === "ADMIN") {
            html += `<button class="ios-btn-danger" style="width:100%; margin-top:10px;" onclick="borrarHistorialTotal()">BORRAR TODO (ADMIN)</button>`;
        } else {
            html += `<button class="ios-btn-danger" style="background:#ff9500; width:100%; margin-top:10px;" onclick="cerrarTurnoOperador()">CERRAR TURNO (BORRAR MI HISTORIAL)</button>`;
        }
        box.innerHTML = html || "<div style='background:#fff; padding:10px;'>Sin movimientos en este turno</div>";
    } else box.style.display = "none";
}

function cerrarTurnoOperador(){
    historial = [];
    localStorage.setItem("historial", JSON.stringify(historial));
    let box = document.getElementById("historialBox");
    if(box) box.innerHTML = "<div style='background:#fff; padding:10px;'>Sin movimientos en este turno</div>";
    alert("Turno cerrado con éxito. Historial de caja reiniciado.");
}

function borrarHistorialTotal(){
    historial = [];
    localStorage.setItem("historial", JSON.stringify(historial));
    toggleHistorial();
}

// ==========================================================================
// IMPRESIÓN DIRECTA NATIVA
// ==========================================================================
function imprimirTicketEntrada(v){
    const horaStr = v.horaEntrada.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const fechaStr = v.horaEntrada.toLocaleDateString();
    if (window.AndroidPrinter && window.AndroidPrinter.ticketEntrada) {
        window.AndroidPrinter.ticketEntrada(v.placa, horaStr, fechaStr);
    }
}

function imprimirTicketSalida(h){
    const visualPrecio = h.precio > 0 ? `Q${h.precio}.00` : `Q0.00`;
    if (window.AndroidPrinter && window.AndroidPrinter.ticketSalida) {
        window.AndroidPrinter.ticketSalida(h.placa, visualPrecio, h.horaE, h.horaS, h.fecha);
    }
}

// ==========================================================================
// GENERADOR DE REPORTE CON FORZADO EN VENTANA FLOTANTE DE ANDROID
// ==========================================================================
function generarReporteHTML() { abrirModalReporte(); }

function procesarReporteAccion(modo) {
    let trabajador = document.getElementById("repTrabajador").value.trim().toUpperCase();
    if (!trabajador) trabajador = "TURNO ACTUAL";
    
    if (historial.length === 0) {
        alert("No hay ningún registro activo en este turno para reportar.");
        cerrarModalReporte();
        return;
    }
    
    let totalCaja = historial.reduce((s, x) => s + x.precio, 0);
    let totalVehiculos = historial.filter(x => x.tipo === "EFECTIVO" || x.tipo === "SELLO TOTAL").reduce((s, s2) => s + s2.precio, 0);
    let totalOtros = historial.filter(x => x.tipo === "BAÑO" || x.tipo === "TICKET PERDIDO" || x.tipo === "MENSUAL").reduce((s, s2) => s + s2.precio, 0);
    let fechaHoy = new Date().toLocaleDateString();

    if (modo === "IMPRIMIR") {
        if (window.AndroidPrinter && window.AndroidPrinter.ticketExtra) {
            let resumenTexto = `V: Q${totalVehiculos}.00 | OTROS: Q${totalOtros}.00`;
            window.AndroidPrinter.ticketExtra("REPORTE DE TURNO", `Q${totalCaja}.00`, resumenTexto, fechaHoy, trabajador);
            alert("Reporte enviado con éxito a la impresora térmica.");
        } else {
            alert(`[Modo PC] Reporte -> Total Caja: Q${totalCaja}.00`);
        }
        cerrarModalReporte();
        
    } else if (modo === "DESCARGAR") {
        let vehiculos = historial.filter(x => x.tipo === "EFECTIVO" || x.tipo === "SELLO TOTAL");
        let otros = historial.filter(x => x.tipo === "BAÑO" || x.tipo === "TICKET PERDIDO" || x.tipo === "MENSUAL");

        let targetDOM = document.createElement("div");
        targetDOM.style.position = "fixed"; 
        targetDOM.style.left = "-9999px";
        targetDOM.style.width = "450px"; 
        targetDOM.style.background = "#ffffff"; 
        targetDOM.style.padding = "20px";

        targetDOM.innerHTML = `
            <div style="border: 2px solid #000; padding: 15px; font-family: Arial, sans-serif; color: #000000; background: #ffffff;">
                <center>
                    <h1 style="margin:0; font-size:22px; font-weight:bold;">TORRE GRANADOS</h1>
                    <h2 style="margin:5px 0 15px 0; font-size:15px; font-weight:normal; letter-spacing:1px;">REPORTE DE TURNO</h2>
                </center>
                <div style="display:flex; justify-content:space-between; margin-top:15px; font-size:12px;">
                    <span><b>ENCARGADO:</b> ${trabajador}</span>
                    <span><b>FECHA:</b> ${fechaHoy}</span>
                </div>
                <hr style="border: 1px solid #000; margin: 12px 0;">
                <h3 style="font-size:13px; margin: 8px 0;">DETALLE DE VEHÍCULOS</h3>
                <table style="width:100%; font-size:11px; border-collapse:collapse; margin-bottom:12px;">
                    <tr style="border-bottom:2px solid #000; text-align:left; font-weight:bold;">
                        <th style="padding:4px;">Placa</th>
                        <th>Tipo</th>
                        <th style="text-align:right; padding:4px;">Monto</th>
                    </tr>
                    ${vehiculos.map(x => `
                        <tr>
                            <td style="padding:4px; border-bottom:1px solid #eee;">${x.placa}</td>
                            <td style="border-bottom:1px solid #eee;">${x.tipo}</td>
                            <td style="text-align:right; padding:4px; border-bottom:1px solid #eee;">Q${x.precio}.00</td>
                        </tr>
                    `).join('')}
                </table>
                
                ${otros.length > 0 ? `
                    <h3 style="font-size:13px; margin: 15px 0 8px 0;">OTROS SERVICIOS</h3>
                    <table style="width:100%; font-size:11px; border-collapse:collapse; margin-bottom:12px;">
                        <tr style="border-bottom:2px solid #000; text-align:left; font-weight:bold;">
                            <th style="padding:4px;">Descripción</th>
                            <th style="text-align:right; padding:4px;">Monto</th>
                        </tr>
                        ${otros.map(x => `
                            <tr>
                                <td style="padding:4px; border-bottom:1px solid #eee;">${x.placa}</td>
                                <td style="text-align:right; padding:4px; border-bottom:1px solid #eee;">Q${x.precio}.00</td>
                            </tr>
                        `).join('')}
                    </table>
                ` : ''}
                
                <div style="margin-top:20px; border:2px solid #000; padding:10px; background:#fcfcfc;">
                    <table style="width:100%; font-size:12px; border-collapse:collapse;">
                        <tr><td style="padding:2px 0;">Total Vehículos:</td><td style="text-align:right;">Q${totalVehiculos}.00</td></tr>
                        <tr><td style="padding:2px 0; border-bottom:1px solid #000;">Otros Servicios:</td><td style="text-align:right; border-bottom:1px solid #000;">Q${totalOtros}.00</td></tr>
                        <tr style="font-size:15px; font-weight:bold;"><td style="padding:6px 0 0 0;">TOTAL RECAUDADO:</td><td style="text-align:right; padding:6px 0 0 0;">Q${totalCaja}.00</td></tr>
                    </table>
                </div>
            </div>
        `;

        document.body.appendChild(targetDOM);

        setTimeout(() => {
            html2canvas(targetDOM, {scale: 2, logging: false, useCORS: true}).then(canvas => {
                let base64data = canvas.toDataURL("image/png");
                
                let imgElement = document.createElement("img");
                imgElement.src = base64data;
                imgElement.alt = "Reporte de Turno";
                imgElement.style.maxWidth = "100%";
                imgElement.style.height = "auto";
                imgElement.style.display = "block";
                
                let contenedor = document.getElementById("contenedorRenderImagen");
                contenedor.innerHTML = ""; 
                contenedor.appendChild(imgElement);
                
                // ESTRATEGIA DE EVASIÓN WEBVIEW:
                let btnAbrirNativo = document.getElementById("btnAbrirVentanaNativa");
                btnAbrirNativo.onclick = () => {
                    let nuevaVentana = window.open();
                    if(nuevaVentana) {
                        nuevaVentana.document.write(`
                            <html>
                            <head>
                                <title>Reporte - Manten presionado</title>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <style>
                                    body { background: #000; margin: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 100vh; font-family: sans-serif; color: #fff; }
                                    img { max-width: 95%; height: auto; border-radius: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); background: #fff; padding: 5px; }
                                    p { font-size: 14px; text-align: center; margin-bottom: 15px; color: #ccc; padding: 0 20px;}
                                </style>
                            </head>
                            <body>
                                <p>⚠️ <b>PANTALLA COMPLETA NATIVA:</b><br>Mantén presionado sobre el reporte para guardar o compartir.</p>
                                <img src="${base64data}">
                            </body>
                            </html>
                        `);
                        nuevaVentana.document.close();
                    } else {
                        window.location.href = base64data;
                    }
                };

                cerrarModalReporte();
                document.getElementById("modalVerImagen").style.display = "block";
                document.body.removeChild(targetDOM);
            }).catch(err => {
                alert("Error generando vista de imagen: " + err);
                document.body.removeChild(targetDOM);
            });
        }, 300);
    }
}
