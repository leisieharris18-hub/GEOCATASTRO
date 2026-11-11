// ============================================================================
// ETAPA 1: CONFIGURACIÓN INICIAL DEL MAPA Y VARIABLES GLOBALES
// ============================================================================

let datosFincasGlobal = null;
let datosCatastroGlobal = null;
let capaFincasLeaflet = null;
let capaCatastroLeaflet = null;
let capaSeleccionadaGeoJSON = null;

const RUTA_PLANOS_GENERAL = 'PLANOS CATASTRALES/';
const RUTA_PLANOS_BARRIO_NORTE = 'PLANOS BARRIO NORTE/';

const map = L.map("map", {
    center: [9.3615, -79.9010],
    zoom: 16.1,
    zoomControl: false
});

map.createPane("panelCatastro");
map.getPane("panelCatastro").style.zIndex = "410";

map.createPane("panelFincas");
map.getPane("panelFincas").style.zIndex = "420";

L.control.zoom({ position: 'bottomright' }).addTo(map);

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
// ETAPA 2: LÓGICA DEL AVISO LEGAL (3 SEGUNDOS Y CLIC DE APERTURA/CIERRE)
// ============================================================================

window.toggleAvisoLegal = function() {
    const contenedorAviso = document.getElementById('avisoLegalContainer');
    if (contenedorAviso) {
        contenedorAviso.classList.toggle('minimizado');
    }
};

document.addEventListener("DOMContentLoaded", function() {
    // Temporizador para que a los 3 segundos se minimice automáticamente a solo el botón
    setTimeout(function() {
        const contenedorAviso = document.getElementById('avisoLegalContainer');
        if (contenedorAviso && !contenedorAviso.classList.contains('minimizado')) {
            contenedorAviso.classList.add('minimizado');
        }
    }, 3000);
});


// ============================================================================
// ETAPA 3: CARGA DE CAPAS CATASTRALES Y FINCAS
// ============================================================================

document.addEventListener("DOMContentLoaded", function() {
    if (typeof proj4 === "undefined") {
        console.error("Proj4js no está cargado.");
        return;
    }

    proj4.defs("EPSG:32617", "+proj=utm +zone=17 +datum=WGS84 +units=m +no_defs");

    function adaptarFormatoArcGIS(rawData) {
        if (!rawData || rawData.type === "FeatureCollection") return rawData || { type: "FeatureCollection", features: [] };
        
        const featuresConvertidas = (rawData.features || []).map(f => {
            let geometriaConvertida = null;
            if (f.geometry && f.geometry.rings) {
                const ringsTransformados = f.geometry.rings.map(ring => {
                    return ring.map(coord => {
                        if (Math.abs(coord[0]) > 180 || Math.abs(coord[1]) > 90) {
                            return proj4("EPSG:32617", "EPSG:4326", [coord[0], coord[1]]);
                        }
                        return [coord[0], coord[1]];
                    });
                });
                geometriaConvertida = { type: "Polygon", coordinates: ringsTransformados };
            }
            return {
                type: "Feature",
                properties: f.attributes || f.properties || {},
                geometry: geometriaConvertida
            };
        });
        return { type: "FeatureCollection", features: featuresConvertidas };
    }

    // Carga Catastro
    fetch('CATASTRALESC3.json')
        .then(res => res.json())
        .then(rawData => {
            const dataLimpia = adaptarFormatoArcGIS(rawData);
            datosCatastroGlobal = dataLimpia;
            capaCatastroLeaflet = L.geoJSON(dataLimpia, {
                pane: "panelCatastro",
                style: { color: '#00cec9', weight: 2, fillOpacity: 0.1, fill: true }
            }).addTo(map);
            layerControl.addOverlay(capaCatastroLeaflet, "Catastrales C3");
        })
        .catch(err => console.error("Error Catastro:", err));

    // Carga Fincas
    fetch('FINCAS.json')
        .then(res => res.json())
        .then(rawData => {
            const dataLimpia = adaptarFormatoArcGIS(rawData);
            datosFincasGlobal = dataLimpia;
            capaFincasLeaflet = L.geoJSON(dataLimpia, {
                pane: "panelFincas",
                style: { color: '#e67e22', weight: 2, fillOpacity: 0.3, fill: true }
            }).addTo(map);
            layerControl.addOverlay(capaFincasLeaflet, "Fincas");
        })
        .catch(err => console.error("Error Fincas:", err));

    setTimeout(() => map.invalidateSize(), 250);
});


// ============================================================================
// ETAPA 4: MODO OSCURO (DARK THEME)
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
// ETAPA 5: BÚSQUEDA Y UTILIDADES CATASTRALES
// ============================================================================

window.buscarCatastro = function() {
    const finca = document.getElementById('inputFinca') ? document.getElementById('inputFinca').value.trim().toLowerCase() : '';
    if (!datosFincasGlobal && !datosCatastroGlobal) return;

    let encontrados = [];
    [datosFincasGlobal, datosCatastroGlobal].forEach(dataset => {
        if (dataset && dataset.features) {
            const matches = dataset.features.filter(f => {
                const p = f.properties || {};
                const fInc = String(p.FINCA || p.finca || '').trim().toLowerCase();
                return (finca === '' || fInc.includes(finca));
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
    }
};

window.limpiarFiltroCatastro = function() {
    ['inputFinca', 'inputTomo', 'inputFolio', 'inputUbicacion', 'inputPropietario'].forEach(id => {
        const el = document.getElementById(id); 
        if (el) el.value = '';
    });
    if (capaSeleccionadaGeoJSON) {
        map.removeLayer(capaSeleccionadaGeoJSON);
        capaSeleccionadaGeoJSON = null;
    }
};

window.buscarPlanoManual = function() {
    const input = document.getElementById('inputPlanoSearch');
    const imgElement = document.getElementById('planoImg');
    const placeholder = document.getElementById('textoPlanoPlaceholder');
    if (!input || !imgElement || !placeholder) return;

    const valorInput = input.value.trim();
    if (valorInput !== "") {
        imgElement.style.display = 'block';
        placeholder.style.display = 'none';
        imgElement.src = RUTA_PLANOS_GENERAL + valorInput + ".jpg";
    }
};
