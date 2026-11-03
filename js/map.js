// ============================================================================
// ETAPA 1: CONFIGURACIÓN INICIAL DEL MAPA BASE Y VARIABLES GLOBALES
// ============================================================================

let datosFincasGlobal = null;
let datosCatastroGlobal = null;
let capaFincasLeaflet = null;
let capaCatastroLeaflet = null;
let capaSeleccionadaGeoJSON = null;
let capaClicTemporal = null;

const RUTA_PLANOS = 'planos/';

const map = L.map("map", {
    center: [9.3615, -79.9010],
    zoom: 15.7,
    zoomControl: false
});

L.control.zoom({
    position: 'bottomright'
}).addTo(map);

const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
});

const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: 'Tiles &copy; Esri'
});

osmLayer.addTo(map);

const baseMaps = { 
    "OpenStreetMap (Humanitario)": osmLayer,
    "Satélite (Esri)": satelliteLayer
};
const overlayMaps = {};
const layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);


// ============================================================================
// ETAPA 1.5: CARGA, CONVERSIÓN UTM Y ENFOQUE AUTOMÁTICO DE DATOS ARCGIS
// ============================================================================

document.addEventListener("DOMContentLoaded", function() {

    // Definir la proyección UTM Zona 17N (utilizada en Panamá) y WGS84
    proj4.defs("EPSG:32617", "+proj=utm +zone=17 +datum=WGS84 +units=m +no_defs");

    // Función para transformar coordenadas de metros a grados y adaptar a Leaflet
    function adaptarFormatoArcGIS(rawData) {
        if (!rawData) return { type: "FeatureCollection", features: [] };

        const featuresConvertidas = (rawData.features || []).map(f => {
            let geometriaConvertida = null;

            if (f.geometry && f.geometry.rings) {
                // Transformar cada anillo de coordenadas UTM [X, Y] a [Longitud, Latitud]
                const ringsTransformados = f.geometry.rings.map(ring => {
                    return ring.map(coord => {
                        // Si los números son grandes (> 180 o > 90), asumimos que son metros (UTM)
                        if (Math.abs(coord[0]) > 180 || Math.abs(coord[1]) > 90) {
                            const conv = proj4("EPSG:32617", "EPSG:4326", [coord[0], coord[1]]);
                            return [conv[0], conv[1]]; // [Longitud, Latitud]
                        }
                        return coord;
                    });
                });

                geometriaConvertida = {
                    type: "Polygon",
                    coordinates: ringsTransformados
                };
            }

            return {
                type: "Feature",
                properties: f.attributes || f.properties || {},
                geometry: geometriaConvertida
            };
        });

        return { type: "FeatureCollection", features: featuresConvertidas };
    }

    // 1. Cargar Fincas
    fetch('FINCAS.json')
        .then(res => {
            if (!res.ok) throw new Error("No se pudo cargar FINCAS.json");
            return res.json();
        })
        .then(rawData => {
            const dataLimpia = adaptarFormatoArcGIS(rawData);
            datosFincasGlobal = dataLimpia;
            
            capaFincasLeaflet = L.geoJSON(dataLimpia, {
                style: { color: '#e67e22', weight: 2, fillOpacity: 0.3 }, // Estilo anaranjado
                onEachFeature: function(feature, layer) {
                    configurarClickAtributos(layer, 'fincas');
                }
            }).addTo(map);
            
            layerControl.addOverlay(capaFincasLeaflet, "Fincas");

            // Centrar y hacer zoom automáticamente sobre las fincas convertidas
            if (capaFincasLeaflet.getLayers().length > 0) {
                map.fitBounds(capaFincasLeaflet.getBounds());
            }
        })
        .catch(err => console.error("Error en FINCAS:", err));

    // 2. Cargar Catastro
    fetch('CATASTRALESC3.json')
        .then(res => {
            if (!res.ok) throw new Error("No se pudo cargar CATASTRALESC3.json");
            return res.json();
        })
        .then(rawData => {
            const dataLimpia = adaptarFormatoArcGIS(rawData);
            datosCatastroGlobal = dataLimpia;
            
            capaCatastroLeaflet = L.geoJSON(dataLimpia, {
                style: { color: '#00cec9', weight: 2, fillOpacity: 0.3 }, // Estilo celeste/turquesa
                onEachFeature: function(feature, layer) {
                    configurarClickAtributos(layer, 'catastro');
                }
            }).addTo(map);
            
            layerControl.addOverlay(capaCatastroLeaflet, "Catastrales C3");
        })
        .catch(err => console.error("Error en Catastro:", err));
});

