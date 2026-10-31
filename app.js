//abrevieri
const countyAbbreviations = {
    "Alba Iulia": "AB",
    "Arad": "AR",
    "Pitești": "AG",
    "Bacău": "BC",
    "Oradea": "BH",
    "Bistrița": "BN",
    "Botoșani": "BT",
    "Brașov": "BV",
    "Brăila": "BR",
    "Buzău": "BZ",
    "Reșița": "CS",
    "Călărași": "CL",
    "Cluj-Napoca": "CJ",
    "Constanța": "CT",
    "Sfântu Gheorghe": "CV",
    "Târgoviște": "DB",
    "Craiova": "DJ",
    "Galați": "GL",
    "Giurgiu": "GR",
    "Târgu Jiu": "GJ",
    "Miercurea Ciuc": "HR",
    "Deva": "HD",
    "Slobozia": "IL",
    "Iași": "IS",
    "Buftea": "IF",
    "Baia Mare": "MM",
    "Drobeta-Turnu Severin": "MH",
    "Târgu Mureș": "MS",
    "Piatra Neamț": "NT",
    "Slatina": "OT",
    "Ploiești": "PH",
    "Satu Mare": "SM",
    "Zalău": "SJ",
    "Sibiu": "SB",
    "Suceava": "SV",
    "Alexandria": "TR",
    "Timișoara": "TM",
    "Tulcea": "TL",
    "Vaslui": "VS",
    "Râmnicu Vâlcea": "VL",
    "Focșani": "VN",
    "București": "B",
    "Bucharest": "B"
};

// initial centram mapa
const map = L.map('map').setView([45.9432, 24.9668], 7);

let csvData = {};

// 1. citim din csv rezultate_mxmap.csv
const csvUrl = 'rezultate_mxmap.csv?v=' + new Date().getTime();

Papa.parse(csvUrl, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
        console.log("CSV loaded:", results.data.length, "rows.");

        // indexam csv-ul pentru citire eficienta
        results.data.forEach(row => {
            if (row.itemLabel) {
                //normalizam numele(trim)
                const name = row.itemLabel.trim();
                csvData[name.toLowerCase()] = row;
            }
        });

        //2. citim din GeoJson pt boundaries
        loadGeoJSON();
    },
    error: function (err) {
        console.error("Error loading CSV:", err);
        alert("Nu s-a putut încărca fișierul CSV. Asigură-te că rezultate_mxmap.csv este în același folder.");
    }
});

function loadGeoJSON() {
    fetch('romania-uat.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error("GeoJSON file not found.");
            }
            return response.json();
        })
        .then(geojsonData => {
            renderMap(geojsonData);
        })
        .catch(err => {
            console.error("Error loading GeoJSON:", err);

            // daca lipseste geojson
            document.getElementById('map').innerHTML = `
                <div style="padding: 20px; background: white; text-align: center; font-family: sans-serif; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                    <h2 style="color: #e74c3c;">Lipsește Fișierul GeoJSON</h2>
                    <p>Pentru a desena harta, este necesar un fișier cu limitele geografice.</p>
                    <p>Te rog să citești fișierul <b>README.md</b> pentru instrucțiuni despre cum să descarci <b>romania-uat.geojson</b>.</p>
                </div>
            `;
        });
}

