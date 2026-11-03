// ============================================================================
// GEO-CATASTRO COLÓN - VISOR TERRITORIAL (VERSIÓN GITHUB PAGES - SIN GEOSERVER)
// ============================================================================

// ============================================================================
// ETAPA 1: CONFIGURACIÓN INICIAL DEL MAPA BASE Y VARIABLES GLOBALES
// ============================================================================

// Variables globales para almacenar los datos cargados en memoria
let geoJsonDataGlobal = null;      // Datos puros del JSON
let capaCatastralGlobal = null;   // Capa Leaflet visualizada
let capaSeleccionadaGeoJSON = null; // Capa de resaltado para búsquedas
let capaClicTemporal = null;       // Capa de resaltado para clic directo

// Configuración de rutas relativas para la nube (GitHub Pages)
const RUTA_DATOS_JSON = 'FINCAS.json'; // Archivo en la raíz
const RUTA_PLANOS = 'planos/';         // Carpeta en la raíz con los JPGs

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

// Capas Base
const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by Humanitarian OpenStreetMap Team'
});

const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

osmLayer.addTo(map);

// Control Switcher de Capas (Simplificado sin WMS)
const baseMaps = { 
    "OpenStreetMap (Humanitario)": osmLayer,
    "Satélite (Esri)": satelliteLayer
};
// Las capas operacionales se añadirán dinámicamente al cargar el JSON
let overlayMaps = { }; 
const layerControl = L.control.layers(baseMaps, overlayMaps).addTo(map);


// ============================================================================
// [NUEVO] ETAPA 1.5: CARGA DE DATOS GEOJSON DESDE LA NUBE
// ============================================================================

// Función para cargar el archivo FINCAS.json al iniciar la página
function cargarDatosGeoJSON() {
    fetch(FINCAS.json)
        .then(response => {
            if (!response.ok) {
                throw new Error('No se pudo cargar el archivo FINCAS.json');
            }
            return response.json();
        })
        .then(data => {
            // Guardar datos en memoria global
            geoJsonDataGlobal = data;

            // Crear la capa visual y configurar la interacción
            capaCatastralGlobal = L.geoJSON(data, {
                style: function(feature) {
                    return {
                        color: '#3388ff', // Color azul estándar
                        weight: 1.5,
                        opacity: 1,
                        fillColor: '#3388ff',
                        fillOpacity: 0.1 // Muy transparente por defecto
                    };
                },
                onEachFeature: function(feature, layer) {
                    // Configurar el evento de clic para mostrar atributos
                    configurarClickEnLayer(layer);
                }
            }).addTo(map);

            // Añadir al control de capas
            layerControl.addOverlay(capaCatastralGlobal, "Fincas (Catastro)");
            console.log("Datos catastrales cargados correctamente desde la nube.");
        })
        .catch(error => {
            console.error('Error crítico al cargar datos:', error);
            mostrarAlertaCatastro("Error: No se pudieron cargar los datos del mapa. Verifique que FINCAS.json exista.", "error");
        });
}

// Ejecutar la carga al cargar el DOM
document.addEventListener("DOMContentLoaded", cargarDatosGeoJSON);


// ============================================================================
// ETAPA 2: INTEGRACIÓN DEL MODO OSCURO (Mantenido igual)
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
// ETAPA 3: INTEGRACIÓN DE NAVEGACIÓN 3D Y STREET VIEW (Mantenido igual)
// ============================================================================

