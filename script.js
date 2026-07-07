// ==========================================================================
// CONFIGURACIÓN DE USUARIOS Y ACCESOS (ACTUALIZADO 2026)
// ==========================================================================
const usuariosSistemas = [
    {user: "admin", pass: "admin2026", rol: "ADMIN"},
    {user: "torregranados", pass: "torre2026", rol: "OPERADOR"}
];

let usuarioActivo = null;

// CARGA INICIAL Y PERSISTENCIA DE LOGIN
window.onload = () => {
    const savedUser = localStorage.getItem("rememberedUser");
    if(savedUser) {
        document.getElementById("loginUser").value = savedUser;
        document.getElementById("rememberMe").checked = true;
    }
};

// DATOS DE VEHÍCULOS Y MOVIMIENTOS
let activos = JSON.parse(localStorage.getItem("activos")) || [];
activos = activos.map(v => ({...v, horaEntrada: new Date(v.horaEntrada), sellos: v.sellos || 0}));
let historial = JSON.parse(localStorage.getItem("historial")) || [];

// RELOJ EN TIEMPO REAL
setInterval(() => {
    const relojCont = document.getElementById('reloj');
    if(!relojCont) return;
    const ahora = new Date();
    relojCont.innerText = ahora.toLocaleTimeString();
    document.getElementById('fecha').innerText = ahora.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}, 1000);

// FUNCIÓN DE ACCESO
function login(){
    const u = document.getElementById("loginUser").value.trim();
    const p = document.getElementById("loginPass").value.trim();
    const rem = document.getElementById("rememberMe").checked;
    const encontrado = usuariosSistemas.find(x => x.user === u && x.pass === p);

    if(encontrado) {
        if(rem) localStorage.setItem("rememberedUser", u);
        else localStorage.removeItem("rememberedUser");
        usuarioActivo = encontrado;
        document.getElementById("loginCard").style.display = "none";
        document.getElementById("appCard").style.display = "block";
        document.getElementById("userDisplay").innerHTML = `👤 ${usuarioActivo.rol}: ${usuarioActivo.user.toUpperCase()}`;
        actualizarLista();
    } else {
        alert("Usuario o contraseña incorrectos");
    }
}

// ==========================================================================
// REGISTRO DE MOVIMIENTOS (ENTRADAS Y COBROS)
// ==========================================================================
function registrarEntrada(){
    let input = document.getElementById("plateInput");
    let placa = input.value.trim().toUpperCase();
    if(!placa) return;
    let v = {placa, horaEntrada: new Date(), user: usuarioActivo.user, sellos: 0};
    activos.push(v);
    localStorage.setItem("activos", JSON.stringify(activos));
    imprimirTicketEntrada(v);
    input.value = "";
    actualizarLista();
}

function cobrarTicketPerdido() {
    let placa = prompt("Ingrese la PLACA del vehículo:");
    if(!placa) return;
    let registro = {
        placa: "T. PERDIDO: " + placa.toUpperCase(), 
        tipo: "TICKET PERDIDO", 
        precio: 25, 
        fecha: new Date().toLocaleDateString(), 
        operador: usuarioActivo.user, 
        valorSello: 0
    };
    historial.push(registro);
    localStorage.setItem("historial", JSON.stringify(historial));
    imprimirTicketServicioExtra(registro, "Q25.00");
    alert("Cobro registrado (Q25)");
}

function cobrarBaño() {
    let registro = {
        placa: "USO DE BAÑO", 
        tipo: "BAÑO", 
        precio: 3, 
        fecha: new Date().toLocaleDateString(), 
        operador: usuarioActivo.user, 
        valorSello: 0
    };
    historial.push(registro);
    localStorage.setItem("historial", JSON.stringify(historial));
    imprimirTicketServicioExtra(registro, "Q3.00");
    alert("Uso de baño registrado (Q3)");
}

function abrirModalMensual() { document.getElementById("modalMensual").style.display = "flex"; }
function cerrarModalMensual() { document.getElementById("modalMensual").style.display = "none"; }