function renderMap(geojsonData) {
    const layer = L.geoJSON(geojsonData, {
        style: function (feature) {
            const geoName = feature.properties.name || feature.properties.natname || feature.properties.UAT;
            const normalizedGeoName = geoName ? geoName.trim().toLowerCase() : "";
            const matchingCsvRow = csvData[normalizedGeoName];

            if (matchingCsvRow) {
                // culoare bazata pe tara RO->verde Alta -> Rosie
                const tara = matchingCsvRow.tara_server ? matchingCsvRow.tara_server.trim().toUpperCase() : "";
                const isRo = (tara === 'RO');

                return {
                    fillColor: isRo ? '#2ecc71' : '#e74c3c',
                    weight: 1.5,
                    opacity: 1,
                    color: '#444444', // intense grey
                    fillOpacity: 0.8
                };
            } else {
                return {
                    fillColor: '#fafafa',
                    weight: 0.5,
                    opacity: 0.5,
                    color: '#cccccc',
                    fillOpacity: 0.2
                };
            }
        },
        filter: function (feature) {
            // scoatem blue pin urile urate cu spume
            if (feature.geometry && feature.geometry.type === 'Point') {
                return false;
            }
            return true;
        },
        onEachFeature: function (feature, layer) {
            const geoName = feature.properties.name || feature.properties.natname || feature.properties.UAT;
            if (!geoName) return;

            const normalizedGeoName = geoName.trim().toLowerCase();

            // 1. locsliati interactive
            const matchingCsvRow = csvData[normalizedGeoName];
            if (matchingCsvRow) {
                const tara = matchingCsvRow.tara_server ? matchingCsvRow.tara_server.trim().toUpperCase() : "";
                const isRo = (tara === 'RO');
                const baseColor = isRo ? '#2ecc71' : '#e74c3c';
                const hoverColor = isRo ? '#27ae60' : '#c0392b'; //responsive la hover
                //highlight la hover
                layer.on({
                    mouseover: function (e) {
                        const target = e.target;
                        target.setStyle({
                            fillColor: hoverColor,
                            weight: 2,
                            color: '#222222',
                            fillOpacity: 0.9
                        });
                        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                            target.bringToFront();
                        }
                    },
                    mouseout: function (e) {

                        layer.setStyle({
                            fillColor: baseColor,
                            weight: 1.5,
                            color: '#444444',
                            fillOpacity: 0.8
                        });
                    }
                });

                //adaugam tooltip pt a avea toata informatia despre localitati
                const cleanEmail = matchingCsvRow.email ? matchingCsvRow.email.replace('mailto:', '') : '';
                let tooltipContent = `
                    <div style="font-family: sans-serif; font-size: 11px; font-weight: normal; line-height: 1.2; white-space: normal; max-width: 220px; word-wrap: break-word; margin: 0; padding: 0;">
                        <b style="font-size: 12px; display: block; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-bottom: 4px;">
                            ${matchingCsvRow.itemLabel}
                        </b>
                        <div style="margin-bottom: 2px;"><b>Email:</b> ${cleanEmail}</div>
                        <div style="margin-bottom: 2px;"><b>Dom.:</b> ${matchingCsvRow.domeniu}</div>
                        <div style="margin-bottom: 2px;"><b>IP:</b> ${matchingCsvRow.ip_server_mail}</div>
                        <div style="margin-bottom: 0;"><b>Țară:</b> ${matchingCsvRow.tara_server}</div>
                    </div>
                `;

                layer.bindTooltip(tooltipContent, {
                    className: 'custom-tooltip',
                    direction: 'auto',
                    sticky: false
                });
            } else {

                layer.options.interactive = false;
            }

            //2. adaugam prescuratarile judetelor
            let abbr = null;
            for (const key in countyAbbreviations) {
                if (key.toLowerCase() === normalizedGeoName) {
                    abbr = countyAbbreviations[key];
                    break;
                }
            }

            if (abbr) {
                try {
                    const center = turf.centerOfMass(feature);
                    const coords = center.geometry.coordinates;
                    const latLng = [coords[1], coords[0]];

                    const icon = L.divIcon({
                        className: 'city-label',
                        html: abbr,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15] //centram
                    });

                    //adaugam label
                    L.marker(latLng, { icon: icon, interactive: false }).addTo(map);
                } catch (e) {
                    console.warn("Could not calculate center for " + geoName);
                }
            }
        }
    }).addTo(map);

    //mutam partile clickable in fata (localitatile)
    layer.eachLayer(function (l) {
        if (l.options.interactive && l.bringToFront) {
            l.bringToFront();
        }
    });

    // facem fit la mapa pe limitele datelor
    map.fitBounds(layer.getBounds());
}