// Control Brújula Norte
const NorthArrowControl = L.Control.extend({
    options: { position: 'topleft' },
    onAdd: function(map) {
        const container = L.DomUtil.create('div','custom-north-control');
        container.style.marginTop = '5px';
        container.style.marginLeft = '5px';
        container.innerHTML = `
            <div title="Orientación Norte" style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; background: #ffffff; border: 1px solid #cccccc; border-radius: 50%; cursor: pointer; box-sizing: border-box; box-shadow: 0 3px 8px rgba(0,0,0,0.25);">
                <span style="position:absolute; top:1px; left:50%; transform:translateX(-50%); font-size:10px; font-weight:bold; color:#ff0000; z-index:10; line-height:1;">N</span>
                <span style="position:absolute; bottom:1px; left:50%; transform:translateX(-50%); font-size:10px; font-weight:bold; color:#000000; z-index:10; line-height:1;">S</span>
                <span style="position:absolute; left:3px; top:50%; transform:translateY(-50%); font-size:10px; font-weight:bold; color:#000000; z-index:10; line-height:1;">O</span>
                <span style="position:absolute; right:3px; top:50%; transform:translateY(-50%); font-size:10px; font-weight:bold; color:#000000; z-index:10; line-height:1;">E</span>
                <div style="position: absolute; width: 36px; height: 36px; border: 1px dashed rgba(0, 141, 165, 0.4); border-radius: 50%; box-sizing: border-box;"></div>
                <div style="position: absolute; width: 30px; height: 30px; top: 50%; left: 50%; transform: translate(-50%, -50%);">
                    <div style="position: absolute; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-bottom: 15px solid #00c4df; top: -3px; left: 50%; transform: translateX(-50%); filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2));"></div>
                    <div style="position: absolute; width: 0; height: 0; border-left: 2px solid transparent; border-right: 2px solid transparent; border-bottom: 13px solid #ffffff; top: -1px; left: 50%; transform: translateX(-50%);"></div>
                    <div style="position: absolute; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 15px solid #006f86; bottom: -3px; left: 50%; transform: translateX(-50%);"></div>
                    <div style="position: absolute; width: 0; height: 0; border-top: 4px solid transparent; border-bottom: 4px solid transparent; border-right: 15px solid #008da5; top: 50%; left: -3px; transform: translateY(-50%);"></div>
                    <div style="position: absolute; width: 0; height: 0; border-top: 4px solid transparent; border-bottom: 4px solid transparent; border-left: 15px solid #00a8cc; top: 50%; right: -3px; transform: translateY(-50%);"></div>
                    <div style="position: absolute; width: 6px; height: 6px; background: #ffffff; border: 1.5px solid #004d5e; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 5;"></div>
                </div>
            </div>`;
        L.DomEvent.disableClickPropagation(container);
        return container;
    }
});
map.addControl(new NorthArrowControl());

// Funciones Street View
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
            if (dragIcon) { map.removeLayer(dragIcon); dragIcon = null; }
            
            const rect = map.getContainer().getBoundingClientRect();
            if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const finalLatLng = map.containerPointToLatLng([x, y]);
                window.abrirStreetView(finalLatLng.lat, finalLatLng.lng);
            }
        });
        return container;
    }
});
map.addControl(new StreetViewControl());


// ============================================================================
// ETAPA 4 Y 5: HERRAMIENTAS GEODÉSICAS Y COORDENADAS (Mantenido igual)
// ============================================================================

// --- Funciones de conversión (Omitidas en esta vista para abreviar, mantener las tuyas originales) ---
// (latLonToUTM, latLonToDMS, dmsToDd, utmToLatLon, generarPopupCoordenadasHtml, etc.)
// [INSERTA AQUÍ TUS FUNCIONES ORIGINALES DE LAS ETAPAS 4 Y 5]

// ============================================================================
// ETAPA 6: MODAL Y ALERTAS (Mantenido igual)
// ============================================================================

window.mostrarModalCoordenadas = function(mensaje) {
    const modal = document.getElementById('customModalCoord');
    const msgEl = document.getElementById('customModalCoordMsg');
    if (msgEl && mensaje) msgEl.innerText = mensaje;
    if (modal) modal.style.display = 'flex';
};

window.cerrarModalCoordenadas = function() {
    const modal = document.getElementById('customModalCoord');
    if (modal) modal.style.display = 'none';
};