// ============================================================================
// ETAPA 2: INTEGRACIÓN DEL MODO OSCURO (DARK THEME)
// ============================================================================

document.addEventListener("DOMContentLoaded", function() {
    const darkThemeToggle = document.getElementById("darkThemeToggle");

    if (darkThemeToggle) {
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

const NorthArrowControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'custom-north-control');
        container.style.marginTop = '5px';
        container.style.marginLeft = '5px';
        container.innerHTML = `
            <div title="Orientación Norte" style="width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #cccccc; border-radius: 50%; cursor: pointer; box-shadow: 0 3px 8px rgba(0,0,0,0.25);">
                <span style="font-size:12px; font-weight:bold; color:#ff0000;">N</span>
            </div>
        `;
        L.DomEvent.disableClickPropagation(container);
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

const StreetViewControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.innerHTML = '<div style="background:white; padding:6px; cursor:grab; font-size:16px; border-radius:4px; text-align:center;" title="Arrastra el carro al mapa">🚗</div>';
        L.DomEvent.disableClickPropagation(container);
        
        let dragging = false;
        let dragIcon = null;
        
        container.addEventListener('mousedown', function(e) {
            dragging = true;
            e.preventDefault();
            dragIcon = L.marker(map.getCenter(), { 
                icon: L.divIcon({ html: '<div style="font-size:26px;">🚗</div>', iconSize: [30, 30] }) 
            }).addTo(map);
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!dragging || !dragIcon) return;
            const rect = map.getContainer().getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                dragIcon.setLatLng(map.containerPointToLatLng([x, y]));
            }
        });
        
        document.addEventListener('mouseup', function(e) {
            if (!dragging) return;
            dragging = false;
            if (dragIcon) { map.removeLayer(dragIcon); dragIcon = null; }
            
            const rect = map.getContainer().getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                const finalLatLng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);
                window.abrirStreetView(finalLatLng.lat, finalLatLng.lng);
            }
        });
        return container;
    }
});
map.addControl(new StreetViewControl());


// ============================================================================
// ETAPA 4: HERRAMIENTAS GEODÉSICAS (UTM / GMS / DD)
// ============================================================================

function latLonToUTM(lat, lon, zone = 17) {
    const a = 6378137; const e = 0.081819191; const k0 = 0.9996;
    const phi = lat * (Math.PI / 180); const lam = lon * (Math.PI / 180);
    const lam0 = (zone * 6 - 183) * (Math.PI / 180);
    const sinPhi = Math.sin(phi); const cosPhi = Math.cos(phi); const tanPhi = Math.tan(phi);
    const N = a / Math.sqrt(1 - Math.pow(e * sinPhi, 2));
    const T = Math.pow(tanPhi, 2); const C = Math.pow(e * cosPhi, 2) / (1 - Math.pow(e, 2));
    const A = cosPhi * (lam - lam0);
    const M = a * ((1 - Math.pow(e,2)/4)*phi - (3*Math.pow(e,2)/8)*Math.sin(2*phi));
    const easting = k0 * N * (A + (1 - T + C) * Math.pow(A, 3) / 6) + 500000;
    let northing = k0 * (M + N * tanPhi * (Math.pow(A, 2) / 2));
    if (lat < 0) northing += 10000000;
    return { easting: easting.toFixed(2), northing: northing.toFixed(2) };
}

function latLonToDMS(lat, lng) {
    function convert(coord, isLat) {
        const abs = Math.abs(coord); const deg = Math.floor(abs);
        const minNot = (abs - deg) * 60; const min = Math.floor(minNot);
        const sec = ((minNot - min) * 60).toFixed(2);
        const dir = isLat ? (coord >= 0 ? "N" : "S") : (coord >= 0 ? "E" : "O");
        return `${deg}° ${min}' ${sec}" ${dir}`;
    }
    return { latDMS: convert(lat, true), lngDMS: convert(lng, false) };
}


// ============================================================================
// ETAPA 5: BARRAS INFERIORES DE LOCALIZACIÓN Y COORDENADAS (CORREGIDO)
// ============================================================================

window.listaMarcadoresCoordenadas = [];

