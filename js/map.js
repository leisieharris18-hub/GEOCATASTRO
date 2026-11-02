// ============================================================================
// ETAPA 1: CONFIGURACIÓN INICIAL DEL MAPA BASE Y CAPAS WMS (GEOSERVER)
// ============================================================================

// Inicialización del mapa Leaflet
const map = L.map("map", {
    center: [9.3615, -79.9010],
    zoom: 15.7,
    zoomControl: false
});

// Control de Zoom
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

// Capas Base (OpenStreetMap configurado con subdominios seguros y sin restricciones de API)
const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by Humanitarian OpenStreetMap Team'
});

const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

osmLayer.addTo(map);

// Capas WMS operacionales desde GeoServer
const corregimientos = L.tileLayer.wms("http://localhost:8080/geoserver/PROPANAMA/wms?", { layers: "PROPANAMA:corregimientos", format: "image/png", transparent: true }).addTo(map);
const catastro = L.tileLayer.wms("http://localhost:8080/geoserver/PROPANAMA/wms?", { layers: "PROPANAMA:catastralesc3", format: "image/png", transparent: true }).addTo(map);
const fincas = L.tileLayer.wms("http://localhost:8080/geoserver/PROPANAMA/wms?", { layers: "PROPANAMA:fincas", format: "image/png", transparent: true }).addTo(map);

// Control Switcher de Capas
const baseMaps = { 
    "OpenStreetMap (Humanitario)": osmLayer,
    "Satélite (Esri)": satelliteLayer
};
const overlayMaps = { "Corregimientos": corregimientos, "Catastrales": catastro, "Fincas": fincas };
L.control.layers(baseMaps, overlayMaps).addTo(map);


// ============================================================================
// ETAPA 2: INTEGRACIÓN DEL MODO OSCURO (DARK THEME INTERACTIVO GLOBAL)
// ============================================================================

document.addEventListener("DOMContentLoaded", function() {
    const darkThemeToggle = document.getElementById("darkThemeToggle");

    if (darkThemeToggle) {
        // Opcional: verificar si el usuario ya lo tenía activado previamente en localStorage
        if (localStorage.getItem("geo_dark_mode") === "true") {
            darkThemeToggle.checked = true;
            document.body.classList.add("dark-mode");
        }

        darkThemeToggle.addEventListener("change", function() {
            if (this.checked) {
                document.body.classList.add("dark-mode");
                localStorage.setItem("geo_dark_mode", "true");
            } else {
                document.body.classList.remove("dark-mode");
                localStorage.setItem("geo_dark_mode", "false");
            }
        });
    }
});


// ============================================================================
// ETAPA 3: INTEGRACIÓN DE NAVEGACIÓN 3D Y STREET VIEW
// ============================================================================

// ------------------------------------------------------------
// CONTROL PERSONALIZADO: FLECHA DE NORTE (SIN CUADRO, SOLO CÍRCULO)
// ------------------------------------------------------------
const NorthArrowControl = L.Control.extend({
    options: { position: 'topleft' },

    onAdd: function(map) {
        // Se elimina 'leaflet-bar leaflet-control' para que desaparezca el cuadro gris/blanco por defecto
        const container = L.DomUtil.create(
            'div',
            'custom-north-control'
        );

        container.style.marginTop = '5px';
        container.style.marginLeft = '5px';

        container.innerHTML = `
            <div
                title="Orientación Norte"
                style="
                    position: relative;
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #ffffff;
                    border: 1px solid #cccccc;
                    border-radius: 50%;
                    cursor: pointer;
                    box-sizing: border-box;
                    box-shadow: 0 3px 8px rgba(0,0,0,0.25);
                "
            >
                <!-- LETRAS CARDINALES -->
                <span style="position:absolute; top:1px; left:50%; transform:translateX(-50%); font-size:10px; font-weight:bold; color:#ff0000; z-index:10; line-height:1;">N</span>
                <span style="position:absolute; bottom:1px; left:50%; transform:translateX(-50%); font-size:10px; font-weight:bold; color:#000000; z-index:10; line-height:1;">S</span>
                <span style="position:absolute; left:3px; top:50%; transform:translateY(-50%); font-size:10px; font-weight:bold; color:#000000; z-index:10; line-height:1;">O</span>
                <span style="position:absolute; right:3px; top:50%; transform:translateY(-50%); font-size:10px; font-weight:bold; color:#000000; z-index:10; line-height:1;">E</span>

                <!-- ANILLO EXTERIOR DE LA BRÚJULA -->
                <div style="
                    position: absolute;
                    width: 36px;
                    height: 36px;
                    border: 1px dashed rgba(0, 141, 165, 0.4);
                    border-radius: 50%;
                    box-sizing: border-box;
                "></div>

                <!-- CONTENEDOR DE LA ROSA DE LOS VIENTOS (CON ROTACIÓN CENTRAL) -->
                <div style="
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                ">
                    <!-- NORTE (Principal - Brillante arriba) -->
                    <div style="
                        position: absolute;
                        width: 0; height: 0;
                        border-left: 4px solid transparent;
                        border-right: 4px solid transparent;
                        border-bottom: 15px solid #00c4df;
                        top: -3px;
                        left: 50%;
                        transform: translateX(-50%);
                        filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));
                    "></div>
                    <div style="
                        position: absolute;
                        width: 0; height: 0;
                        border-left: 2px solid transparent;
                        border-right: 2px solid transparent;
                        border-bottom: 13px solid #ffffff;
                        top: -1px;
                        left: 50%;
                        transform: translateX(-50%);
                    "></div>

                    <!-- SUR (Abajo) -->
                    <div style="
                        position: absolute;
                        width: 0; height: 0;
                        border-left: 4px solid transparent;
                        border-right: 4px solid transparent;
                        border-top: 15px solid #006f86;
                        bottom: -3px;
                        left: 50%;
                        transform: translateX(-50%);
                    "></div>

                    <!-- OESTE (Izquierda) -->
                    <div style="
                        position: absolute;
                        width: 0; height: 0;
                        border-top: 4px solid transparent;
                        border-bottom: 4px solid transparent;
                        border-right: 15px solid #008da5;
                        top: 50%;
                        left: -3px;
                        transform: translateY(-50%);
                    "></div>

                    <!-- ESTE (Derecha) -->
                    <div style="
                        position: absolute;
                        width: 0; height: 0;
                        border-top: 4px solid transparent;
                        border-bottom: 4px solid transparent;
                        border-left: 15px solid #00a8cc;
                        top: 50%;
                        right: -3px;
                        transform: translateY(-50%);
                    "></div>

                    <!-- CENTRO DE LA ROSA -->
                    <div style="
                        position: absolute;
                        width: 6px;
                        height: 6px;
                        background: #ffffff;
                        border: 1.5px solid #004d5e;
                        border-radius: 50%;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        z-index: 5;
                    "></div>
                </div>
            </div>
        `;

        L.DomEvent.disableClickPropagation(container);

        container.addEventListener('click', function() {
            console.log("Indicador de Norte presionado");
        });

        return container;
    }
});

map.addControl(new NorthArrowControl());

window.abrirStreetView = function(lat, lng) {
    const panel = document.getElementById('streetViewPanel');
    const iframe = document.getElementById('streetViewIframe');
    if (panel && iframe) {
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.src = `https://maps.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=12,0,0,0,0&output=svembed`;
        panel.style.display = 'flex';
    }
};