function mostrarAlertaCatastro(mensaje, tipo) {
    const alertaDiv = document.getElementById('alertaCatastro');
    if (alertaDiv) {
        alertaDiv.style.display = 'block'; alertaDiv.innerText = mensaje;
        alertaDiv.style.backgroundColor = tipo === 'error' ? '#ff7675' : '#55efc4';
        setTimeout(() => { alertaDiv.style.display = 'none'; }, 5000);
    }
}

function mostrarAlertaPlano(mensaje, tipo) {
    const alertaDiv = document.getElementById('alertaPlano');
    if (alertaDiv) {
        alertaDiv.style.display = 'block'; alertaDiv.innerText = mensaje;
        alertaDiv.style.backgroundColor = tipo === 'error' ? '#ff7675' : '#55efc4';
        setTimeout(() => { alertaDiv.style.display = 'none'; }, 5000);
    }
}


// ============================================================================
// [CORREGIDO] ETAPA 7: MÓDULO LATERAL "GESTIÓN CATASTRAL" (BÚSQUEDA LOCAL)
// ============================================================================

window.buscarCatastro = function() {
    // Obtener valores y limpiar
    const finca = document.getElementById('inputFinca') ? document.getElementById('inputFinca').value.trim().toLowerCase() : '';
    const tomo = document.getElementById('inputTomo') ? document.getElementById('inputTomo').value.trim().toLowerCase() : '';
    const folio = document.getElementById('inputFolio') ? document.getElementById('inputFolio').value.trim().toLowerCase() : '';
    const propietario = document.getElementById('inputPropietario') ? document.getElementById('inputPropietario').value.trim().toLowerCase() : '';

    // Verificar si los datos están cargados
    if (!geoJsonDataGlobal || !geoJsonDataGlobal.features) {
        mostrarAlertaCatastro("Error: Los datos no se han cargado aún.", "error");
        return;
    }

    // Filtrar en memoria local
    const featuresFiltradas = geoJsonDataGlobal.features.filter(f => {
        const p = f.properties || {};
        
        // Normalizar campos (pueden venir como número o string en el JSON)
        const valFinca = String(p.FINCA || p.finca || '').toLowerCase();
        const valTomo = String(p.TOMO || p.tomo || '').toLowerCase();
        const valFolio = String(p.FOLIO || p.folio || '').toLowerCase();
        const valPropietario = String(p.PROPIETARIO || p.propietario || '').toLowerCase();

        // Condicionales de búsqueda (AND)
        const matchFinca = finca === '' || valFinca.includes(finca);
        const matchTomo = tomo === '' || valTomo.includes(tomo);
        const matchFolio = folio === '' || valFolio.includes(folio);
        const matchPropietario = propietario === '' || valPropietario.includes(propietario);

        return matchFinca && matchTomo && matchFolio && matchPropietario;
    });

    // Manejar resultados
    if (featuresFiltradas.length > 0) {
        // Limpiar resaltado previo
        if (capaSeleccionadaGeoJSON) map.removeLayer(capaSeleccionadaGeoJSON);

        // Crear FeatureCollection temporal
        const datasetFiltrado = { type: "FeatureCollection", features: featuresFiltradas };

        // Crear capa de resaltado
        capaSeleccionadaGeoJSON = L.geoJSON(datasetFiltrado, { 
            style: { color: '#ff007f', weight: 4, fillOpacity: 0.3, dashArray: '5, 5' } 
        });
        
        // Configurar clic en los resultados para ver atributos
        configurarClickAtributos(capaSeleccionadaGeoJSON);
        capaSeleccionadaGeoJSON.addTo(map);
        
        // Zoom a los resultados
        try { map.fitBounds(capaSeleccionadaGeoJSON.getBounds(), { padding: [50, 50] }); } catch (e) { }
        
        const total = featuresFiltradas.length;
        mostrarAlertaCatastro(`¡Búsqueda exitosa: ${total} predio(s) localizado(s)!`, "success");
    } else {
        mostrarAlertaCatastro("Sin coincidencias. Verifique los datos.", "error");
        if (capaSeleccionadaGeoJSON) map.removeLayer(capaSeleccionadaGeoJSON);
    }
};

