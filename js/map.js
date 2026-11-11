// ============================================================================
// ETAPA 1: CONFIGURACIÓN INICIAL DEL MAPA BASE Y VARIABLES GLOBALES
// ============================================================================

let datosFincasGlobal = null;
let datosCatastroGlobal = null;
let capaFincasLeaflet = null;
let capaCatastroLeaflet = null;
let capaSeleccionadaGeoJSON = null;
let capaClicTemporal = null;

const RUTA_PLANOS_GENERAL = 'PLANOS CATASTRALES/';
const RUTA_PLANOS_BARRIO_NORTE = 'PLANOS BARRIO NORTE/';

const map = L.map("map", {
    center: [9.3615, -79.9010],
    zoom: 16.1,
    zoomControl: false
});

// --------------------------------------------------------------------------
// NIVELES DE CAPAS: FINCAS SIEMPRE POR ENCIMA DE CATASTRO
// --------------------------------------------------------------------------

// Nivel inferior para los planos catastrales.
map.createPane("panelCatastro");
map.getPane("panelCatastro").style.zIndex = "410";

// Nivel superior para las fincas.
map.createPane("panelFincas");
map.getPane("panelFincas").style.zIndex = "420";

// Los marcadores y ventanas emergentes conservan los niveles de Leaflet.

// --------------------------------------------------------------------------
// CONTROLES Y MAPAS BASE
// --------------------------------------------------------------------------

L.control.zoom({
    position: 'bottomright'
}).addTo(map);

const osmLayer = L.tileLayer(
    "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }
);

const satelliteLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
        attribution: 'Tiles &copy; Esri'
    }
);

osmLayer.addTo(map);

const baseMaps = {
    "OpenStreetMap (Humanitario)": osmLayer,
    "Satélite (Esri)": satelliteLayer
};

const overlayMaps = {};

const layerControl = L.control.layers(
    baseMaps,
    overlayMaps
).addTo(map);


// ============================================================================
// ETAPA 1.5: CARGA, CONVERSIÓN UTM Y CONFIGURACIÓN DE CAPAS GEOGRÁFICAS
// ============================================================================

document.addEventListener("DOMContentLoaded", function() {

    if (typeof proj4 === "undefined") {
        console.error(
            "No se cargó Proj4js. Verifica que esté incluido antes de map.js."
        );
        return;
    }

    proj4.defs(
        "EPSG:32617",
        "+proj=utm +zone=17 +datum=WGS84 +units=m +no_defs"
    );

    // Conserva la conversión utilizada en tu proyecto:
    // coordenadas métricas en WGS84 / UTM zona 17N.
    function adaptarFormatoArcGIS(rawData) {
        if (!rawData) {
            return {
                type: "FeatureCollection",
                features: []
            };
        }

        // Conservar GeoJSON que ya esté en longitud y latitud WGS84.
        if (rawData.type === "FeatureCollection") {
            return rawData;
        }

        const featuresConvertidas = (rawData.features || []).map(
            function(f) {
                let geometriaConvertida = null;

                if (f.geometry && f.geometry.rings) {
                    const ringsTransformados = f.geometry.rings.map(
                        function(ring) {
                            return ring.map(function(coord) {
                                if (
                                    Math.abs(coord[0]) > 180 ||
                                    Math.abs(coord[1]) > 90
                                ) {
                                    return proj4(
                                        "EPSG:32617",
                                        "EPSG:4326",
                                        [coord[0], coord[1]]
                                    );
                                }

                                return [coord[0], coord[1]];
                            });
                        }
                    );

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
            }
        );

        return {
            type: "FeatureCollection",
            features: featuresConvertidas
        };
    }

    // ----------------------------------------------------------------------
    // CARGAR CATASTRO EN EL NIVEL INFERIOR
    // ----------------------------------------------------------------------

    fetch('CATASTRALESC3.json')
        .then(function(res) {
            if (!res.ok) {
                throw new Error(
                    "No se pudo cargar CATASTRALESC3.json: HTTP " +
                    res.status
                );
            }

            return res.json();
        })
        .then(function(rawData) {
            const dataLimpia = adaptarFormatoArcGIS(rawData);

            datosCatastroGlobal = dataLimpia;

            capaCatastroLeaflet = L.geoJSON(dataLimpia, {
                pane: "panelCatastro",

                style: {
                    color: '#00cec9',
                    weight: 2,
                    fillOpacity: 0.1,
                    fill: true
                },

                onEachFeature: function(feature, layer) {
                    configurarClickAtributos(layer, 'catastro');
                }
            }).addTo(map);

            layerControl.addOverlay(
                capaCatastroLeaflet,
                "Catastrales C3"
            );
        })
        .catch(function(err) {
            console.error("Error en Catastro:", err);
        });

    // ----------------------------------------------------------------------
    // CARGAR FINCAS EN EL NIVEL SUPERIOR
    // ----------------------------------------------------------------------

    fetch('FINCAS.json')
        .then(function(res) {
            if (!res.ok) {
                throw new Error(
                    "No se pudo cargar FINCAS.json: HTTP " +
                    res.status
                );
            }

            return res.json();
        })
        .then(function(rawData) {
            const dataLimpia = adaptarFormatoArcGIS(rawData);

            datosFincasGlobal = dataLimpia;

            capaFincasLeaflet = L.geoJSON(dataLimpia, {
                pane: "panelFincas",

                style: {
                    color: '#e67e22',
                    weight: 2,
                    fillOpacity: 0.3,
                    fill: true
                },

                onEachFeature: function(feature, layer) {
                    configurarClickAtributos(layer, 'fincas');
                }
            }).addTo(map);

            layerControl.addOverlay(
                capaFincasLeaflet,
                "Fincas"
            );
        })
        .catch(function(err) {
            console.error("Error en FINCAS:", err);
        });

    setTimeout(function() {
        map.invalidateSize();
    }, 250);
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

            if (marcadorActivoActual) {
                const coordPanel = document.getElementById('coordFloatingPanel');
                if (coordPanel && coordPanel.style.display !== 'none') {
                    window.abrirPanelCoordenadasParaMarcador(marcadorActivoActual);
                }
            }
        });
    }
});