function guardarMensualidad() {
    const nombre = document.getElementById("mNombre").value;
    const costo = parseFloat(document.getElementById("mCosto").value);
    if(!nombre || !costo) return alert("Faltan datos");
    let registro = {
        placa: `EFECTIVO - MENSUAL: ${nombre.toUpperCase()}`, 
        tipo: "MENSUAL", 
        precio: costo, 
        fecha: new Date().toLocaleDateString(), 
        operador: usuarioActivo.user, 
        valorSello: 0
    };
    historial.push(registro);
    localStorage.setItem("historial", JSON.stringify(historial));
    imprimirTicketServicioExtra(registro, `Q${costo}.00`);
    cerrarModalMensual();
    alert("Pago mensual guardado");
}

// LÓGICA DE SELLOS Y SALIDA CONTRA RELOJ
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
        operador: usuarioActivo.user
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
// GESTIÓN DE TURNOS HISTÓRICOS
// ==========================================================================
function toggleHistorial(){
    let box = document.getElementById("historialBox");
    if(box.style.display === "none") {
        box.style.display = "block";
        let html = historial.slice().reverse().map(h => `<div style="padding:10px; border-bottom:1px solid #eee; font-size:12px;"><b>${h.placa}</b> - Q${h.precio} (${h.tipo})</div>`).join('');
        if(usuarioActivo.rol === "ADMIN") {
            html += `<button class="ios-btn-danger" onclick="borrarHistorialTotal()">BORRAR TODO (ADMIN)</button>`;
        } else {
            html += `<button class="ios-btn-danger" style="background:#ff9500;" onclick="cerrarTurnoOperador()">CERRAR TURNO (BORRAR MI HISTORIAL)</button>`;
        }
        box.innerHTML = html || "Sin movimientos en este turno";
    } else box.style.display = "none";
}

function cerrarTurnoOperador(){
    if(confirm("¿Seguro que desea cerrar su turno? Esto limpiará su historial.")){
        historial = [];
        localStorage.setItem("historial", JSON.stringify(historial));
        toggleHistorial();
        alert("Turno cerrado.");
    }
}

function borrarHistorialTotal(){
    if(confirm("¿BORRAR TODO EL HISTORIAL DEL SISTEMA?")){
        historial = [];
        localStorage.setItem("historial", JSON.stringify(historial));
        toggleHistorial();
    }
}

// ==========================================================================
// ENVÍO DE DATOS LIMPIOS AL PUENTE NATIVO (SIN INTERMEDIARIOS GRÁFICOS)
// ==========================================================================

function imprimirTicketEntrada(v){
    const horaStr = v.horaEntrada.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const fechaStr = v.horaEntrada.toLocaleDateString();

    if (window.AndroidPrinter && window.AndroidPrinter.ticketEntrada) {
        window.AndroidPrinter.ticketEntrada(v.placa, horaStr, fechaStr);
    } else {
        window.print(); // Respaldo para navegadores genéricos
    }
}

function imprimirTicketSalida(h){
    const visualPrecio = h.precio > 0 ? `Q${h.precio}.00` : `Q0.00`;

    if (window.AndroidPrinter && window.AndroidPrinter.ticketSalida) {
        window.AndroidPrinter.ticketSalida(h.placa, visualPrecio, h.horaE, h.horaS, h.fecha);
    } else {
        window.print();
    }
}

function imprimirTicketServicioExtra(reg, totalTexto){
    if (window.AndroidPrinter && window.AndroidPrinter.ticketExtra) {
        window.AndroidPrinter.ticketExtra(reg.tipo, totalTexto, reg.placa, reg.fecha, reg.operador);
    } else {
        window.print();
    }
}

// GENERACIÓN DE REPORTE FINAL LOCAL DE CONTROL ADMINISTRATIVO
function generarReporteHTML() {
    let trabajador = prompt("Nombre del trabajador:");
    if (!trabajador) return;
    let vehiculos = historial.filter(x => x.tipo === "EFECTIVO" || x.tipo === "SELLO TOTAL");
    let otros = historial.filter(x => x.tipo === "BAÑO" || x.tipo === "TICKET PERDIDO" || x.tipo === "MENSUAL");
    let totalCaja = historial.reduce((s, x) => s + x.precio, 0);
    let totalSoloVehiculos = vehiculos.reduce((s, x) => s + x.precio, 0);
    let totalOtros = otros.reduce((s, x) => s + x.precio, 0);

    alert(`REPORTE DE TURNO - ${trabajador.toUpperCase()}\n\nTotal Vehículos: Q${totalSoloVehiculos}.00\nOtros Servicios: Q${totalOtros}.00\nTOTAL EN CAJA: Q${totalCaja}.00`);
}