// Función de limpieza (Mantenida igual)
window.limpiarFiltroCatastro = function() {
    ['inputFinca', 'inputTomo', 'inputFolio', 'inputUbicacion', 'inputPropietario'].forEach(id => {
        const elem = document.getElementById(id); if(elem) elem.value = '';
    });
    const alerta = document.getElementById('alertaCatastro'); if(alerta) alerta.style.display = 'none';
    if(capaSeleccionadaGeoJSON) map.removeLayer(capaSeleccionadaGeoJSON);
    if(capaClicTemporal) map.removeLayer(capaClicTemporal);
    document.getElementById('attributeFloatingPanel').style.display = 'none';
};

// Eventos Enter en inputs
['inputFinca', 'inputTomo', 'inputFolio', 'inputUbicacion', 'inputPropietario'].forEach(id => {
    const elem = document.getElementById(id);
    if(elem) elem.addEventListener('keypress', e => { if(e.key === 'Enter') buscarCatastro(); });
});


// ============================================================================
// [CORREGIDO] ETAPA 8: BÚSQUEDA DE PLANOS Y AUTOCOMPLETADO (LOCAL)
// ============================================================================

// Función para resaltar y mostrar plano (Sustituye WFS por búsqueda local)
window.mostrarPlanoYResaltarGeo = function(nombreArchivo) {
    const imgElement = document.getElementById('planoImg');
    const placeholder = document.getElementById('textoPlanoPlaceholder');
    // Limpiar nombre y asegurar .jpg
    const numeroPlano = nombreArchivo.replace(/\.[^/.]+$/, "").trim();
    const nombreArchivoJpg = numeroPlano + ".jpg";
    
    // Preparar visor
    if(imgElement && placeholder) {
        imgElement.style.display = 'none'; placeholder.style.display = 'block'; placeholder.innerText = "Cargando plano...";
    }

    if (!geoJsonDataGlobal) return;

    // Buscar predio asociado en el JSON local
    const featureEncontrada = geoJsonDataGlobal.features.find(f => {
        const p = f.properties || {};
        // Buscar en campos PLANO o imagen (Case Insensitive)
        const valPlano = String(p.PLANO || p.plano || p.imagen || p.IMAGEN || '').toLowerCase();
        return valPlano.includes(numeroPlano.toLowerCase());
    });

    if (featureEncontrada) {
        // Resaltar en mapa
        if(capaSeleccionadaGeoJSON) map.removeLayer(capaSeleccionadaGeoJSON);
        capaSeleccionadaGeoJSON = L.geoJSON(featureEncontrada, { 
            style: { color: '#ff007f', weight: 4, fillOpacity: 0.4 } 
        });
        configurarClickAtributos(capaSeleccionadaGeoJSON);
        capaSeleccionadaGeoJSON.addTo(map);
        try { map.fitBounds(capaSeleccionadaGeoJSON.getBounds(), { padding: [50, 50] }); } catch (e) { }

        // Cargar imagen desde carpeta local 'planos/'
        if(imgElement && placeholder) {
            imgElement.src = RUTA_PLANOS + nombreArchivoJpg;
            imgElement.style.cursor = "pointer";
            imgElement.title = "Haz clic para pantalla completa";
            imgElement.onclick = () => window.open(imgElement.src, '_blank');
            imgElement.onload = () => { placeholder.style.display = 'none'; imgElement.style.display = 'block'; };
            imgElement.onerror = () => {
                imgElement.style.display = 'none'; placeholder.style.display = 'block';
                placeholder.innerHTML = `⚠️ Imagen no hallada en carpeta /planos para: <br><b>${nombreArchivoJpg}</b>`;
            };
        }
        mostrarAlertaPlano("Predio localizado: " + numeroPlano, "success");
    } else {
        // No se encontró geometría pero intentamos cargar la imagen igual
        if(imgElement && placeholder) {
             imgElement.src = RUTA_PLANOS + nombreArchivoJpg;
             imgElement.onload = () => { placeholder.style.display = 'none'; imgElement.style.display = 'block'; };
             imgElement.onerror = () => {
                imgElement.style.display = 'none'; placeholder.style.display = 'block';
                placeholder.innerHTML = `⚠️ No se encontró predio ni imagen para: <br><b>${numeroPlano}</b>`;
             };
        }
        mostrarAlertaPlano("⚠️ Imagen cargada pero no se localizó predio asociado.", "error");
        if(capaSeleccionadaGeoJSON) map.removeLayer(capaSeleccionadaGeoJSON);
    }
};