// ============================================================================
// ETAPA 3: NAVEGACIÓN 3D, STREET VIEW Y VISOR INTERACTIVO DE PLANOS CON ZOOM
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

// Función para abrir el plano en una ventana interactiva con zoom fluido por scroll y arrastre
window.abrirPlanoConZoom = function(urlImagen) {
    const ventanaZoom = window.open("", "_blank");
    if (!ventanaZoom) {
        alert("Por favor, permita las ventanas emergentes (popups) para ver el plano.");
        return;
    }

    ventanaZoom.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Visor de Plano Catastral - Zoom Interactivo</title>
            <style>
                body {
                    margin: 0;
                    background-color: #1a1a1a;
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    overflow: hidden;
                    font-family: sans-serif;
                }
                .container {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    cursor: grab;
                }
                .container:active {
                    cursor: grabbing;
                }
                img {
                    max-width: 90%;
                    max-height: 90%;
                    object-fit: contain;
                    transition: transform 0.1s ease-out;
                    user-select: none;
                    box-shadow: 0 5px 25px rgba(0,0,0,0.5);
                    background: white;
                }
                .controls {
                    position: absolute;
                    bottom: 20px;
                    background: rgba(0, 0, 0, 0.75);
                    padding: 8px 15px;
                    border-radius: 30px;
                    color: white;
                    font-size: 13px;
                    display: flex;
                    gap: 15px;
                    align-items: center;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                }
                button {
                    background: #0984e3;
                    color: white;
                    border: none;
                    padding: 5px 12px;
                    border-radius: 15px;
                    cursor: pointer;
                    font-weight: bold;
                }
                button:hover {
                    background: #74b9ff;
                }
            </style>
        </head>
        <body>
            <div class="container" id="visorContainer">
                <img id="planoZoomImg" src="${urlImagen}" alt="Plano Catastral">
            </div>
            <div class="controls">
                <span>Use la <b>rueda del ratón</b> para hacer Zoom y arrastre para mover.</span>
                <button onclick="resetZoom()">Restablecer</button>
            </div>

            <script>
                const img = document.getElementById('planoZoomImg');
                const container = document.getElementById('visorContainer');
                let scale = 1;
                let panning = false;
                let pointX = 0;
                let pointY = 0;
                let startX = 0;
                let startY = 0;

                function setTransform() {
                    img.style.transform = 'translate(' + pointX + 'px, ' + pointY + 'px) scale(' + scale + ')';
                }

                container.addEventListener('wheel', function(e) {
                    e.preventDefault();
                    const zoomIntensity = 0.1;
                    if (e.deltaY < 0) {
                        scale *= (1 + zoomIntensity);
                    } else {
                        scale /= (1 + zoomIntensity);
                        if (scale < 1) scale = 1;
                    }
                    setTransform();
                });

                container.addEventListener('mousedown', function(e) {
                    panning = true;
                    startX = e.clientX - pointX;
                    startY = e.clientY - pointY;
                });

                window.addEventListener('mousemove', function(e) {
                    if (!panning) return;
                    pointX = e.clientX - startX;
                    pointY = e.clientY - startY;
                    setTransform();
                });

                window.addEventListener('mouseup', function() {
                    panning = false;
                });

                function resetZoom() {
                    scale = 1;
                    pointX = 0;
                    pointY = 0;
                    setTransform();
                }
            </script>
        </body>
        </html>
    `);
    ventanaZoom.document.close();
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
// ETAPA 4: HERRAMIENTAS GEODÉSICAS Y CONVERSIONES
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
    function convert(coord) {
        const sign = coord < 0 ? "-" : "+";
        const abs = Math.abs(coord); 
        const deg = Math.floor(abs);
        const minNot = (abs - deg) * 60; 
        const min = Math.floor(minNot);
        const sec = ((minNot - min) * 60).toFixed(2);
        return `${sign}${deg}° ${min}' ${sec}"`;
    }
    return { latDMS: convert(lat), lngDMS: convert(lng) };
}