// Control Drag & Drop de Vehículo Street View
const StreetViewControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.innerHTML = '<div style="background:white; padding:6px; cursor:grab; font-size:16px; border-radius:4px; text-align:center;" title="Arrastra el carro al mapa para ver Street View">🚗</div>';
        L.DomEvent.disableClickPropagation(container);
        
        let dragging = false;
        let dragIcon = null;
        
        container.addEventListener('mousedown', function(e) {
            dragging = true;
            e.preventDefault();
            dragIcon = L.marker(map.getCenter(), { 
                icon: L.divIcon({ 
                    className: 'pegman-drag-icon', 
                    html: '<div style="font-size:26px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); pointer-events: none;">🚗</div>', 
                    iconSize: [30, 30] 
                }) 
            }).addTo(map);
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!dragging || !dragIcon) return;
            const rect = map.getContainer().getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                const latlng = map.containerPointToLatLng([x, y]);
                dragIcon.setLatLng(latlng);
            }
        });
        
        document.addEventListener('mouseup', function(e) {
            if (!dragging) return;
            dragging = false;
            
            if (dragIcon) {
                map.removeLayer(dragIcon);
                dragIcon = null;
            }
            
            const rect = map.getContainer().getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const finalLatLng = map.containerPointToLatLng([x, y]);
                
                const marcadorStreetView = L.marker(finalLatLng, {
                    icon: L.divIcon({ 
                        className: 'car-marker-active', 
                        html: '<div style="font-size:24px; text-shadow: 0 2px 5px rgba(0,0,0,0.6); cursor:pointer;" title="Punto Street View activo">🚗</div>', 
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    })
                }).addTo(map);

const contenidoPopupSV = `
    <div style="font-family: sans-serif; font-size: 12px; min-width: 180px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; position: relative;">
            <span id="tituloSVText" style="font-weight: bold;">🚗 Street View Activo</span>
            <div style="display: flex; gap: 6px; align-items: center;">
                <button onclick="
                    const body = document.getElementById('bodySVContent');
                    const titulo = document.getElementById('tituloSVText');
                    const popupNode = this.closest('.leaflet-popup');
                    const btn = this;
                    
                    if(body.style.display === 'none') {
                        body.style.display = 'block';
                        titulo.style.display = 'inline';
                        if(popupNode) {
                            const contentWrapper = popupNode.querySelector('.leaflet-popup-content-wrapper');
                            if(contentWrapper) contentWrapper.style.visibility = 'visible';
                            const tipContainer = popupNode.querySelector('.leaflet-popup-tip-container');
                            if(tipContainer) {
                                tipContainer.style.display = 'block';
                                tipContainer.style.visibility = 'visible';
                            }
                        }
                        btn.innerText = '_';
                    } else {
                        body.style.display = 'none';
                        titulo.style.display = 'none';
                        if(popupNode) {
                            const contentWrapper = popupNode.querySelector('.leaflet-popup-content-wrapper');
                            if(contentWrapper) contentWrapper.style.visibility = 'hidden';
                            const tipContainer = popupNode.querySelector('.leaflet-popup-tip-container');
                            if(tipContainer) tipContainer.style.display = 'none';
                        }
                        btn.innerText = '+';
                    }
                " style="background: none; border: none; font-weight: bold; cursor: pointer; font-size: 14px;" title="Minimizar/Maximizar">_</button>
                
                <button onclick="
                    const markerInstance = this.markerRef;
                    if(markerInstance) {
                        map.removeLayer(markerInstance);
                    }
                " style="background: none; border: none; font-weight: bold; cursor: pointer; font-size: 14px; color: #ff7675;" title="Cerrar">✕</button>
            </div>
        </div>
        <div id="bodySVContent">
            <button onclick="window.abrirStreetView(${finalLatLng.lat}, ${finalLatLng.lng})" style="margin-top:2px; width:100%; background:#0984e3; color:white; border:none; padding:6px; border-radius:4px; font-weight:bold; cursor:pointer; display: ${/* Reemplaza esta condición por la que detecta si tu panel 3D está abierto */ window.is3DPanelOpen ? 'none' : 'block'};">Abrir Vista</button>
        </div>
    </div>
`;
                marcadorStreetView.bindPopup(contenidoPopupSV, {autoClose: false, closeOnClick: false});

                marcadorStreetView.on('popupopen', function() {
                    const popupNode = this.getPopup().getElement();
                    if(popupNode) {
                        const closeButton = popupNode.querySelector('.leaflet-popup-close-button');
                        if(closeButton) closeButton.style.display = 'none';
                        const customCloseBtn = popupNode.querySelector('button[title="Cerrar"]');
                        if(customCloseBtn) customCloseBtn.markerRef = this;
                    }
                });

                marcadorStreetView.on('click', function() {
                    if (!this.isPopupOpen()) {
                        const popupNode = this.getPopup().getElement();
                        if (popupNode) {
                            const contentWrapper = popupNode.querySelector('.leaflet-popup-content-wrapper');
                            if (contentWrapper) contentWrapper.style.visibility = 'visible';
                            const tipContainer = popupNode.querySelector('.leaflet-popup-tip-container');
                            if (tipContainer) {
                                tipContainer.style.display = 'block';
                                tipContainer.style.visibility = 'visible';
                            }
                            const body = popupNode.querySelector('#bodySVContent');
                            const titulo = popupNode.querySelector('#tituloSVText');
                            const minBtn = popupNode.querySelector('button[title="Minimizar/Maximizar"]');
                            if (body) body.style.display = 'block';
                            if (titulo) titulo.style.display = 'inline';
                            if (minBtn) minBtn.innerText = '_';
                        }
                        this.openPopup();
                    }
                });

                marcadorStreetView.openPopup();
                window.abrirStreetView(finalLatLng.lat, finalLatLng.lng);
            }
        });
        
        return container;
    }
});
map.addControl(new StreetViewControl());


// ============================================================================
// ETAPA 4: HERRAMIENTAS GEODÉSICAS (CONVERSIÓN UTM / GMS / DD)
// ============================================================================

function latLonToUTM(lat, lon, zone = 17) {
    const a = 6378137;
    const e = 0.081819191;
    const k0 = 0.9996;

    const phi = lat * (Math.PI / 180);
    const lam = lon * (Math.PI / 180);
    const lam0 = (zone * 6 - 183) * (Math.PI / 180);

    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const tanPhi = Math.tan(phi);

    const N = a / Math.sqrt(1 - Math.pow(e * sinPhi, 2));
    const T = Math.pow(tanPhi, 2);
    const C = Math.pow(e * cosPhi, 2) / (1 - Math.pow(e, 2));
    const A = cosPhi * (lam - lam0);

    const M = a * (
        (1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256) * phi -
        (3 * Math.pow(e, 2) / 8 + 3 * Math.pow(e, 4) / 32 + 45 * Math.pow(e, 6) / 1024) * Math.sin(2 * phi) +
        (15 * Math.pow(e, 4) / 256 + 45 * Math.pow(e, 6) / 1024) * Math.sin(4 * phi) -
        (35 * Math.pow(e, 6) / 3072) * Math.sin(6 * phi)
    );

    const easting = k0 * N * (A + (1 - T + C) * Math.pow(A, 3) / 6 + (5 - 18 * T + Math.pow(T, 2) + 72 * C - 58 * Math.pow(e, 2)) * Math.pow(A, 5) / 120) + 500000;
    let northing = k0 * (M + N * tanPhi * (Math.pow(A, 2) / 2 + (5 - T + 9 * C + 4 * Math.pow(C, 2)) * Math.pow(A, 4) / 24 + (61 - 58 * T + Math.pow(T, 2) + 600 * C - 330 * Math.pow(e, 2)) * Math.pow(A, 6) / 720));

    if (lat < 0) northing += 10000000;

    return { easting: easting.toFixed(2), northing: northing.toFixed(2) };
}