function generarPopupCoordenadasHtml(lat, lng) {
    const utm = latLonToUTM(lat, lng, 17);
    const dms = latLonToDMS(lat, lng);
    return `
        <div style="font-family: sans-serif; font-size: 12px; min-width: 160px;">
            <b>Lat/Lon:</b> ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
            <b>UTM:</b> ${utm.easting} E, ${utm.northing} N<br>
            <b>GMS:</b> ${dms.latDMS} - ${dms.lngDMS}<br>
            <button onclick="navigator.clipboard.writeText('${lat.toFixed(6)}, ${lng.toFixed(6)}'); alert('Copiado');" style="margin-top:6px; width:100%; background:#0984e3; color:white; border:none; padding:4px; border-radius:3px; cursor:pointer;">📋 Copiar</button>
        </div>
    `;
}

const CoordsControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function(map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.marginTop = '5px';
        container.innerHTML = '<div style="background:white; padding:6px; cursor:pointer; font-size:16px; border-radius:4px; text-align:center;" title="Pin de Coordenadas">📍</div>';
        L.DomEvent.disableClickPropagation(container);
        
        let dragging = false;
        let dragIcon = null;
        
        container.addEventListener('mousedown', function(e) {
            dragging = true;
            e.preventDefault();
            dragIcon = L.marker(map.getCenter(), { icon: L.divIcon({ html: '<div style="font-size:24px;">📍</div>', iconSize: [30, 30] }) }).addTo(map);
        });
        
        document.addEventListener('mousemove', function(e) {
            if (!dragging || !dragIcon) return;
            const rect = map.getContainer().getBoundingClientRect();
            const x = e.clientX - rect.left; const y = e.clientY - rect.top;
            if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                dragIcon.setLatLng(map.containerPointToLatLng([x, y]));
            }
        });
        
        document.addEventListener('mouseup', function(e) {
            if (!dragging) return;
            dragging = false;
            if (dragIcon) { map.removeLayer(dragIcon); dragIcon = null; }
            
            const rect = map.getContainer().getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                const finalLatLng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);
                const marker = L.marker(finalLatLng).addTo(map);
                marker.bindPopup(generarPopupCoordenadasHtml(finalLatLng.lat, finalLatLng.lng)).openPopup();
            }
        });
        return container;
    }
});
map.addControl(new CoordsControl());

// 1. Cambiar dinámicamente los placeholders y etiquetas según el formato seleccionado
window.cambiarFormatoCoordenadas = function() {
    const formato = document.getElementById('formatoCoordenadas').value;
    const inputLong = document.getElementById('inputLong');
    const inputLat = document.getElementById('inputLat');
    const labelX = document.getElementById('labelX');
    const labelY = document.getElementById('labelY');

    inputLong.value = '';
    inputLat.value = '';

    if (formato === 'DD') {
        labelX.innerText = 'Long:';
        labelY.innerText = 'Lat:';
        inputLong.placeholder = 'Ej. -79.90';
        inputLat.placeholder = 'Ej. 9.36';
    } else if (formato === 'DMS') {
        labelX.innerText = 'Long (DMS):';
        labelY.innerText = 'Lat (DMS):';
        inputLong.placeholder = 'Ej. 79°54\'0"W';
        inputLat.placeholder = 'Ej. 9°21\'36"N';
    } else if (formato === 'UTM') {
        labelX.innerText = 'Este (X):';
        labelY.innerText = 'Norte (Y):';
        inputLong.placeholder = 'Ej. 635000';
        inputLat.placeholder = 'Ej. 1035000';
    }
};

// 2. Validar y procesar la navegación según el formato activo
window.irACoordenadasPersonalizadas = function() {
    const formato = document.getElementById('formatoCoordenadas').value;
    const valX = document.getElementById('inputLong').value.trim();
    const valY = document.getElementById('inputLat').value.trim();

    if (!valX || !valY) {
        alert("Por favor, complete ambos campos.");
        return;
    }

    if (formato === 'DD') {
        const lng = parseFloat(valX);
        const lat = parseFloat(valY);
        if (!isNaN(lng) && !isNaN(lat)) {
            map.setView([lat, lng], 18);
            L.marker([lat, lng]).addTo(map).bindPopup("Coordenada DD Buscada").openPopup();
        } else {
            alert("Ingrese valores numéricos válidos para Grados Decimales.");
        }
    } 
    else if (formato === 'UTM') {
        const easting = parseFloat(valX);
        const northing = parseFloat(valY);
        if (!isNaN(easting) && !isNaN(northing)) {
            // Nota: Asegúrate de tener tu función de conversión UTM a LatLon implementada en el proyecto
            const latLon = utmToLatLon(easting, northing, 17); 
            map.setView([latLon.lat, latLon.lng], 18);
            L.marker([latLon.lat, latLon.lng]).addTo(map).bindPopup("Coordenada UTM Buscada").openPopup();
        } else {
            alert("Ingrese valores numéricos válidos para UTM.");
        }
    }
    else if (formato === 'DMS') {
        // Validación básica o parser para formato GMS/DMS si tu script ya cuenta con uno
        alert("Búsqueda por DMS seleccionada. Asegúrate de procesar la cadena GMS a decimales.");
    }
};