function mostrarModalAlertaCoordenadas(mensajePersonalizado) {
    const modal = document.getElementById('customModalCoord');
    const msg = document.getElementById('customModalCoordMsg');
    if (modal && msg) {
        msg.innerHTML = `⚠️ <b>Verifique coordenadas:</b> ${mensajePersonalizado}`;
        modal.style.display = 'flex';
    } else {
        alert("¡ALERTA DE COORDENADAS!\n⚠️ " + mensajePersonalizado);
    }
}

window.cerrarModalCoordenadas = function() {
    const modal = document.getElementById('customModalCoord');
    if (modal) modal.style.display = 'none';
};


// ============================================================================
// ETAPA 5: PANELES FLOTANTES Y MARCADORES DE COORDENADAS
// ============================================================================

window.listaMarcadoresCoordenadas = [];
let marcadorActivoActual = null;

function generarContenidoPanelCoordenadas(lat, lng) {
    const selectEl = document.getElementById('selectTipoCoord') || document.getElementById('formatoCoordenadas');
    const formato = selectEl ? selectEl.value.toUpperCase() : 'DD';

    let contenidoFormato = '';
    let textoCopiar = '';

    if (formato === 'DD') {
        textoCopiar = `Lon: ${lng.toFixed(6)}, Lat: ${lat.toFixed(6)}`;
        contenidoFormato = `<b>Lon:</b> ${lng.toFixed(6)}<br><b>Lat:</b> ${lat.toFixed(6)}`;
    } else if (formato === 'UTM') {
        const utm = latLonToUTM(lat, lng, 17);
        textoCopiar = `Este: ${utm.easting}, Norte: ${utm.northing}`;
        contenidoFormato = `<b>Este (X):</b> ${utm.easting}<br><b>Norte (Y):</b> ${utm.northing} (Zona 17N)`;
    } else if (formato === 'DMS' || formato === 'GMS') {
        const dms = latLonToDMS(lat, lng);
        textoCopiar = `Lon: ${dms.lngDMS}, Lat: ${dms.latDMS}`;
        contenidoFormato = `<b>Lon (GMS):</b> ${dms.lngDMS}<br><b>Lat (GMS):</b> ${dms.latDMS}`;
    }

    const esDarkMode = document.body.classList.contains('dark-mode');
    const colorNota = esDarkMode ? '#ffffff' : '#555555';
    const colorBordeNota = esDarkMode ? '#334e5a' : '#dddddd';
    const colorTextoGeneral = esDarkMode ? '#ffffff' : '#333333';

    return `
        <div style="font-family: sans-serif; font-size: 12.5px; color: ${colorTextoGeneral};">
            <div style="margin-bottom: 10px; line-height: 1.5;">${contenidoFormato}</div>
            <button onclick="navigator.clipboard.writeText('${textoCopiar}'); alert('Coordenadas copiadas');" style="margin-top:4px; width:100%; background:#0984e3; color:white; border:none; padding:7px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">📋 Copiar</button>
            <div style="font-size:10px; font-style:italic; color:${colorNota}; margin-top:10px; border-top:1px solid ${colorBordeNota}; padding-top:6px; line-height: 1.3;">
                Nota: Coordenadas de carácter meramente informativo. No son válidas para trámites legales, jurídicos o de titulación en el Registro Público.
            </div>
        </div>
    `;
}

window.abrirPanelCoordenadasParaMarcador = function(marker) {
    marcadorActivoActual = marker;
    const panel = document.getElementById('coordFloatingPanel');
    const bodyContent = document.getElementById('coordPanelBody');

    if (panel && bodyContent) {
        bodyContent.innerHTML = generarContenidoPanelCoordenadas(marker.lat, marker.lng);
        panel.style.display = 'block';
    }
};

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
                const marker = L.marker(finalLatLng, { draggable: true }).addTo(map);
                
                marker.lat = finalLatLng.lat;
                marker.lng = finalLatLng.lng;
                window.listaMarcadoresCoordenadas.push(marker);

                marker.on('drag', function(ev) {
                    const pos = ev.target.getLatLng();
                    marker.lat = pos.lat;
                    marker.lng = pos.lng;
                    if (marcadorActivoActual === marker) {
                        const bodyContent = document.getElementById('coordPanelBody');
                        const coordPanel = document.getElementById('coordFloatingPanel');
                        if (bodyContent && coordPanel && coordPanel.style.display !== 'none') {
                            bodyContent.innerHTML = generarContenidoPanelCoordenadas(marker.lat, marker.lng);
                        }
                    }
                });

                marker.on('click', function() {
                    window.abrirPanelCoordenadasParaMarcador(marker);
                });

                window.abrirPanelCoordenadasParaMarcador(marker);
            }
        });
        return container;
    }
});
map.addControl(new CoordsControl());

