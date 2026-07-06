// CONFIGURACIÓN DE USUARIOS
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

// RECUPERACIÓN SEGURA DE DATOS (CONVERSIÓN DE FECHAS)
let activos = [];
try {
    let almacenados = localStorage.getItem("activos");
    if(almacenados) {
        activos = JSON.parse(almacenados).map(v => {
            return {
                placa: v.placa,
                horaEntrada: new Date(v.horaEntrada),
                user: v.user || "desconocido",
                sellos: parseInt(v.sellos) || 0
            };
        });
    }
} catch(e) {
    activos = [];
}

let historial = [];
try {
    let histAlmacenado = localStorage.getItem("historial");
    if(histAlmacenado) historial = JSON.parse(histAlmacenado);
} catch(e) {
    historial = [];
}

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

// REGISTRO DE ENTRADA
function registrarEntrada(){
    let input = document.getElementById("plateInput");
    let placa = input.value.trim().toUpperCase();
    if(!placa) return;
    
    let v = {placa: placa, horaEntrada: new Date(), user: usuarioActivo ? usuarioActivo.user : "sistema", sellos: 0};
    activos.push(v);
    localStorage.setItem("activos", JSON.stringify(activos));
    
    imprimirTicketEntrada(v);
    
    input.value = "";
    actualizarLista();
}

// COBROS EXTRAS
function cobrarTicketPerdido() {
    let placa = prompt("Ingrese la PLACA del vehículo:");
    if(!placa) return;
    historial.push({placa: "T. PERDIDO: " + placa.toUpperCase(), tipo: "TICKET PERDIDO", precio: 25, fecha: new Date().toLocaleDateString(), operador: usuarioActivo ? usuarioActivo.user : "sistema", valorSello: 0});
    localStorage.setItem("historial", JSON.stringify(historial));
    alert("Cobro registrado (Q25)");
}

function cobrarBaño() {
    historial.push({placa: "USO DE BAÑO", tipo: "BAÑO", precio: 3, fecha: new Date().toLocaleDateString(), operador: usuarioActivo ? usuarioActivo.user : "sistema", valorSello: 0});
    localStorage.setItem("historial", JSON.stringify(historial));
    alert("Uso de baño registrado (Q3)");
}

function abrirModalMensual() { document.getElementById("modalMensual").style.display = "flex"; }
function cerrarModalMensual() { document.getElementById("modalMensual").style.display = "none"; }

function guardarMensualidad() {
    const nombre = document.getElementById("mNombre").value;
    const costo = parseFloat(document.getElementById("mCosto").value);
    if(!nombre || !costo) return alert("Faltan datos");
    historial.push({placa: `MENSUAL: ${nombre.toUpperCase()}`, tipo: "MENSUAL", precio: costo, fecha: new Date().toLocaleDateString(), operador: usuarioActivo ? usuarioActivo.user : "sistema", valorSello: 0});
    localStorage.setItem("historial", JSON.stringify(historial));
    cerrarModalMensual();
    alert("Pago mensual guardado");
}

// LÓGICA DE SELLOS Y SALIDA
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
        operador: usuarioActivo ? usuarioActivo.user : "sistema"
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