// ============================================================================
// ETAPA 6: MODALES Y ALERTAS DEL SISTEMA
// ============================================================================

function mostrarAlertaCatastro(mensaje, tipo) {
    const alertaDiv = document.getElementById('alertaCatastro');
    if (alertaDiv) {
        alertaDiv.style.display = 'block';
        alertaDiv.innerText = mensaje;
        alertaDiv.style.backgroundColor = tipo === 'error' ? '#ff7675' : '#55efc4';
        setTimeout(() => { alertaDiv.style.display = 'none'; }, 5000);
    }
}


// ============================================================================
// ETAPA 7: MÓDULO LATERAL DE GESTIÓN CATASTRAL (BÚSQUEDA)
// ============================================================================

window.buscarCatastro = function() {
    const finca = document.getElementById('inputFinca') ? document.getElementById('inputFinca').value.trim().toLowerCase() : '';
    const tomo = document.getElementById('inputTomo') ? document.getElementById('inputTomo').value.trim().toLowerCase() : '';
    const folio = document.getElementById('inputFolio') ? document.getElementById('inputFolio').value.trim().toLowerCase() : '';
    const propietario = document.getElementById('inputPropietario') ? document.getElementById('inputPropietario').value.trim().toLowerCase() : '';

    if (!datosFincasGlobal && !datosCatastroGlobal) {
        mostrarAlertaCatastro("Los datos aún se están cargando...", "error");
        return;
    }

    let encontrados = [];
    [datosFincasGlobal, datosCatastroGlobal].forEach(dataset => {
        if (dataset && dataset.features) {
            const matches = dataset.features.filter(f => {
                const p = f.properties || {};
                const fInc = String(p.FINCA || p.finca || '').toLowerCase();
                const tOm = String(p.TOMO || p.tomo || '').toLowerCase();
                const fOl = String(p.FOLIO || p.folio || '').toLowerCase();
                const pRo = String(p.PROPIETARIO || p.propietario || '').toLowerCase();

                return (finca === '' || fInc.includes(finca)) &&
                       (tomo === '' || tOm.includes(tomo)) &&
                       (folio === '' || fOl.includes(folio)) &&
                       (propietario === '' || pRo.includes(propietario));
            });
            encontrados = encontrados.concat(matches);
        }
    });

    if (encontrados.length > 0) {
        if (capaSeleccionadaGeoJSON) map.removeLayer(capaSeleccionadaGeoJSON);
        
        capaSeleccionadaGeoJSON = L.geoJSON({ type: "FeatureCollection", features: encontrados }, {
            style: { color: '#ff007f', weight: 4, fillOpacity: 0.4 }
        }).addTo(map);

        map.fitBounds(capaSeleccionadaGeoJSON.getBounds(), { padding: [50, 50] });
        mostrarAlertaCatastro(`¡Búsqueda exitosa: ${encontrados.length} predio(s)!`, "success");
    } else {
        mostrarAlertaCatastro("Sin coincidencias encontradas.", "error");
    }
};

window.limpiarFiltroCatastro = function() {
    ['inputFinca', 'inputTomo', 'inputFolio', 'inputUbicacion', 'inputPropietario'].forEach(id => {
        const el = document.getElementById(id); if(el) el.value = '';
    });
    if (capaSeleccionadaGeoJSON) map.removeLayer(capaSeleccionadaGeoJSON);
    document.getElementById('attributeFloatingPanel').style.display = 'none';
};


// ============================================================================
// ETAPA 8: MÓDULO DE CONSULTA DE PLANOS
// ============================================================================

window.buscarPlanoManual = function() {
    const input = document.getElementById('inputPlanoSearch');
    if(input && input.value.trim() !== "") {
        const numPlano = input.value.trim();
        const imgElement = document.getElementById('planoImg');
        const placeholder = document.getElementById('textoPlanoPlaceholder');
        
        if (imgElement && placeholder) {
            imgElement.src = RUTA_PLANOS + numPlano + ".jpg";
            imgElement.style.display = 'block';
            placeholder.style.display = 'none';
            imgElement.onclick = () => window.open(imgElement.src, '_blank');
        }
    }
};