window.cambiarFormatoCoordenadas = function() {
    const selectEl = document.getElementById('selectTipoCoord') || document.getElementById('formatoCoordenadas');
    if (!selectEl) return;
    const formato = selectEl.value.toUpperCase();
    const inputLong = document.getElementById('inputLong');
    const inputLat = document.getElementById('inputLat');
    const labelX = document.getElementById('labelX');
    const labelY = document.getElementById('labelY');

    if(inputLong) inputLong.value = '';
    if(inputLat) inputLat.value = '';

    if (formato === 'DD') {
        if(labelX) labelX.innerText = 'Long:';
        if(labelY) labelY.innerText = 'Lat:';
        if(inputLong) inputLong.placeholder = 'Ej. -79.90';
        if(inputLat) inputLat.placeholder = 'Ej. 9.36';
    } else if (formato === 'DMS' || formato === 'GMS') {
        if(labelX) labelX.innerText = 'Lon (GMS):';
        if(labelY) labelY.innerText = 'Lat (GMS):';
        if(inputLong) inputLong.placeholder = 'Ej. -79° 54\' 10"';
        if(inputLat) inputLat.placeholder = 'Ej. +9° 21\' 46"';
    } else if (formato === 'UTM') {
        if(labelX) labelX.innerText = 'Este:';
        if(labelY) labelY.innerText = 'Norte:';
        if(inputLong) inputLong.placeholder = 'Ej. 660000';
        if(inputLat) inputLat.placeholder = 'Ej. 990000';
    }

    if (marcadorActivoActual) {
        const coordPanel = document.getElementById('coordFloatingPanel');
        if (coordPanel && coordPanel.style.display !== 'none') {
            const bodyContent = document.getElementById('coordPanelBody');
            if (bodyContent) {
                bodyContent.innerHTML = generarContenidoPanelCoordenadas(marcadorActivoActual.lat, marcadorActivoActual.lng);
            }
        }
    }
};