function latLonToDMS(lat, lng) {
    function convert(coord, isLat) {
        const absolute = Math.abs(coord);
        const degrees = Math.floor(absolute);
        const minutesNotTruncated = (absolute - degrees) * 60;
        const minutes = Math.floor(minutesNotTruncated);
        const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);
        const direction = isLat ? (coord >= 0 ? "N" : "S") : (coord >= 0 ? "E" : "O");
        return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
    }
    return {
        latDMS: convert(lat, true),
        lngDMS: convert(lng, false)
    };
}

function dmsToDd(dmsStr) {
    const match = dmsStr.toString().trim().match(/(-?\d+)[^\d]+(\d+)[^\d]+([\d.]+)[^\d]*([NSEOW]?)/i);
    if(match) {
        let deg = parseFloat(match[1]);
        let min = parseFloat(match[2]);
        let sec = parseFloat(match[3]);
        let dir = match[4].toUpperCase();
        
        let dd = Math.abs(deg) + min / 60 + sec / 3600;
        if (deg < 0 || dir === 'S' || dir === 'W' || dir === 'O') {
            dd = -dd;
        }
        return dd;
    }
    const parts = dmsStr.toString().trim().replace(/[^\d.-]/g, ' ').replace(/\s+/g, ' ').trim().split(' ');
    if (parts.length >= 3) {
        let deg = parseFloat(parts[0]);
        let min = parseFloat(parts[1]);
        let sec = parseFloat(parts[2]);
        let sign = deg < 0 ? -1 : 1;
        return sign * (Math.abs(deg) + min / 60 + sec / 3600);
    }
    return parseFloat(dmsStr);
}

function utmToLatLon(easting, northing, zone = 17, northernHemisphere = true) {
    const a = 6378137;
    const e = 0.081819191;
    const k0 = 0.9996;
    const dx = easting - 500000;
    let dy = northing;
    if (!northernHemisphere) dy -= 10000000;
    
    const M = dy / k0;
    const mu = M / (a * (1 - Math.pow(e, 2)/4 - 3*Math.pow(e, 4)/64 - 5*Math.pow(e, 6)/256));
    const e1 = (1 - Math.sqrt(1 - Math.pow(e, 2))) / (1 + Math.sqrt(1 - Math.pow(e, 2)));
    const phi1 = mu + (3*e1/2 - 27*Math.pow(e1,3)/32)*Math.sin(2*mu) + (21*Math.pow(e1,2)/16 - 55*Math.pow(e1,4)/32)*Math.sin(4*mu) + (151*Math.pow(e1,3)/96)*Math.sin(6*mu);
    
    const N1 = a / Math.sqrt(1 - Math.pow(e*Math.sin(phi1), 2));
    const T1 = Math.pow(Math.tan(phi1), 2);
    const C1 = Math.pow(e*Math.cos(phi1), 2) / (1 - Math.pow(e, 2));
    const R1 = a * (1 - Math.pow(e, 2)) / Math.pow(1 - Math.pow(e*Math.sin(phi1), 2), 1.5);
    const D = dx / (N1 * k0);
    
    const lat = phi1 - (N1*Math.tan(phi1)/R1) * (Math.pow(D,2)/2 - (5 + 3*T1 + 10*C1 - 4*Math.pow(C1,2) - 9*Math.pow(e,2))*Math.pow(D,4)/24 + (61 + 90*T1 + 298*C1 + 45*Math.pow(T1,2) - 252*Math.pow(e,2) - 3*Math.pow(C1,2))*Math.pow(D,6)/720);
    const lon = (D - (1 + 2*T1 + C1)*Math.pow(D,3)/6 + (5 - 2*C1 + 28*T1 - 3*Math.pow(C1,2) + 8*Math.pow(e,2) + 24*Math.pow(T1,2))*Math.pow(D,5)/120) / Math.cos(phi1);
    const lonOrigin = (zone - 1) * 6 - 180 + 3;
    
    return {
        lat: lat * (180 / Math.PI),
        lng: lon * (180 / Math.PI) + lonOrigin
    };
}


// ============================================================================
// ETAPA 5: BARRAS INFERIORES DE LOCALIZACIÓN Y MAPPING DE COORDENADAS
// ============================================================================

window.listaMarcadoresCoordenadas = [];

function generarPopupCoordenadasHtml(lat, lng) {
    const tipoSeleccionado = document.getElementById('selectTipoCoord') ? document.getElementById('selectTipoCoord').value : 'dd';
    
    let textoCoordenadas = "";
    let textoClipboard = "";
    
    if (tipoSeleccionado === 'utm') {
        const utm = latLonToUTM(lat, lng, 17);
        textoCoordenadas = `<b>Este (X):</b> ${utm.easting}<br><b>Norte (Y):</b> ${utm.northing}<br><b>Zona:</b> 17N (WGS84)`;
        textoClipboard = `${utm.easting}, ${utm.northing}`;
    } else if (tipoSeleccionado === 'dms') {
        const dms = latLonToDMS(lat, lng);
        textoCoordenadas = `<b>Lat (GMS):</b> ${dms.latDMS}<br><b>Lon (GMS):</b> ${dms.lngDMS}`;
        textoClipboard = `${dms.latDMS}, ${dms.lngDMS}`;
    } else {
        const latF = lat.toFixed(6);
        const lngF = lng.toFixed(6);
        textoCoordenadas = `<b>Lat:</b> ${latF}<br><b>Lon:</b> ${lngF}`;
        textoClipboard = `${latF}, ${lngF}`;
    }

    return `
        <div id="popupCoordsContainer" style="font-family: sans-serif; font-size: 12px; min-width: 180px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 6px; position: relative;">
                <span id="tituloCoordsText" style="font-weight: bold;">📍 Coordenadas</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button onclick="
                        const body = document.getElementById('bodyCoordsContent');
                        const titulo = document.getElementById('tituloCoordsText');
                        const popupNode = this.closest('.leaflet-popup');
                        const btn = this;
                        
                        if(body.style.display === 'none') {
                            body.style.display = 'block';
                            titulo.style.display = 'inline';
                            if(popupNode) {
                                const contentWrapper = popupNode.querySelector('.leaflet-popup-content-wrapper');
                                if(contentWrapper) contentWrapper.style.visibility = 'visible';
                                const tipContainer = popupNode.querySelector('.leaflet-popup-tip-container');
                                if(tipContainer) {
                                    tipContainer.style.display = 'block';
                                    tipContainer.style.visibility = 'visible';
                                }
                            }
                            btn.innerText = '_';
                        } else {
                            body.style.display = 'none';
                            titulo.style.display = 'none';
                            if(popupNode) {
                                const contentWrapper = popupNode.querySelector('.leaflet-popup-content-wrapper');
                                if(contentWrapper) contentWrapper.style.visibility = 'hidden';
                                const tipContainer = popupNode.querySelector('.leaflet-popup-tip-container');
                                if(tipContainer) tipContainer.style.display = 'none';
                            }
                            btn.innerText = '+';
                        }
                    " style="background: none; border: none; font-weight: bold; cursor: pointer; font-size: 14px;" title="Minimizar/Maximizar">_</button>
                    
                    <button onclick="
                        const markerInstance = this.markerRef;
                        if(markerInstance) {
                            map.removeLayer(markerInstance);
                            const index = window.listaMarcadoresCoordenadas.indexOf(markerInstance);
                            if(index > -1) window.listaMarcadoresCoordenadas.splice(index, 1);
                        }
                    " style="background: none; border: none; font-weight: bold; cursor: pointer; font-size: 14px; color: #ff7675;" title="Cerrar">✕</button>
                </div>
            </div>
            <div id="bodyCoordsContent">
                ${textoCoordenadas}<br>
                <button onclick="navigator.clipboard.writeText('${textoClipboard}'); alert('Coordenadas copiadas al portapapeles');" style="margin-top:8px; width:100%; background:#0984e3; color:white; border:none; padding:6px; border-radius:4px; font-weight:bold; cursor:pointer;">📋 Copiar</button>
                
                <!-- Nota legal institucional -->
                <p style="font-size: 10px; color: #64748b; font-style: italic; margin-top: 8px; margin-bottom: 0; line-height: 1.3; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                    Nota: Coordenadas de carácter meramente informativo. No son válidas para trámites legales, jurídicos o de titulación en el Registro Público.
                </p>
            </div>
        </div>
    `;
}