// ============================================================================
// ETAPA 9: INTERACCIÓN Y PANEL FLOTANTE DE ATRIBUTOS (CLIC EN MAPA)
// ============================================================================

function configurarClickAtributos(layer, tipoOrigen) {
    layer.on('click', function(e) {
        if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);

        const props = e.target.feature.properties || {};
        const centroide = (typeof e.target.getBounds === 'function') ? e.target.getBounds().getCenter() : e.latlng;

        const finca = props.FINCA || props.finca || '-';
        const tomo = props.TOMO || props.tomo || '-';
        const folio = props.FOLIO || props.folio || '-';
        const codUbicacion = props.COD_UBICACION || props.codigo_ubicacion || '-';
        const propietario = props.PROPIETARIO || props.propietario || '-';
        const superficie = props.SUPERFICIE || props.superficie || '-';
        const planoVal = props.PLANO || props.plano || props.imagen || '-';

        let nombrePlanoLimpio = planoVal !== '-' ? String(planoVal).split(/[\\/]/).pop().replace(/\.[^/.]+$/, "").trim() + ".jpg" : '-';

        const contenidoHtml = `
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; color: #333;">
                <thead><tr><th style="padding:4px; background:#dfe6e9;">Campo</th><th style="padding:4px; background:#dfe6e9;">Valor (${tipoOrigen.toUpperCase()})</th></tr></thead>
                <tbody>
                    <tr><td style="padding:4px; border:1px solid #dfe6e9; font-weight:bold;">FINCA</td><td style="padding:4px; border:1px solid #dfe6e9;">${finca}</td></tr>
                    <tr><td style="padding:4px; border:1px solid #dfe6e9; font-weight:bold;">TOMO</td><td style="padding:4px; border:1px solid #dfe6e9;">${tomo}</td></tr>
                    <tr><td style="padding:4px; border:1px solid #dfe6e9; font-weight:bold;">FOLIO</td><td style="padding:4px; border:1px solid #dfe6e9;">${folio}</td></tr>
                    <tr><td style="padding:4px; border:1px solid #dfe6e9; font-weight:bold;">UBICACIÓN</td><td style="padding:4px; border:1px solid #dfe6e9;">${codUbicacion}</td></tr>
                    <tr><td style="padding:4px; border:1px solid #dfe6e9; font-weight:bold;">PROPIETARIO</td><td style="padding:4px; border:1px solid #dfe6e9;">${propietario}</td></tr>
                    <tr><td style="padding:4px; border:1px solid #dfe6e9; font-weight:bold;">SUPERFICIE</td><td style="padding:4px; border:1px solid #dfe6e9;">${superficie}</td></tr>
                </tbody>
            </table>

            <button onclick="window.abrirStreetView(${centroide.lat}, ${centroide.lng})" style="width: 100%; background: #e67e22; color: white; border: none; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; margin-bottom: 10px;">
                🚗 Ver Navegación 3D
            </button>

            <div style="text-align: center; font-weight: bold; font-size:12px; margin-bottom: 5px;">Vista del Plano:</div>
            <div style="background: #f8f9fa; border: 1px solid #dfe6e9; min-height: 100px; display: flex; align-items: center; justify-content: center;">
                ${nombrePlanoLimpio !== '-.jpg' ? `
                    <img src="${RUTA_PLANOS}${nombrePlanoLimpio}" style="width: 100%; cursor: pointer;" onclick="window.open(this.src, '_blank')" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                    <div style="display:none; color:red; font-size:10px; padding:10px;">⚠️ Plano no encontrado en /planos: <br><b>${nombrePlanoLimpio}</b></div>
                ` : '<span style="font-size:11px; color:#b2bec3;">No hay plano asociado</span>'}
            </div>
        `;

        const panel = document.getElementById('attributeFloatingPanel');
        const bodyContent = document.getElementById('attributePanelBody');
        if (panel && bodyContent) {
            bodyContent.innerHTML = contenidoHtml;
            panel.style.display = 'block';
        }
    });
}


// ============================================================================
// ETAPA 10: MANEJO DEL PANEL FLOTANTE (DRAG & DROP Y CIERRE)
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
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            panel.style.display = 'none';
        });
    }

    if (panel && header) {
        let isDragging = false;
        let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

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
            panel.style.transform = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            panel.style.left = (initialLeft + (e.clientX - startX)) + 'px';
            panel.style.top = (initialTop + (e.clientY - startY)) + 'px';
        });

        document.addEventListener('mouseup', () => { isDragging = false; });
    }
});