// Autocompletado local (Sustituye WFS)
function setupPlanoAutocomplete() {
    const input = document.getElementById('inputPlanoSearch');
    const lista = document.getElementById('listaSugerenciasPlanos');
    if(!input || !lista) return;

    input.addEventListener('input', function() {
        const valor = this.value.trim().toLowerCase();
        lista.innerHTML = '';
        
        if(valor.length < 2 || !geoJsonDataGlobal) {  lista.style.display = 'none'; return;  }

        // Extraer planos únicos del JSON que coincidan
        const planosCoincidentes = new Set();
        geoJsonDataGlobal.features.forEach(f => {
            const p = f.properties || {};
            const valPlano = String(p.PLANO || p.plano || p.imagen || p.IMAGEN || '');
            if (valPlano.toLowerCase().includes(valor)) {
                // Limpiar ruta si existe y extensión
                const nombreLimpio = valPlano.split(/[\\/]/).pop().replace(/\.[^/.]+$/, "").trim();
                if (nombreLimpio) planosCoincidentes.add(nombreLimpio);
            }
            if (planosCoincidentes.size >= 10) return; // Límite sugerencias
        });

        if(planosCoincidentes.size > 0) {
            lista.style.display = 'block';
            planosCoincidentes.forEach(numPlano => {
                const li = document.createElement('li');
                li.innerText = numPlano;
                li.style.cssText = "padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee; background: #fff; list-style: none; color:#333;";
                li.onmouseover = () => li.style.background = "#f1f2f6";
                li.onmouseout = () => li.style.background = "#fff";
                li.onclick = () => { input.value = numPlano; lista.style.display = 'none'; window.mostrarPlanoYResaltarGeo(numPlano);  };
                lista.appendChild(li);
            });
        } else { lista.style.display = 'none'; }
    });

    document.addEventListener('click', e => { if(!input.contains(e.target)) lista.style.display = 'none'; });
    input.addEventListener('keypress', e => { if(e.key === 'Enter') { lista.style.display = 'none'; buscarPlanoManual(); } });
}
document.addEventListener("DOMContentLoaded", setupPlanoAutocomplete);

window.buscarPlanoManual = function() {
    const input = document.getElementById('inputPlanoSearch');
    if(input && input.value.trim() !== "") window.mostrarPlanoYResaltarGeo(input.value.trim());
};


// ============================================================================
// [CORREGIDO] ETAPA 9: INTERACCIÓN Y PANEL DE ATRIBUTOS (LECTURA JSON)
// ============================================================================