// HISTORIAL Y CIERRE DE TURNOS
function toggleHistorial(){
    let box = document.getElementById("historialBox");
    if(box.style.display === "none") {
        box.style.display = "block";
        let html = historial.slice().reverse().map(h => `<div style="padding:10px; border-bottom:1px solid #eee; font-size:12px;"><b>${h.placa}</b> - Q${h.precio} (${h.tipo})</div>`).join('');
        if(usuarioActivo && usuarioActivo.rol === "ADMIN") {
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

// --- PROCESO NATIVO DE IMPRESIÓN DIRECTO ---

function imprimirTicketEntrada(v){
    const contenedor = document.createElement('div');
    contenedor.className = 'ticket-print';
    
    contenedor.innerHTML = `
        <div style="text-align: center; width: 100%; font-family: monospace; color: #000;">
            <p style="margin: 0; font-weight: bold; font-size: 16px;">TORRE GRANADOS</p>
            <p style="margin: 3px 0;">--------------------------------</p>
            <p style="margin: 10px 0; font-size: 26px; font-weight: bold;">PLACA: ${v.placa}</p>
            <p style="margin: 3px 0;">--------------------------------</p>
            <p style="margin: 5px 0; text-align: left;">ENTRADA: ${new Date().toLocaleTimeString()}</p>
            <p style="margin: 5px 0; text-align: left;">FECHA:   ${new Date().toLocaleDateString()}</p>
            <p style="margin: 3px 0;">--------------------------------</p>
            <p style="margin: 10px 0 0 0; font-weight: bold;">30 MIN GRATIS POR SELLO</p>
            <br><br><br><br>
        </div>
    `;
    
    document.body.appendChild(contenedor);
    
    // Llamada directa al puente nativo de Android
    window.AndroidPrinter.imprimirVista("Ticket_Entrada_" + v.placa);
    
    contenedor.remove();
}

function imprimirTicketSalida(h){
    let visualPrecio = h.precio > 0 ? `Q${h.precio}.00` : `Q0.00`;
    const contenedor = document.createElement('div');
    contenedor.className = 'ticket-print';
    
    contenedor.innerHTML = `
        <div style="text-align: center; width: 100%; font-family: monospace; color: #000;">
            <p style="margin: 0; font-weight: bold; font-size: 16px;">TORRE GRANADOS</p>
            <p style="margin: 3px 0;">--------------------------------</p>
            <p style="margin: 5px 0; font-size: 20px; font-weight: bold;">PLACA: ${h.placa}</p>
            <p style="margin: 3px 0;">--------------------------------</p>
            <p style="margin: 15px 0; font-size: 28px; font-weight: bold;">TOTAL: ${visualPrecio}</p>
            <p style="margin: 3px 0;">--------------------------------</p>
            <p style="margin: 5px 0; text-align: left;">E: ${h.horaE} | S: ${h.horaS}</p>
            <p style="margin: 5px 0; text-align: left;">FECHA: ${h.fecha}</p>
            <p style="margin: 3px 0;">--------------------------------</p>
            <p style="margin: 10px 0 0 0; font-weight: bold;">¡GRACIAS POR SU VISITA!</p>
            <br><br><br><br>
        </div>
    `;
    
    document.body.appendChild(contenedor);
    
    // Llamada directa al puente nativo de Android
    window.AndroidPrinter.imprimirVista("Ticket_Salida_" + h.placa);
    
    contenedor.remove();
}

// GENERACIÓN DE REPORTE NATIVO TÉRMICO
function generarReporteHTML() {
    let trabajador = prompt("Nombre del trabajador:");
    if (!trabajador) return;
    let vehiculos = historial.filter(x => x.tipo === "EFECTIVO" || x.tipo === "SELLO TOTAL");
    let otros = historial.filter(x => x.tipo === "BAÑO" || x.tipo === "TICKET PERDIDO" || x.tipo === "MENSUAL");
    let totalCaja = historial.reduce((s, x) => s + x.precio, 0);
    let totalSoloVehiculos = vehiculos.reduce((s, x) => s + x.precio, 0);
    let totalOtros = otros.reduce((s, x) => s + x.precio, 0);

    let contenedor = document.createElement("div");
    contenedor.className = 'ticket-print';

    contenedor.innerHTML = `
        <div style="width: 100%; font-family: monospace; color: #000; font-size: 12px;">
            <center>
                <p style="margin: 0; font-weight: bold; font-size: 16px;">REPORTE DE TURNO</p>
                <p style="margin: 0; font-size: 14px;">TORRE GRANADOS</p>
            </center>
            <p style="margin: 10px 0 5px 0;"><b>OPERADOR:</b> ${trabajador.toUpperCase()}</p>
            <p style="margin: 0 0 10px 0;"><b>FECHA:</b> ${new Date().toLocaleDateString()}</p>
            <p style="margin: 3px 0;">--------------------------------</p>
            <center><p style="margin: 5px 0; font-weight:bold;">DETALLE VEHÍCULOS</p></center>
            ${vehiculos.map(x => `<p style="margin: 3px 0; display:flex; justify-content:space-between;"><span>${x.placa} (${x.tipo})</span> <span>Q${x.precio}.00</span></p>`).join('')}
            
            ${otros.length > 0 ? `
                <p style="margin: 3px 0;">--------------------------------</p>
                <center><p style="margin: 5px 0; font-weight:bold;">OTROS SERVICIOS</p></center>
                ${otros.map(x => `<p style="margin: 3px 0; display:flex; justify-content:space-between;"><span>${x.placa}</span> <span>Q${x.precio}.00</span></p>`).join('')}
            ` : ''}
            <p style="margin: 3px 0;">--------------------------------</p>
            <p style="margin: 5px 0; font-size: 14px;">Total Autos: Q${totalSoloVehiculos}.00</p>
            <p style="margin: 5px 0; font-size: 14px;">Otros Serv: Q${totalOtros}.00</p>
            <p style="margin: 8px 0; font-size: 16px; font-weight: bold; display:flex; justify-content:space-between;"><span>TOTAL CAJA:</span> <span>Q${totalCaja}.00</span></p>
            <br><br><br><br>
        </div>
    `;

    document.body.appendChild(contenedor);
    
    window.AndroidPrinter.imprimirVista("Reporte_" + trabajador.toUpperCase());
    
    contenedor.remove();
}