window.irACoordenadasPersonalizadas = function() {
    const selectEl = document.getElementById('selectTipoCoord') || document.getElementById('formatoCoordenadas');
    const formato = selectEl ? selectEl.value.toUpperCase() : 'DD';
    const valX = document.getElementById('inputLong') ? document.getElementById('inputLong').value.trim() : '';
    const valY = document.getElementById('inputLat') ? document.getElementById('inputLat').value.trim() : '';

    if (!valX || !valY) {
        mostrarModalAlertaCoordenadas("Los campos de coordenadas no pueden estar vacíos.");
        return;
    }

    let lat = 0, lng = 0;

    if (formato === 'DD') {
        lng = parseFloat(valX);
        lat = parseFloat(valY);
        if (isNaN(lng) || isNaN(lat) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            mostrarModalAlertaCoordenadas("Los valores ingresados no corresponden a Grados Decimales válidos.");
            return;
        }
    } else if (formato === 'UTM') {
        const easting = parseFloat(valX);
        const northing = parseFloat(valY);
        if (isNaN(easting) || isNaN(northing) || easting < 100000 || easting > 900000 || northing < 0 || northing > 10000000) {
            mostrarModalAlertaCoordenadas("Los valores ingresados no corresponden a coordenadas UTM válidas (Zona 17N).");
            return;
        }
        try {
            if (typeof proj4 !== 'undefined') {
                const utmProj = "+proj=utm +zone=17 +datum=WGS84 +units=m +no_defs";
                const wgs84Proj = "+proj=longlat +datum=WGS84 +no_defs";
                const [convLng, convLat] = proj4(utmProj, wgs84Proj, [easting, northing]);
                lng = convLng;
                lat = convLat;
            } else {
                mostrarModalAlertaCoordenadas("Librería Proj4 no disponible para conversión UTM.");
                return;
            }
        } catch (e) {
            mostrarModalAlertaCoordenadas("Error al procesar las coordenadas UTM ingresadas.");
            return;
        }
    } else if (formato === 'DMS' || formato === 'GMS') {
        const parseDMS = (dmsStr) => {
            const clean = dmsStr.replace(/["']/g, ' ').replace(/[°]/g, ' ');
            const partes = clean.trim().split(/\s+/);
            if (partes.length >= 3) {
                let deg = parseFloat(partes[0]) || 0;
                let min = parseFloat(partes[1]) || 0;
                let sec = parseFloat(partes[2]) || 0;
                let dec = deg + (min / 60) + (sec / 3600);
                if (dmsStr.startsWith('-')) {
                    dec = -Math.abs(dec);
                }
                return dec;
            }
            return parseFloat(dmsStr);
        };

        lng = parseDMS(valX);
        lat = parseDMS(valY);

        if (isNaN(lng) || isNaN(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            mostrarModalAlertaCoordenadas("El formato GMS ingresado es incorrecto o presenta inconsistencias.");
            return;
        }
    }

    map.setView([lat, lng], 18);
    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    
    marker.lat = lat;
    marker.lng = lng;
    window.listaMarcadoresCoordenadas.push(marker);

    marker.on('drag', function(ev) {
        const pos = ev.target.getLatLng();
        marker.lat = pos.lat;
        marker.lng = pos.lng;
        if (marcadorActivoActual === marker) {
            const bodyContent = document.getElementById('coordPanelBody');
            const coordPanel = document.getElementById('coordFloatingPanel');
            if (bodyContent && coordPanel && coordPanel.style.display !== 'none') {
                bodyContent.innerHTML = generarContenidoPanelCoordenadas(marker.lat, marker.lng);
            }
        }
    });

    marker.on('click', function() {
        window.abrirPanelCoordenadasParaMarcador(marker);
    });

    window.abrirPanelCoordenadasParaMarcador(marker);
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
// ETAPA 7: MÓDULO LATERAL DE GESTIÓN CATASTRAL (BÚSQUEDA Y LIMPIEZA TOTAL)
// ============================================================================

window.buscarCatastro = function() {
    const finca = document.getElementById('inputFinca') ? document.getElementById('inputFinca').value.trim().toLowerCase() : '';
    const tomo = document.getElementById('inputTomo') ? document.getElementById('inputTomo').value.trim().toLowerCase() : '';
    const folio = document.getElementById('inputFolio') ? document.getElementById('inputFolio').value.trim().toLowerCase() : '';
    const ubicacion = document.getElementById('inputUbicacion') ? document.getElementById('inputUbicacion').value.trim().toLowerCase() : '';
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
                
                const fInc = String(p.FINCA || p.finca || '').trim().toLowerCase();
                const tOm = String(p.TOMO || p.tomo || '').trim().toLowerCase();
                const fOl = String(p.FOLIO || p.folio || '').trim().toLowerCase();
                
                const uBi = String(
                    p.CODIGO_UBICACION || p.codigo_ubicacion || 
                    p.COD_UBICACION || p.cod_ubicacion || 
                    p.UBICACION || p.ubicacion || 
                    p.COD_UBICA || p.cod_ubica ||
                    p.CODIGO || p.codigo || ''
                ).trim().toLowerCase();

                const pRo = String(p.PROPIETARIO || p.propietario || '').trim().toLowerCase();

                const cumpleFinca = (finca === '' || fInc.includes(finca));
                const cumpleTomo = (tomo === '' || tOm.includes(tomo));
                const cumpleFolio = (folio === '' || fOl.includes(folio));
                const cumpleUbicacion = (ubicacion === '' || uBi.includes(ubicacion));
                const cumplePropietario = (propietario === '' || pRo.includes(propietario));

                return cumpleFinca && cumpleTomo && cumpleFolio && cumpleUbicacion && cumplePropietario;
            });
            encontrados = encontrados.concat(matches);
        }
    });

    if (encontrados.length > 0) {
        if (capaSeleccionadaGeoJSON) map.removeLayer(capaSeleccionadaGeoJSON);
        
        capaSeleccionadaGeoJSON = L.geoJSON({ type: "FeatureCollection", features: encontrados }, {
            style: { color: '#ff007f', weight: 2, fillOpacity: 0.1, fill: true }
        }).addTo(map);

        map.fitBounds(capaSeleccionadaGeoJSON.getBounds(), { padding: [50, 50] });
        mostrarAlertaCatastro(`¡Búsqueda exitosa: ${encontrados.length} predio(s)!`, "success");
    } else {
        mostrarAlertaCatastro("Sin coincidencias encontradas.", "error");
    }
};

