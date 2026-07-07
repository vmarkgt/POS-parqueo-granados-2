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

// CONTROL DE MODALES INTERNOS
function abrirModalMensual() { document.getElementById("modalMensual").style.display = "block"; }
function cerrarModalMensual() { document.getElementById("modalMensual").style.display = "none"; }

function abrirModalTicketPerdido() { 
    document.getElementById("tpPlaca").value = "";
    document.getElementById("modalTicketPerdido").style.display = "block"; 
}
function cerrarModalTicketPerdido() { document.getElementById("modalTicketPerdido").style.display = "none"; }

// 3. SE QUITÓ EL NOMBRE POR DEFECTO PARA QUE EL CAMPO APAREZCA VACÍO
function abrirModalReporte() {
    document.getElementById("repTrabajador").value = ""; 
    document.getElementById("modalReporte").style.display = "block";
}
function cerrarModalReporte() { document.getElementById("modalReporte").style.display = "none"; }

// RESPUESTAS DE LOS BOTONES A LOS MODALES
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

// 1. NOTIFICACIÓN VISUAL EN EL BOTÓN PARA EL USO DE BAÑO
function cobrarBaño() {
    let registro = {
        placa: "USO DE BAÑO", 
        tipo: "BAÑO", 
        precio: 3, 
        fecha: new Date().toLocaleDateString(), 
        operador: obtenerOperadorActual(), 
        valorSello: 0
    };
    historial.push(registro);
    localStorage.setItem("historial", JSON.stringify(historial));
    
    // Cambia el texto del botón dinámicamente como alerta visual rápida
    const btnBaño = document.querySelector("button[onclick='cobrarBaño()']");
    if(btnBaño) {
        const textoOriginal = btnBaño.innerHTML;
        btnBaño.innerHTML = "✅ ¡REGISTRADO Q3!";
        btnBaño.style.background = "#34c759";
        btnBaño.style.color = "#fff";
        
        setTimeout(() => {
            btnBaño.innerHTML = textoOriginal;
            btnBaño.style.background = "";
            btnBaño.style.color = "";
        }, 2000);
    }
    
    alert("Uso de baño registrado (Q3)");
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
        let html = historial.slice().reverse().map(h => `<div style="padding:10px; border-bottom:1px solid #eee; font-size:12px; background:#fff; margin:2px 0;"><b>${h.placa}</b> - Q${h.precio} (${h.tipo}) <span style="font-size:10px; color:#666;">[${h.operador}]</span></div>`).join('');
        if(obtenerRolActual() === "ADMIN") {
            html += `<button class="ios-btn-danger" style="width:100%; margin-top:10px;" onclick="borrarHistorialTotal()">BORRAR TODO (ADMIN)</button>`;
        } else {
            html += `<button class="ios-btn-danger" style="background:#ff9500; width:100%; margin-top:10px;" onclick="cerrarTurnoOperador()">CERRAR TURNO (BORRAR MI HISTORIAL)</button>`;
        }
        box.innerHTML = html || "<div style='background:#fff; padding:10px;'>Sin movimientos en este turno</div>";
    } else box.style.display = "none";
}

// 2. CORREGIDO: FILTRADO ABSOLUTO E INMEDIATO DEL TRABAJADOR SIN IMPORTAR MAYÚSCULAS
function cerrarTurnoOperador(){
    const opActual = obtenerOperadorActual().trim().toUpperCase();
    if(confirm(`¿Cerrar turno de ${opActual}? Esto limpiará de forma definitiva sus registros de caja.`)){
        
        // Comparamos convirtiendo a mayúsculas estrictas para eliminar fallos de coincidencia
        historial = historial.filter(x => x.operador.trim().toUpperCase() !== opActual);
        
        localStorage.setItem("historial", JSON.stringify(historial));
        
        // Forzamos el refresco del panel visual
        let box = document.getElementById("historialBox");
        if(box && box.style.display !== "none") {
            box.style.display = "none";
            toggleHistorial();
        }
        
        alert(`Turno de ${opActual} finalizado y registros locales removidos.`);
    }
}

function borrarHistorialTotal(){
    if(confirm("¿BORRAR TODO EL HISTORIAL GENERAL DEL SISTEMA (ACCION ADMIN)?")){
        historial = [];
        localStorage.setItem("historial", JSON.stringify(historial));
        toggleHistorial();
    }
}

// ==========================================================================
// IMPRESIÓN DIRECTA NATIVA (PUENTE ANDROID)
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

function generarReporteHTML() { abrirModalReporte(); }

// 3. REPORTE FILTRADO PARA QUE CALCULE SOLO LO PERTENECIENTE A LA PERSONA QUE ESCRIBE SU NOMBRE
function ejecutarReporteImpreso() {
    let trabajador = document.getElementById("repTrabajador").value.trim().toUpperCase();
    if (!trabajador) return alert("Por favor, escriba su nombre para generar el reporte");
    
    // Filtramos los movimientos del historial que pertenezcan únicamente al nombre ingresado en el input
    let historialDelTurno = historial.filter(x => x.operador.trim().toUpperCase() === trabajador);
    
    if (historialDelTurno.length === 0) {
        alert(`No se encontraron movimientos registrados bajo el nombre "${trabajador}" en la sesión activa.`);
        cerrarModalReporte();
        return;
    }
    
    let totalCaja = historialDelTurno.reduce((s, x) => s + x.precio, 0);
    let totalVehiculos = historialDelTurno.filter(x => x.tipo === "EFECTIVO" || x.tipo === "SELLO TOTAL").reduce((s, x) => s + x.precio, 0);
    let totalOtros = historialDelTurno.filter(x => x.tipo === "BAÑO" || x.tipo === "TICKET PERDIDO" || x.tipo === "MENSUAL").reduce((s, x) => s + x.precio, 0);
    
    let fechaHoy = new Date().toLocaleDateString();

    if (window.AndroidPrinter && window.AndroidPrinter.ticketExtra) {
        let resumenTexto = `V: Q${totalVehiculos}.00 | OTROS: Q${totalOtros}.00`;
        
        window.AndroidPrinter.ticketExtra(
            "REPORTE DE TURNO", 
            `Q${totalCaja}.00`, 
            resumenTexto, 
            fechaHoy, 
            trabajador
        );
        alert("Reporte de turno generado y enviado a la impresora.");
    } else {
        alert(`Modo PC - Turno [${trabajador}] -> Total: Q${totalCaja}.00 (Vehículos: Q${totalVehiculos}, Otros: Q${totalOtros})`);
    }
    
    cerrarModalReporte();
}