// Marcador Interactivo Pin (Drag & Drop de Coordenadas)
const CoordsControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.marginTop = '5px';
        container.innerHTML = '<div style="background:white; padding:6px; cursor:pointer; font-size:16px; border-radius:4px; text-align:center;" title="Arrastra la paleta para obtener Coordenadas">📍</div>';
        L.DomEvent.disableClickPropagation(container);
        
        let dragging = false;
        let dragIcon = null;
        
        container.addEventListener('mousedown', function(e) {
            dragging = true;
            e.preventDefault();
            dragIcon = L.marker([map.getCenter().lat, map.getCenter().lng], { 
                icon: L.divIcon({ className: 'pegman-drag-icon', html: '<div style="font-size:26px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">📍</div>', iconSize: [30, 30] }) 
            }).addTo(map);
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!dragging || !dragIcon) return;
            const rect = map.getContainer().getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                const latlng = map.containerPointToLatLng([x, y]);
                dragIcon.setLatLng(latlng);
            }
        });
        
        document.addEventListener('mouseup', function(e) {
            if (!dragging) return;
            dragging = false;
            
            if (dragIcon) {
                map.removeLayer(dragIcon);
                dragIcon = null;
            }
            
            const rect = map.getContainer().getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const finalLatLng = map.containerPointToLatLng([x, y]);
                
                const marcadorCoord = L.marker(finalLatLng).addTo(map);
                
                marcadorCoord.latOriginal = finalLatLng.lat;
                marcadorCoord.lngOriginal = finalLatLng.lng;
                
                window.listaMarcadoresCoordenadas.push(marcadorCoord);
                
                const contenidoPopup = generarPopupCoordenadasHtml(finalLatLng.lat, finalLatLng.lng);
                marcadorCoord.bindPopup(contenidoPopup, {autoClose: false, closeOnClick: false});

                marcadorCoord.on('popupopen', function() {
                    const popupNode = this.getPopup().getElement();
                    if(popupNode) {
                        const closeButton = popupNode.querySelector('.leaflet-popup-close-button');
                        if(closeButton) closeButton.style.display = 'none';
                        const customCloseBtn = popupNode.querySelector('button[title="Cerrar"]');
                        if(customCloseBtn) customCloseBtn.markerRef = this;
                    }
                });

                marcadorCoord.openPopup();
            }
        });
        return container;
    }
});
map.addControl(new CoordsControl());

window.formatoCoordenadasPrevio = document.getElementById('selectTipoCoord') ? document.getElementById('selectTipoCoord').value : 'dd';

window.cambiarFormatoCoordenadas = function() {
    const select = document.getElementById('selectTipoCoord');
    if(!select) return;
    const tipo = select.value;
    const labelX = document.getElementById('labelX');
    const labelY = document.getElementById('labelY');
    const inputLong = document.getElementById('inputLong');
    const inputLat = document.getElementById('inputLat');

    if (inputLong && inputLat && inputLong.value.trim() !== "" && inputLat.value.trim() !== "") {
        let latOriginal, lngOriginal;
        let esValido = true;

        if (window.formatoCoordenadasPrevio === 'utm') {
            const x = parseFloat(inputLong.value);
            const y = parseFloat(inputLat.value);
            if (!isNaN(x) && !isNaN(y)) {
                const geo = utmToLatLon(x, y, 17, true);
                latOriginal = geo.lat;
                lngOriginal = geo.lng;
            } else esValido = false;
        } else if (window.formatoCoordenadasPrevio === 'dd') {
            lngOriginal = parseFloat(inputLong.value);
            latOriginal = parseFloat(inputLat.value);
            if (isNaN(lngOriginal) || isNaN(latOriginal)) esValido = false;
        } else if (window.formatoCoordenadasPrevio === 'dms') {
            lngOriginal = dmsToDd(inputLong.value);
            latOriginal = dmsToDd(inputLat.value);
            if (isNaN(lngOriginal) || isNaN(latOriginal)) esValido = false;
        }

        if (esValido && latOriginal !== undefined && lngOriginal !== undefined) {
            if (tipo === 'utm') {
                const utm = latLonToUTM(latOriginal, lngOriginal, 17);
                inputLong.value = utm.easting;
                inputLat.value = utm.northing;
            } else if (tipo === 'dd') {
                inputLong.value = lngOriginal.toFixed(6);
                inputLat.value = latOriginal.toFixed(6);
            } else if (tipo === 'dms') {
                const dms = latLonToDMS(latOriginal, lngOriginal);
                inputLong.value = dms.lngDMS;
                inputLat.value = dms.latDMS;
            }
        }
    }

    window.formatoCoordenadasPrevio = tipo;

    if (tipo === 'utm') {
        if(labelX) labelX.innerText = "Este:";
        if(labelY) labelY.innerText = "Norte:";
        if(inputLong) inputLong.placeholder = "Ej. 660000";
        if(inputLat) inputLat.placeholder = "Ej. 990000";
    } else if (tipo === 'dd') {
        if(labelX) labelX.innerText = "Long:";
        if(labelY) labelY.innerText = "Lat:";
        if(inputLong) inputLong.placeholder = "Ej. -79.90";
        if(inputLat) inputLat.placeholder = "Ej. 9.36";
    } else if (tipo === 'dms') {
        if(labelX) labelX.innerText = "Lon (GMS):";
        if(labelY) labelY.innerText = "Lat (GMS):";
        if(inputLong) inputLong.placeholder = "Ej. 79° 54' 10\" O";
        if(inputLat) inputLat.placeholder = "Ej. 9° 21' 46\" N";
    }

    if (window.listaMarcadoresCoordenadas && window.listaMarcadoresCoordenadas.length > 0) {
        window.listaMarcadoresCoordenadas.forEach(marker => {
            if (marker.latOriginal !== undefined && marker.lngOriginal !== undefined) {
                const nuevoHtml = generarPopupCoordenadasHtml(marker.latOriginal, marker.lngOriginal);
                marker.setPopupContent(nuevoHtml);
            }
        });
    }
};