// Función unificada para configurar el clic en CUALQUIER layer cargada
function configurarClickEnLayer(layer) {
    layer.on('click', function(e) {
        // Detener propagación para no activar el clic del mapa de fondo
        if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
        
        // Obtener propiedades directamente del Feature
        const props = e.target.feature.properties || {};
        
        // Extraer y validar centroide para Street View
        let centroide;
        if (typeof e.target.getBounds === 'function') {
            centroide = e.target.getBounds().getCenter();
        } else { centroide = e.latlng; }

        // Mapear atributos asegurando que salgan todos
        const datosMapa = {
            finca: props.FINCA || props.finca || props.Finca || '-',
            tomo: props.TOMO || props.tomo || '-',
            folio: props.FOLIO || props.folio || '-',
            cod_ubi: props.COD_UBICACION || props.codigo_ubicacion || props.cod_ubi || '-',
            propietario: props.PROPIETARIO || props.propietario || props.Nombre || '-',
            superficie: props.SUPERFICIE || props.superficie || props.Area || '-',
            plano_raw: props.PLANO || props.plano || props.imagen || props.IMAGEN || '-'
        };

        // Limpiar nombre del plano para el enlace de imagen
        let nombrePlanoImagen = datosMapa.plano_raw;
        if (nombrePlanoImagen !== '-') {
             // Quitar rutas y asegurar .jpg
             nombrePlanoImagen = nombrePlanoImagen.split(/[\\/]/).pop().replace(/\.[^/.]+$/, "").trim() + ".jpg";
        }

        // Generar HTML del panel asegurando que la tabla cubra todos los datos
        const contenidoHtml = `
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; color: #333;">
                <thead>
                    <tr>
                        <th style="text-align:left; padding: 4px; background: #dfe6e9; border: 1px solid #b2bec3;">Campo</th>
                        <th style="text-align:left; padding: 4px; background: #dfe6e9; border: 1px solid #b2bec3;">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding: 4px; border: 1px solid #dfe6e9; font-weight:bold;">FINCA</td><td style="padding: 4px; border: 1px solid #dfe6e9;">${datosMapa.finca}</td></tr>
                    <tr><td style="padding: 4px; border: 1px solid #dfe6e9; font-weight:bold;">TOMO</td><td style="padding: 4px; border: 1px solid #dfe6e9;">${datosMapa.tomo}</td></tr>
                    <tr><td style="padding: 4px; border: 1px solid #dfe6e9; font-weight:bold;">FOLIO</td><td style="padding: 4px; border: 1px solid #dfe6e9;">${datosMapa.folio}</td></tr>
                    <tr><td style="padding: 4px; border: 1px solid #dfe6e9; font-weight:bold;">UBICACIÓN</td><td style="padding: 4px; border: 1px solid #dfe6e9;">${datosMapa.cod_ubi}</td></tr>
                    <tr><td style="padding: 4px; border: 1px solid #dfe6e9; font-weight:bold;">PROPIETARIO</td><td style="padding: 4px; border: 1px solid #dfe6e9; word-break:break-all;">${datosMapa.propietario}</td></tr>
                    <tr><td style="padding: 4px; border: 1px solid #dfe6e9; font-weight:bold;">SUPERFICIE</td><td style="padding: 4px; border: 1px solid #dfe6e9;">${datosMapa.superficie}</td></tr>
                    <tr><td style="padding: 4px; border: 1px solid #dfe6e9; font-weight:bold;">PLANO REF.</td><td style="padding: 4px; border: 1px solid #dfe6e9; word-break:break-all;">${datosMapa.plano_raw}</td></tr>
                </tbody>
            </table>

            <button onclick="window.abrirStreetView(${centroide.lat}, ${centroide.lng})" style="width: 100%; background: #e67e22; color: white; border: none; padding: 8px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px; margin-bottom: 10px;">
                🚗 Ver Navegación 3D
            </button>

            <div style="text-align: center; font-weight: bold; color: #2d3436; font-size:12px; margin-bottom: 5px;">Vista del Plano:</div>
            <div style="width: 100%; background: #f8f9fa; border: 1px solid #dfe6e9; border-radius: 4px; overflow: hidden; min-height: 100px; display: flex; align-items: center; justify-content: center;">
                ${nombrePlanoImagen !== '-' ? `
                    <img src="${RUTA_PLANOS}${nombrePlanoImagen}" 
                         style="width: 100%; cursor: pointer; display: block;" 
                         title="Clic para pantalla completa" 
                         onclick="window.open(this.src, '_blank')"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                    <div style="display: none; padding: 10px; font-size: 10px; color: #d63031;">⚠️ Imagen no hallada en /planos: <br><b>${nombrePlanoImagen}</b></div>
                ` : `<span style="font-size: 11px; color: #b2bec3; padding: 10px;">No hay plano asociado</span>`}
            </div>
        `;

        // Mostrar panel
        const panel = document.getElementById('attributeFloatingPanel');
        const bodyContent = document.getElementById('attributePanelBody');
        if (panel && bodyContent) { bodyContent.innerHTML = contenidoHtml; panel.style.display = 'block'; }
    });
}