window.limpiarFiltroCatastro = function() {
    ['inputFinca', 'inputTomo', 'inputFolio', 'inputUbicacion', 'inputPropietario'].forEach(id => {
        const el = document.getElementById(id); 
        if (el) el.value = '';
    });

    const inputPlano = document.getElementById('inputPlanoSearch');
    if (inputPlano) inputPlano.value = '';

    const imgElement = document.getElementById('planoImg');
    const placeholder = document.getElementById('textoPlanoPlaceholder');
    if (imgElement) {
        imgElement.style.display = 'none';
        imgElement.src = '';
    }
    if (placeholder) {
        placeholder.style.display = 'block';
        placeholder.innerText = "Vista previa del plano";
    }

    if (capaSeleccionadaGeoJSON) {
        map.removeLayer(capaSeleccionadaGeoJSON);
        capaSeleccionadaGeoJSON = null;
    }

    if (typeof capaPredioClicSeleccionado !== 'undefined' && capaPredioClicSeleccionado) {
        if (typeof capaPredioClicSeleccionado.setStyle === 'function') {
            const origenActual = capaPredioClicSeleccionado._tipoOrigenOriginal || 'fincas';
            if (origenActual === 'fincas') {
                capaPredioClicSeleccionado.setStyle({ color: '#e67e22', weight: 2, fillOpacity: 0.3, fill: true });
            } else {
                capaPredioClicSeleccionado.setStyle({ color: '#00cec9', weight: 2, fillOpacity: 0.1, fill: true });
            }
        }
        capaPredioClicSeleccionado = null;
    }

    if (window.listaMarcadoresCoordenadas && window.listaMarcadoresCoordenadas.length > 0) {
        window.listaMarcadoresCoordenadas.forEach(marker => {
            if (marker && map.hasLayer(marker)) map.removeLayer(marker);
        });
        window.listaMarcadoresCoordenadas = [];
    }
    marcadorActivoActual = null;

    map.closePopup();

    const panelAtributos = document.getElementById('attributeFloatingPanel');
    if (panelAtributos) panelAtributos.style.display = 'none';

    const panelCoord = document.getElementById('coordFloatingPanel');
    if (panelCoord) panelCoord.style.display = 'none';

    const panelSV = document.getElementById('streetViewPanel');
    if (panelSV) panelSV.style.display = 'none';

    const alertaDiv = document.getElementById('alertaCatastro');
    if (alertaDiv) alertaDiv.style.display = 'none';

    const alertaPlano = document.getElementById('alertaPlano');
    if (alertaPlano) alertaPlano.style.display = 'none';
};


// ============================================================================
// ETAPA 8: MÓDULO DE CONSULTA DE PLANOS
// ============================================================================

window.buscarPlanoManual = function() {
    const input = document.getElementById('inputPlanoSearch');
    const imgElement = document.getElementById('planoImg');
    const placeholder = document.getElementById('textoPlanoPlaceholder');

    if (!input) return;

    const valorInput = input.value.trim();

    if (valorInput === "") {
        if (imgElement) imgElement.style.display = 'none';
        if (placeholder) {
            placeholder.style.display = 'block';
            placeholder.innerText = "Vista previa del plano";
        }
        return;
    }

    if (imgElement && placeholder) {
        const rutaImagen = RUTA_PLANOS_GENERAL + valorInput + ".jpg";
        
        imgElement.style.display = 'block';
        placeholder.style.display = 'none';
        imgElement.src = rutaImagen;
        imgElement.onclick = () => window.abrirPlanoConZoom(imgElement.src);
        
        imgElement.onerror = function() {
            this.src = RUTA_PLANOS_BARRIO_NORTE + valorInput + ".jpg";
            this.onerror = function() {
                this.style.display = 'none';
                placeholder.style.display = 'block';
                placeholder.innerText = "⚠️ Plano no encontrado en las carpetas";
            };
        };
    }
};

document.addEventListener("DOMContentLoaded", function() {
    const inputPlano = document.getElementById('inputPlanoSearch');
    if (inputPlano) {
        inputPlano.addEventListener('input', function() {
            if (this.value.trim() === "") {
                const imgElement = document.getElementById('planoImg');
                const placeholder = document.getElementById('textoPlanoPlaceholder');
                
                if (imgElement) imgElement.style.display = 'none';
                if (placeholder) {
                    placeholder.style.display = 'block';
                    placeholder.innerText = "Vista previa del plano";
                }
            }
        });
    }
});


// ============================================================================
// ETAPA 9: INTERACCIÓN, SELECCIÓN VISUAL Y PANEL FLOTANTE DE ATRIBUTOS
// ============================================================================

let capaPredioClicSeleccionado = null;