window.irACoordenadasPersonalizadas = function() {
    const tipo = document.getElementById('selectTipoCoord').value;
    const valXStr = document.getElementById('inputLong').value.trim();
    const valYStr = document.getElementById('inputLat').value.trim();

    if (valXStr === "" || valYStr === "") {
        mostrarModalCoordenadas("Por favor, ingrese valores válidos en las coordenadas.");
        return;
    }

    const numX = parseFloat(valXStr);
    const numY = parseFloat(valYStr);
    const esNumeroPuro = !isNaN(numX) && !isNaN(numY);

    if (esNumeroPuro) {
        if (tipo === 'dd' && (Math.abs(numX) > 180 || Math.abs(numY) > 90 || Math.abs(numX) > 1000 || Math.abs(numY) > 1000)) {
            mostrarModalCoordenadas("⚠️ Verifique coordenadas: Los valores ingresados no parecen corresponder al sistema de coordenadas seleccionado.");
            return;
        }
        if (tipo === 'utm' && Math.abs(numX) <= 180 && Math.abs(numY) <= 90) {
            mostrarModalCoordenadas("⚠️ Verifique coordenadas: Los valores ingresados no parecen corresponder al sistema de coordenadas seleccionado.");
            return;
        }
    }

    let latFinal, lngFinal;
    if (tipo === 'utm') {
        const valX = parseFloat(valXStr);
        const valY = parseFloat(valYStr);
        if (isNaN(valX) || isNaN(valY)) {
            mostrarModalCoordenadas("Por favor, ingrese valores numéricos válidos en las coordenadas.");
            return;
        }
        const geo = utmToLatLon(valX, valY, 17, true);
        latFinal = geo.lat;
        lngFinal = geo.lng;
    } else if (tipo === 'dms') {
        lngFinal = dmsToDd(valXStr);
        latFinal = dmsToDd(valYStr);
    } else {
        lngFinal = parseFloat(valXStr);
        latFinal = parseFloat(valYStr);
    }

    if (!isNaN(latFinal) && !isNaN(lngFinal) && latFinal >= -90 && latFinal <= 90 && lngFinal >= -180 && lngFinal <= 180) {
        map.setView([latFinal, lngFinal], 18);
        L.marker([latFinal, lngFinal]).addTo(map).bindPopup("Coordenada buscada").openPopup();
    } else {
        mostrarModalCoordenadas("⚠️ Verifique coordenadas: Los valores ingresados no parecen corresponder al sistema de coordenadas seleccionado.");
    }
};

['inputLat', 'inputLong'].forEach(id => {
    const elem = document.getElementById(id);
    if(elem) {
        elem.addEventListener('keypress', function(e) {
            if(e.key === 'Enter') { irACoordenadasPersonalizadas(); }
        });
    }
});


// ============================================================================
// ETAPA 6: MODAL DE ALERTA DE ERRORES DE COORDENADAS Y MENSAJES DEL SISTEMA
// ============================================================================

window.mostrarModalCoordenadas = function(mensaje) {
    const modal = document.getElementById('customModalCoord');
    const msgEl = document.getElementById('customModalCoordMsg');
    if (msgEl && mensaje) {
        msgEl.innerText = mensaje;
    }
    if (modal) {
        modal.style.display = 'flex';
    }
};

window.cerrarModalCoordenadas = function() {
    const modal = document.getElementById('customModalCoord');
    if (modal) {
        modal.style.display = 'none';
    }
};

function mostrarAlertaCatastro(mensaje, tipo) {
    const alertaDiv = document.getElementById('alertaCatastro');
    if (alertaDiv) {
        alertaDiv.style.display = 'block';
        alertaDiv.innerText = mensaje;
        alertaDiv.style.backgroundColor = tipo === 'error' ? '#ff7675' : '#55efc4';
        setTimeout(() => { alertaDiv.style.display = 'none'; }, 5000);
    }
}

function mostrarAlertaPlano(mensaje, tipo) {
    const alertaDiv = document.getElementById('alertaPlano');
    if (alertaDiv) {
        alertaDiv.style.display = 'block';
        alertaDiv.innerText = mensaje;
        alertaDiv.style.backgroundColor = tipo === 'error' ? '#ff7675' : '#55efc4';
        setTimeout(() => { alertaDiv.style.display = 'none'; }, 5000);
    }
}


// ============================================================================
// ETAPA 7: MÓDULO LATERAL "GESTIÓN CATASTRAL" (BÚSQUEDA DE FINCAS / CONSULTAR)
// ============================================================================