// Mantener compatibilidad con funciones antiguas si se llaman
window.configurarClickAtributos = function(capa) {
    capa.eachLayer(layer => configurarClickEnLayer(layer));
};


// [CORREGIDO] Clic directo en el mapa (Consulta espacial local)
map.on('click', function(e) {
    if (!geoJsonDataGlobal || !capaCatastralGlobal) return;

    // Ocultar panel previo
    document.getElementById('attributeFloatingPanel').style.display = 'none';
    if (capaClicTemporal) map.removeLayer(capaClicTemporal);

    // Leaflet Pip (Point in Polygon) local. Requeriría librería extra, 
    // pero usaremos una aproximación simple iterando las layers cargadas.
    let layerEncontrada = null;

    // Iterar sobre la capa global cargada para buscar cuál contiene el punto
    capaCatastralGlobal.eachLayer(function(layer) {
        if (layerEncontrada) return; // Parar si ya encontramos una
        
        if (typeof layer.getBounds === 'function' && layer.getBounds().contains(e.latlng)) {
            // Aproximación por Bounds (rápida). Para precisión exacta en polígonos complejos
            // se necesitaría leaflet-pip.js. Para fincas rectangulares sirve.
            layerEncontrada = layer;
        }
    });

    if (layerEncontrada) {
        // Resaltar
        capaClicTemporal = L.geoJSON(layerEncontrada.feature, {
            style: { color: '#00cec9', weight: 3, fillOpacity: 0.2, pointerEvents: 'none' }
        }).addTo(map);

        // Simular clic en la layer encontrada para disparar el panel de atributos
        layerEncontrada.fire('click', { latlng: e.latlng });
    }
});


// ============================================================================
// ETAPA 10: MANEJO DEL PANEL (DRAG & DROP) (Mantenido igual)
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    const panel = document.getElementById('attributeFloatingPanel');
    const header = document.getElementById('attributePanelHeader');
    const closeBtn = document.getElementById('closeAttributeBtn');

    if (panel) { L.DomEvent.disableClickPropagation(panel); L.DomEvent.disableScrollPropagation(panel); }
    if (closeBtn && panel) closeBtn.addEventListener('click', () => panel.style.display = 'none');

    if (panel && header) {
        let isDragging = false; let startX, startY, initialLeft, initialTop;
        header.addEventListener('mousedown', function(e) {
            if (e.target.closest('#closeAttributeBtn')) return;
            isDragging = true; startX = e.clientX; startY = e.clientY;
            const rect = panel.getBoundingClientRect(); initialLeft = rect.left; initialTop = rect.top;
            panel.style.position = 'fixed'; panel.style.left = initialLeft + 'px'; panel.style.top = initialTop + 'px';
            panel.style.right = 'auto'; panel.style.bottom = 'auto'; panel.style.transform = 'none';
            e.preventDefault();
        });
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            panel.style.left = (initialLeft + (e.clientX - startX)) + 'px';
            panel.style.top = (initialTop + (e.clientY - startY)) + 'px';
        });
        document.addEventListener('mouseup', () => isDragging = false);
    }
});