function configurarClickAtributos(layer, tipoOrigen) {
    // Guardamos explícitamente el origen dentro de la capa para recordarlo siempre
    layer._tipoOrigenOriginal = tipoOrigen;

    layer.on('click', function(e) {
        L.DomEvent.stopPropagation(e);

        // Si ya había un predio seleccionado previamente, restaurar su color original exacto según su origen guardado
        if (capaPredioClicSeleccionado) {
            if (typeof capaPredioClicSeleccionado.setStyle === 'function') {
                const origenAnterior = capaPredioClicSeleccionado._tipoOrigenOriginal || 'fincas';

                if (origenAnterior === 'fincas') {
                    // Restaurar rigurosamente a naranja original de Fincas
                    capaPredioClicSeleccionado.setStyle({ color: '#e67e22', weight: 2, fillOpacity: 0.3, fill: true });
                } else {
                    // Restaurar rigurosamente a celeste original de Catastro
                    capaPredioClicSeleccionado.setStyle({ color: '#00cec9', weight: 2, fillOpacity: 0.1, fill: true });
                }
            }
        }

        // Marcar el nuevo predio seleccionado y pintarlo de rosado brillante
        capaPredioClicSeleccionado = e.target;
        capaPredioClicSeleccionado._tipoOrigenOriginal = tipoOrigen; // Asegurar registro

        if (typeof capaPredioClicSeleccionado.setStyle === 'function') {
            capaPredioClicSeleccionado.setStyle({ color: '#ff007f', weight: 4, fillOpacity: 0.5, fill: true });
            if (capaPredioClicSeleccionado.bringToFront) {
                capaPredioClicSeleccionado.bringToFront();
            }
        }

        const props = e.target.feature.properties || {};
        const centroide = (typeof e.target.getBounds === 'function') ? e.target.getBounds().getCenter() : e.latlng;

        // Lectura de atributos estricta (sin Shape_Area)
        const finca = props.FINCA || props.finca || '-';
        const tomo = props.TOMO || props.tomo || '-';
        const folio = props.FOLIO || props.folio || '-';
        const codUbicacion = props.CODIGO_UBICACION || props.COD_UBICACION || props.codigo_ubicacion || props.ubicacion || '-';
        const propietario = props.PROPIETARIO || props.propietario || '-';
        const superficie = props.SUPERFICIE || props.superficie || '-';
        
        const planoVal = props.PLANO || props.plano || props.imagen || '';
        const planoStr = String(planoVal).trim();
        
        // Validación estricta: Ignora vacíos, guiones, nulos y textos como "PD" (Por Determinar)
        const tieneAtributoPlano = planoStr !== '' && 
                                   planoStr !== '-' && 
                                   planoStr !== '--' && 
                                   planoStr.toLowerCase() !== 'pd' && 
                                   planoStr.toLowerCase() !== 'null' && 
                                   planoStr !== '0' && 
                                   planoStr.toLowerCase() !== 'undefined';

        let nombrePlanoLimpio = '';
        if (tieneAtributoPlano) {
            nombrePlanoLimpio = planoStr.split(/[\\/]/).pop().replace(/\.[^/.]+$/, "").trim() + ".jpg";
        }
        let carpetaSeleccionada = (tipoOrigen === 'fincas') ? RUTA_PLANOS_BARRIO_NORTE : RUTA_PLANOS_GENERAL; 

        // Generar HTML del visor de plano según los Casos 1 y 2
        let htmlContenidoPlano = '';

        if (!tieneAtributoPlano) {
            // CASO 2: La finca no tiene número de plano catastral registrado (o dice PD)
            htmlContenidoPlano = '<span style="font-size:11px; color:#e17055; font-weight:600; line-height: 1.4;">Sin plano catastral registrado en las bases de datos actuales; puede utilizar como referencia el plano catastral de la manzana.</span>';
        } else {
            // CASO 1: Tiene atributo de plano válido, evaluamos si la imagen existe en el servidor
            htmlContenidoPlano = `
                <img id="planoImgPopup" src="${carpetaSeleccionada}${nombrePlanoLimpio}" style="width: 100%; cursor: pointer; display: block;" onclick="window.abrirPlanoConZoom(this.src)" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <div style="display:none; color:#c0392b; font-size:11px; font-weight:600; padding:5px; line-height: 1.4;">Imagen digital no se encuentra disponible en el servidor.</div>
            `;
        }

        const contenidoHtml = `
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; color: #333;">
                <thead><tr><th style="padding:4px; background:#dfe6e9;">Campo</th><th style="padding:4px; background:#dfe6e9;">Valor (${tipoOrigen.toUpperCase()})</th></tr></thead>
                <tbody>
                    <tr><td style="padding:4px; border:1px solid #dfe6e9; font-weight:bold;">FINCA</td><td style="padding:4px; border:1px solid #dfe6e9;">${finca}</td></tr>
                    <tr><td style="padding:4px; border:1px solid #dfe6e9; font-weight:bold;">TOMO</td><td style="padding:4px; border:1px solid #dfe6e9;">${tomo}</td></tr>
                    <tr><td style="padding:4px; border:1px solid #dfe6e9; font-weight:bold;">FOLIO</td><td style="padding:4px; border:1px solid #dfe6e9;">${folio}</td></tr>
                    <tr><td style="padding:4px; border:1px solid #dfe6e9; font-weight:bold;">CODIGO_UBICACION</td><td style="padding:4px; border:1px solid #dfe6e9;">${codUbicacion}</td></tr>
                    <tr><td style="padding:4px; border:1px solid #dfe6e9; font-weight:bold;">PROPIETARIO</td><td style="padding:4px; border:1px solid #dfe6e9;">${propietario}</td></tr>
                    <tr><td style="padding:4px; border:1px solid #dfe6e9; font-weight:bold;">SUPERFICIE (m²)</td><td style="padding:4px; border:1px solid #dfe6e9;">${superficie}</td></tr>
                </tbody>
            </table>

            <button onclick="window.abrirStreetView(${centroide.lat}, ${centroide.lng})" style="width: 100%; background: #e67e22; color: white; border: none; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; margin-bottom: 10px;">
                🚗 Ver Navegación 3D
            </button>

            <div style="text-align: center; font-weight: bold; font-size:12px; margin-bottom: 5px;">Vista del Plano:</div>
            <div style="background: #f8f9fa; border: 1px solid #dfe6e9; min-height: 90px; display: flex; align-items: center; justify-content: center; padding: 10px; text-align: center; box-sizing: border-box;">
                ${htmlContenidoPlano}
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
// ETAPA 10: MANEJO DEL PANEL FLOTANTE DE ATRIBUTOS
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

            if (typeof capaPredioClicSeleccionado !== 'undefined' && capaPredioClicSeleccionado) {
                if (typeof capaPredioClicSeleccionado.setStyle === 'function') {
                    const origenActual = capaPredioClicSeleccionado._tipoOrigenOriginal || 'fincas';
                    if (origenActual === 'fincas') {
                        capaPredioClicSeleccionado.setStyle({ color: '#e67e22', weight: 2, fillOpacity: 0.3, fill: true });
                    } else {
                        capaPredioClicSeleccionado.setStyle({ color: '#00cec9', weight: 2, fillOpacity: 0.1, fill: true });
                    }
                }
                capaPredioClicSeleccionado = null;
            }
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


// ============================================================================
// ETAPA 11: SOPORTE DE TECLA ENTER
// ============================================================================

document.addEventListener("DOMContentLoaded", function() {
    const inputsCatastro = ['inputFinca', 'inputTomo', 'inputFolio', 'inputUbicacion', 'inputPropietario'];
    inputsCatastro.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (typeof window.buscarCatastro === 'function') {
                        window.buscarCatastro();
                    }
                }
            });
        }
    });

    const inputPlano = document.getElementById('inputPlanoSearch');
    if (inputPlano) {
        inputPlano.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (typeof window.buscarPlanoManual === 'function') {
                    window.buscarPlanoManual();
                }
            }
        });
    }

    ['inputLong', 'inputLat'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (typeof window.irACoordenadasPersonalizadas === 'function') {
                        window.irACoordenadasPersonalizadas();
                    }
                }
            });
        }
    });
});


// ============================================================================
// ETAPA 12: PANEL FLOTANTE DE COORDENADAS
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const coordPanel = document.getElementById('coordFloatingPanel');
    const coordHeader = document.getElementById('coordPanelHeader');
    const minimizeBtn = document.getElementById('minimizeCoordBtn');
    const closeCoordBtn = document.getElementById('closeCoordBtn');

    if (coordPanel) {
        L.DomEvent.disableClickPropagation(coordPanel);
        L.DomEvent.disableScrollPropagation(coordPanel);
    }

    if (minimizeBtn && coordPanel) {
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            coordPanel.style.display = 'none';
        });
    }

    if (closeCoordBtn && coordPanel) {
        closeCoordBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            coordPanel.style.display = 'none';

            if (marcadorActivoActual) {
                if (map.hasLayer(marcadorActivoActual)) {
                    map.removeLayer(marcadorActivoActual);
                }
                window.listaMarcadoresCoordenadas = window.listaMarcadoresCoordenadas.filter(m => m !== marcadorActivoActual);
                marcadorActivoActual = null;
            }
        });
    }

    if (coordPanel && coordHeader) {
        let isDragging = false;
        let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

        coordHeader.addEventListener('mousedown', function(e) {
            if (e.target.closest('button')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = coordPanel.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            coordPanel.style.position = 'fixed';
            coordPanel.style.left = initialLeft + 'px';
            coordPanel.style.top = initialTop + 'px';
            coordPanel.style.transform = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            coordPanel.style.left = (initialLeft + (e.clientX - startX)) + 'px';
            coordPanel.style.top = (initialTop + (e.clientY - startY)) + 'px';
        });

        document.addEventListener('mouseup', () => { isDragging = false; });
    }
});