window.buscarCatastro = function() {
    const finca = document.getElementById('inputFinca') ? document.getElementById('inputFinca').value.trim().replace(/'/g, "''") : '';
    const tomo = document.getElementById('inputTomo') ? document.getElementById('inputTomo').value.trim().replace(/'/g, "''") : '';
    const folio = document.getElementById('inputFolio') ? document.getElementById('inputFolio').value.trim().replace(/'/g, "''") : '';
    const ubicacion = document.getElementById('inputUbicacion') ? document.getElementById('inputUbicacion').value.trim().replace(/'/g, "''") : '';
    const propietario = document.getElementById('inputPropietario') ? document.getElementById('inputPropietario').value.trim().replace(/'/g, "''") : '';

    const condiciones = [];
    if(finca) condiciones.push(!isNaN(finca) ? `finca = ${finca}` : `finca ILIKE '%${finca}%'`);
    if(tomo) condiciones.push(!isNaN(tomo) ? `tomo = ${tomo}` : `tomo ILIKE '%${tomo}%'`);
    if(folio) condiciones.push(!isNaN(folio) ? `folio = ${folio}` : `folio ILIKE '%${folio}%'`);
    if(ubicacion) condiciones.push(!isNaN(ubicacion) ? `codigo_ubicacion = ${ubicacion}` : `codigo_ubicacion ILIKE '%${ubicacion}%'`);
    if(propietario) condiciones.push(`propietario ILIKE '%${propietario}%'`);

    if(condiciones.length === 0) {
        mostrarAlertaCatastro("Sin coincidencias. Verifique los datos e intente nuevamente.", "error");
        return;
    }

    const cqlFiltro = condiciones.join(" AND ");
    const wfsFincasUrl = `http://localhost:8080/geoserver/PROPANAMA/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=PROPANAMA:fincas&srsName=EPSG:4326&outputFormat=application/json&CQL_FILTER=${encodeURIComponent(cqlFiltro)}`;
    const wfsCatastroUrl = `http://localhost:8080/geoserver/PROPANAMA/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=PROPANAMA:catastralesc3&srsName=EPSG:4326&outputFormat=application/json&CQL_FILTER=${encodeURIComponent(cqlFiltro)}`;

    fetch(wfsFincasUrl)
        .then(res => res.json())
        .then(dataFincas => {
            if(dataFincas.features && dataFincas.features.length > 0) {
                if(capaSeleccionadaGeoJSON) map.removeLayer(capaSeleccionadaGeoJSON);
                capaSeleccionadaGeoJSON = L.geoJSON(dataFincas, { 
                    style: { color: '#0984e3', weight: 6, fillOpacity: 0.5 } 
                });
                configurarClickAtributos(capaSeleccionadaGeoJSON, 'fincas');
                capaSeleccionadaGeoJSON.addTo(map);
                centrarEnGeometria(capaSeleccionadaGeoJSON);
                
                const total = dataFincas.features.length;
                const msjExito = total === 1 
                    ? "¡Búsqueda exitosa: 1 finca localizada!" 
                    : `¡Búsqueda exitosa: ${total} fincas localizadas!`;
                mostrarAlertaCatastro(msjExito, "success");
            } else {
                return fetch(wfsCatastroUrl)
                    .then(resCat => resCat.json())
                    .then(dataCat => {
                        if(dataCat.features && dataCat.features.length > 0) {
                            if(capaSeleccionadaGeoJSON) map.removeLayer(capaSeleccionadaGeoJSON);
                            capaSeleccionadaGeoJSON = L.geoJSON(dataCat, { 
                                style: { color: '#00cec9', weight: 6, fillOpacity: 0.5 } 
                            });
                            configurarClickAtributos(capaSeleccionadaGeoJSON, 'catastro');
                            capaSeleccionadaGeoJSON.addTo(map);
                            centrarEnGeometria(capaSeleccionadaGeoJSON);
                            
                            const total = dataCat.features.length;
                            const msjExito = total === 1 
                                ? "¡Búsqueda exitosa: 1 finca localizada!" 
                                : `¡Búsqueda exitosa: ${total} fincas localizadas!`;
                            mostrarAlertaCatastro(msjExito, "success");
                        } else {
                            mostrarAlertaCatastro("Sin coincidencias. Verifique los datos e intente nuevamente.", "error");
                        }
                    });
            }
        })
        .catch(err => {
            console.error("Error Catastro WFS:", err);
            mostrarAlertaCatastro("Sin coincidencias. Verifique los datos e intente nuevamente.", "error");
        });
};

// Función global para limpiar campos y desmarcar objetos en el mapa
window.limpiarFiltroCatastro = function() {
    ['inputFinca', 'inputTomo', 'inputFolio', 'inputUbicacion', 'inputPropietario'].forEach(id => {
        const elem = document.getElementById(id);
        if(elem) elem.value = '';
    });

    const alerta = document.getElementById('alertaCatastro');
    if(alerta) {
        alerta.style.display = 'none';
        alerta.innerHTML = '';
    }

    if(typeof capaSeleccionadaGeoJSON !== 'undefined' && capaSeleccionadaGeoJSON) {
        map.removeLayer(capaSeleccionadaGeoJSON);
        capaSeleccionadaGeoJSON = null;
    }

    if(typeof capaClicTemporal !== 'undefined' && capaClicTemporal) {
        map.removeLayer(capaClicTemporal);
        capaClicTemporal = null;
    }

    const panelAttr = document.getElementById('attributeFloatingPanel');
    if(panelAttr) panelAttr.style.display = 'none';

    const sugerencias = document.querySelectorAll('.sugerencias-dropdown');
    sugerencias.forEach(el => el.style.display = 'none');
};

// Asignación de eventos 'Enter' a los inputs del formulario catastral
['inputFinca', 'inputTomo', 'inputFolio', 'inputUbicacion', 'inputPropietario'].forEach(id => {
    const elem = document.getElementById(id);
    if(elem) {
        elem.addEventListener('keypress', function(e) {
            if(e.key === 'Enter') {
                buscarCatastro();
            }
        });
    }
});

// Enlace diferido al cargar el DOM para asegurar la captura del botón por su ID
document.addEventListener('DOMContentLoaded', function() {
    const btnLimpiar = document.getElementById('btnLimpiarCatastro');
    if(btnLimpiar) {
        btnLimpiar.addEventListener('click', window.limpiarFiltroCatastro);
    }
});


// ============================================================================
// ETAPA 8: MÓDULO LATERAL "CONSULTA DE PLANOS" Y AUTOCOMPLETADO
// ============================================================================

let capaSeleccionadaGeoJSON = null;

const RUTA_CATASTRO = "file:///C:/Users/leisi/OneDrive/Documentos/ArcGIS/Projects/MAPOTECA%20VIRTUAL/CIUDAD%20DE%20COLON/"; 
const RUTA_FINCAS = "file:///C:/Users/leisi/OneDrive/Documentos/ArcGIS/Projects/MAPOTECA%20VIRTUAL/PLANOS%20PARA%20PROYECTO/BARRIO%20NORTE/";

function centrarEnGeometria(capaGeoJSON) {
    try { map.fitBounds(capaGeoJSON.getBounds(), { padding: [50, 50], maxZoom: 18 }); } catch (e) { console.error(e); }
}

window.mostrarPlanoYResaltarGeo = function(nombreArchivo) {
    const imgElement = document.getElementById('planoImg');
    const placeholder = document.getElementById('textoPlanoPlaceholder');
    const numeroPlano = nombreArchivo.replace(/\.[^/.]+$/, "").trim();
    const numeroSeguro = numeroPlano.replace(/'/g, "''"); 
    
    if(imgElement && placeholder) {
        imgElement.style.display = 'none';
        placeholder.style.display = 'block';
        placeholder.innerText = "Cargando plano...";
    }

    const filtro = `plano ILIKE '%${numeroSeguro}%' OR imagen ILIKE '%${numeroSeguro}%'`;
    const wfsFincasUrl = `http://localhost:8080/geoserver/PROPANAMA/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=PROPANAMA:fincas&srsName=EPSG:4326&outputFormat=application/json&CQL_FILTER=${encodeURIComponent(filtro)}`;
    const wfsCatastroUrl = `http://localhost:8080/geoserver/PROPANAMA/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=PROPANAMA:catastralesc3&srsName=EPSG:4326&outputFormat=application/json&CQL_FILTER=${encodeURIComponent(filtro)}`;

    fetch(wfsFincasUrl)
        .then(res => res.json())
        .then(dataFincas => {
            if(dataFincas.features && dataFincas.features.length > 0) {
                if(capaSeleccionadaGeoJSON) map.removeLayer(capaSeleccionadaGeoJSON);
                capaSeleccionadaGeoJSON = L.geoJSON(dataFincas, { 
                    style: { color: '#ff007f', weight: 6, fillOpacity: 0.5 } 
                });
                configurarClickAtributos(capaSeleccionadaGeoJSON, 'fincas');
                capaSeleccionadaGeoJSON.addTo(map);
                centrarEnGeometria(capaSeleccionadaGeoJSON);
                
                if(imgElement && placeholder) {
                    imgElement.src = RUTA_FINCAS + numeroPlano + ".jpg";
                    imgElement.style.cursor = "pointer";
                    imgElement.title = "Haz clic para abrir el plano a pantalla completa";
                    imgElement.onclick = function() { window.open(imgElement.src, '_blank'); };
                    imgElement.onload = function() { placeholder.style.display = 'none'; imgElement.style.display = 'block'; };
                    imgElement.onerror = function() {
                        imgElement.style.display = 'none';
                        placeholder.style.display = 'block';
                        placeholder.innerHTML = `⚠️ Imagen no hallada en Fincas para: <br><b>${numeroPlano}</b>`;
                    };
                }
                mostrarAlertaPlano("Predio localizado en Fincas: " + numeroPlano, "success");
            } else {
                return fetch(wfsCatastroUrl)
                    .then(resCat => resCat.json())
                    .then(dataCat => {
                        if(dataCat.features && dataCat.features.length > 0) {
                            if(capaSeleccionadaGeoJSON) map.removeLayer(capaSeleccionadaGeoJSON);
                            capaSeleccionadaGeoJSON = L.geoJSON(dataCat, { 
                                style: { color: '#00cec9', weight: 6, fillOpacity: 0.5 } 
                            });
                            configurarClickAtributos(capaSeleccionadaGeoJSON, 'catastro');
                            capaSeleccionadaGeoJSON.addTo(map);
                            centrarEnGeometria(capaSeleccionadaGeoJSON);
                            
                            if(imgElement && placeholder) {
                                imgElement.src = RUTA_CATASTRO + numeroPlano + ".jpg";
                                imgElement.style.cursor = "pointer";
                                imgElement.title = "Haz clic para abrir el plano a pantalla completa";
                                imgElement.onclick = function() { window.open(imgElement.src, '_blank'); };
                                imgElement.onload = function() { placeholder.style.display = 'none'; imgElement.style.display = 'block'; };
                                imgElement.onerror = function() {
                                    imgElement.style.display = 'none';
                                    placeholder.style.display = 'block';
                                    placeholder.innerHTML = `⚠️ Imagen no hallada en Catastro para: <br><b>${numeroPlano}</b>`;
                                };
                            }
                            mostrarAlertaPlano("Predio localizado en Catastro: " + numeroPlano, "success");
                        } else {
                            if(imgElement && placeholder) {
                                imgElement.style.display = 'none';
                                placeholder.style.display = 'block';
                                placeholder.innerHTML = `⚠️ No se encontró coincidencia para: <br><b>${numeroPlano}</b>`;
                            }
                            mostrarAlertaPlano("⚠️ No se encontró coincidencia para: " + numeroPlano, "error");
                        }
                    });
            }
        })
        .catch(err => {
            console.error("Error WFS:", err);
            mostrarAlertaPlano("Error de conexión al servidor", "error");
        });
};

function setupPlanoAutocomplete() {
    const input = document.getElementById('inputPlanoSearch');
    const lista = document.getElementById('listaSugerenciasPlanos');
    if(!input || !lista) return;

    input.addEventListener('input', function() {
        const valorOriginal = this.value.trim();
        const valorSeguro = valorOriginal.replace(/'/g, "''");
        lista.innerHTML = '';
        
        if(valorSeguro.length < 1) { 
            lista.style.display = 'none'; 
            
            const imgElement = document.getElementById('planoImg');
            const placeholder = document.getElementById('textoPlanoPlaceholder');
            
            if(imgElement && placeholder) {
                imgElement.style.display = 'none';
                imgElement.src = '';
                placeholder.style.display = 'block';
                placeholder.innerText = "Vista previa del plano";
            }

            if(capaSeleccionadaGeoJSON) {
                map.removeLayer(capaSeleccionadaGeoJSON);
                capaSeleccionadaGeoJSON = null;
            }
            return; 
        }

        const filtro = `plano ILIKE '%${valorSeguro}%' OR imagen ILIKE '%${valorSeguro}%'`;
        const wfsCatastroUrl = `http://localhost:8080/geoserver/PROPANAMA/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=PROPANAMA:catastralesc3&srsName=EPSG:4326&outputFormat=application/json&maxFeatures=10&CQL_FILTER=${encodeURIComponent(filtro)}`;
        const wfsFincasUrl = `http://localhost:8080/geoserver/PROPANAMA/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=PROPANAMA:fincas&srsName=EPSG:4326&outputFormat=application/json&maxFeatures=10&CQL_FILTER=${encodeURIComponent(filtro)}`;

        Promise.all([
            fetch(wfsCatastroUrl).then(res => res.json()).catch(() => ({features: []})),
            fetch(wfsFincasUrl).then(res => res.json()).catch(() => ({features: []}))
        ])
        .then(([dataCat, dataFincas]) => {
            lista.innerHTML = '';
            const planosEncontrados = [];

            [dataCat, dataFincas].forEach(dataset => {
                if(dataset.features && dataset.features.length > 0) {
                    dataset.features.forEach(f => {
                        const p = f.properties || {};
                        const valPlano = p.plano || p.PLANO || p.imagen || p.IMAGEN || '';
                        if(valPlano) {
                            const partes = String(valPlano).replace(/\\/g, '/').split('/');
                            const ultimoSegmento = partes[partes.length - 1] || '';
                            const nombreLimpio = ultimoSegmento.replace(/\.[^/.]+$/, "").trim();
                            if(nombreLimpio && !planosEncontrados.includes(nombreLimpio)) {
                                planosEncontrados.push(nombreLimpio);
                            }
                        }
                    });
                }
            });

            if(planosEncontrados.length > 0) {
                lista.style.display = 'block';
                planosEncontrados.forEach(numPlano => {
                    const li = document.createElement('li');
                    li.innerText = numPlano;
                    li.style.cssText = "padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; background: #fff; list-style: none;";
                    
                    li.onmouseover = () => { li.style.background = "#f1f2f6"; };
                    li.onmouseout = () => { li.style.background = "#fff"; };
                    
                    li.onclick = () => { 
                        input.value = numPlano; 
                        lista.style.display = 'none'; 
                        mostrarPlanoYResaltarGeo(numPlano + ".jpg"); 
                    };
                    lista.appendChild(li);
                });
            } else {
                lista.style.display = 'none';
            }
        })
        .catch(err => {
            console.error("Error en autocompletado WFS:", err);
            lista.style.display = 'none';
        });
    });

    document.addEventListener('click', function(e) {
        if(!input.contains(e.target) && !lista.contains(e.target)) {
            lista.style.display = 'none';
        }
    });

    input.addEventListener('keypress', function(e) {
        if(e.key === 'Enter') {
            lista.style.display = 'none';
            buscarPlanoManual();
        }
    });
}
setupPlanoAutocomplete();

window.buscarPlanoManual = function() {
    const input = document.getElementById('inputPlanoSearch');
    if(input && input.value.trim() !== "") {
        const val = input.value.trim();
        mostrarPlanoYResaltarGeo(val.endsWith(".jpg") ? val : val + ".jpg");
    }
};


// ============================================================================
// ETAPA 9: INTERACCIÓN CON EL MAPA Y PANEL FLOTANTE DE ATRIBUTOS PREDIALES
// ============================================================================

function configurarClickAtributos(capaGeoJSON, tipoCapaOrigen = 'fincas') {
    capaGeoJSON.eachLayer(function(layer) {
        layer.on('click', function(e) {
            if (e.originalEvent) {
                L.DomEvent.stopPropagation(e.originalEvent);
            }

            const props = e.target.feature.properties || {};
            
            const finca = (props.finca !== undefined && props.finca !== null && props.finca !== '') ? props.finca : '-';
            const tomo = (props.tomo !== undefined && props.tomo !== null && props.tomo !== '') ? props.tomo : '-';
            const folio = (props.folio !== undefined && props.folio !== null && props.folio !== '') ? props.folio : '-';
            const codUbicacion = (props.codigo_ubicacion !== undefined && props.codigo_ubicacion !== null && props.codigo_ubicacion !== '') ? props.codigo_ubicacion : '-';
            const propietario = (props.propietario !== undefined && props.propietario !== null && props.propietario !== '') ? props.propietario : '-';
            
            let planoVal = props.plano !== undefined && props.plano !== null ? props.plano : (props.imagen !== undefined && props.imagen !== null ? props.imagen : '-');
            
            let nombrePlanoLimpio = '-';
            if (planoVal !== '-') {
                const partes = String(planoVal).replace(/\\/g, '/').split('/');
                nombrePlanoLimpio = partes[partes.length - 1];
            }
            
            const superficie = (props.superficie !== undefined && props.superficie !== null && props.superficie !== '') ? props.superficie : '-';
            
            let centroide;
            if (typeof e.target.getBounds === 'function') {
                centroide = e.target.getBounds().getCenter();
            } else if (typeof e.target.getLatLng === 'function') {
                centroide = e.target.getLatLng();
            } else {
                centroide = e.latlng;
            }

            const rutaBase = (tipoCapaOrigen === 'catastro') ? RUTA_CATASTRO : RUTA_FINCAS;

            const contenidoHtml = `
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px;">
                    <tr style="border-bottom: 1px solid #dfe6e9;">
                        <td style="padding: 6px; font-weight: bold; color: #2d3436; background: #f1f2f6; width: 40%;">FINCA</td>
                        <td style="padding: 6px; color: #636e72; width: 60%; background: #fff;">${finca}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dfe6e9;">
                        <td style="padding: 6px; font-weight: bold; color: #2d3436; background: #f1f2f6;">TOMO</td>
                        <td style="padding: 6px; color: #636e72; background: #fff;">${tomo}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dfe6e9;">
                        <td style="padding: 6px; font-weight: bold; color: #2d3436; background: #f1f2f6;">FOLIO</td>
                        <td style="padding: 6px; color: #636e72; background: #fff;">${folio}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dfe6e9;">
                        <td style="padding: 6px; font-weight: bold; color: #2d3436; background: #f1f2f6; font-size: 11px;">COD_UBICACION</td>
                        <td style="padding: 6px; color: #636e72; background: #fff;">${codUbicacion}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dfe6e9;">
                        <td style="padding: 6px; font-weight: bold; color: #2d3436; background: #f1f2f6;">PROPIETARIO</td>
                        <td style="padding: 6px; color: #636e72; background: #fff; word-break: break-all;">${propietario}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dfe6e9;">
                        <td style="padding: 6px; font-weight: bold; color: #2d3436; background: #f1f2f6;">PLANO</td>
                        <td style="padding: 6px; color: #636e72; background: #fff; word-break: break-all;">${nombrePlanoLimpio}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #dfe6e9;">
                        <td style="padding: 6px; font-weight: bold; color: #2d3436; background: #f1f2f6;">SUPERFICIE</td>
                        <td style="padding: 6px; color: #636e72; background: #fff;">${superficie}</td>
                    </tr>
                </table>

                <button onclick="window.abrirStreetView(${centroide.lat}, ${centroide.lng})" style="width: 100%; background: #e67e22; color: white; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); margin-bottom: 12px;">
                    🚗 Ver Navegación 3D
                </button>

                <div style="text-align: center; font-weight: bold; color: #2d3436; margin-bottom: 6px; border-top: 1px solid #dfe6e9; padding-top: 8px;">
                    Vista del Plano:
                </div>
                <div style="width: 100%; background: #f8f9fa; border: 1px solid #dfe6e9; border-radius: 4px; overflow: hidden; min-height: 150px; display: flex; align-items: center; justify-content: center;">
                    ${nombrePlanoLimpio !== '-' ? `
                        <img src="${rutaBase}${nombrePlanoLimpio.endsWith('.jpg') ? nombrePlanoLimpio : nombrePlanoLimpio + '.jpg'}" 
                             style="width: 100%; cursor: pointer; display: block;" 
                             title="Haz clic para abrir a pantalla completa" 
                             onclick="window.open(this.src, '_blank')"
                             onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';" />
                        <div style="display: none; padding: 15px; font-size: 11px; color: #d63031;">⚠️ Imagen no hallada para: <br><b>${nombrePlanoLimpio}</b></div>
                    ` : `
                        <span style="font-size: 11px; color: #b2bec3; padding: 15px;">No hay plano asociado</span>
                    `}
                </div>
            `;

            const panel = document.getElementById('attributeFloatingPanel');
            const bodyContent = document.getElementById('attributePanelBody');
            if (panel && bodyContent) {
                bodyContent.innerHTML = contenidoHtml;
                panel.style.display = 'block';
            }
        });
    });
}

let capaClicTemporal = null;

// Consulta espacial WFS al hacer clic directo sobre cualquier punto del mapa
map.on('click', function(e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    const offset = 0.00001;
    const bbox = `${lng - offset},${lat - offset},${lng + offset},${lat + offset},EPSG:4326`;

    const urlFincas = `http://localhost:8080/geoserver/PROPANAMA/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=PROPANAMA:fincas&srsName=EPSG:4326&outputFormat=application/json&bbox=${bbox}`;
    const urlCatastro = `http://localhost:8080/geoserver/PROPANAMA/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=PROPANAMA:catastralesc3&srsName=EPSG:4326&outputFormat=application/json&bbox=${bbox}`;

    Promise.all([
        fetch(urlFincas).then(res => res.json()).catch(() => ({ features: [] })),
        fetch(urlCatastro).then(res => res.json()).catch(() => ({ features: [] }))
    ])
    .then(([dataFincas, dataCat]) => {
        let featureEncontrada = null;
        let tipoCapa = '';

        if (dataFincas.features && dataFincas.features.length > 0) {
            featureEncontrada = dataFincas.features[0];
            tipoCapa = 'fincas';
        } else if (dataCat.features && dataCat.features.length > 0) {
            featureEncontrada = dataCat.features[0];
            tipoCapa = 'catastro';
        }

        if (featureEncontrada) {
            if (capaClicTemporal) {
                map.removeLayer(capaClicTemporal);
            }

            capaClicTemporal = L.geoJSON(featureEncontrada, {
                style: {
                    color: tipoCapa === 'fincas' ? '#0984e3' : '#00cec9',
                    weight: 3,
                    fillOpacity: 0.2
                }
            });

            configurarClickAtributos(capaClicTemporal, tipoCapa);
            capaClicTemporal.addTo(map);

            capaClicTemporal.eachLayer(function(layer) {
                layer.fire('click', { latlng: e.latlng });
            });
        }
    })
    .catch(err => {
        console.error("Error al consultar atributos por clic en mapa:", err);
    });
});


// ============================================================================
// ETAPA 10: MANEJO DEL PANEL FLOTANTE DE ATRIBUTOS (DRAG & DROP Y BOTÓN CERRAR)
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const panel = document.getElementById('attributeFloatingPanel');
    const header = document.getElementById('attributePanelHeader');
    const closeBtn = document.getElementById('closeAttributeBtn');

    if (panel) {
        L.DomEvent.disableClickPropagation(panel);
        L.DomEvent.disableScrollPropagation(panel);
    }

    if (closeBtn && panel) {
        const cerrarPanel = function(e) {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
                if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            }
            panel.style.display = 'none';
        };

        closeBtn.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });
        
        closeBtn.addEventListener('click', cerrarPanel);
    }

    if (panel && header) {
        let isDragging = false;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;

        header.addEventListener('mousedown', function(e) {
            if (e.target.closest('#closeAttributeBtn')) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = panel.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            panel.style.position = 'fixed';
            panel.style.left = initialLeft + 'px';
            panel.style.top = initialTop + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.style.transform = 'none';

            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            panel.style.left = (initialLeft + dx) + 'px';
            panel.style.top = (initialTop + dy) + 'px';
        });

        document.addEventListener('mouseup', function() {
            isDragging = false;
        });
    }
});