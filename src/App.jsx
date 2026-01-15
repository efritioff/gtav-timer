import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./App.css";

import {
  MapContainer,
  ImageOverlay,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import { Icon, CRS } from "leaflet";

const BUSINESS_IDS = [
  "bunker",
  "cocaine",
  "meth",
  "counterfeit-cash",
  "weed",
  "doc-forgery",
  "acid",
  "nightclub",
  "import-export",
];

const BUSINESS_BLIP_IDS = {
  bunker: 557,
  cocaine: 497,
  meth: 499,
  "counterfeit-cash": 500,
  weed: 496,
  "doc-forgery": 498,
  acid: 840,
  nightclub: 614,
  "import-export": 524,
};

const BUSINESS_NAMES = {
  bunker: "Bunker",
  cocaine: "Cocaine",
  meth: "Meth",
  "counterfeit-cash": "Counterfeit Cash",
  weed: "Weed",
  "doc-forgery": "Doc. Forgery",
  acid: "Acid",
  nightclub: "Nightclub",
  "import-export": "Import / Export",
};

// Production times: How long it takes to convert 100% supplies to 100% product (in seconds)
// Based on actual GTA Online timings
const PRODUCTION_TIME_SECONDS = {
  cocaine: 2 * 3600, // 2 hours
  meth: 2.5 * 3600, // 2.5 hours
  "counterfeit-cash": 2.3 * 3600, // 2.3 hours
  weed: 3 * 3600, // 3 hours
  "doc-forgery": 4 * 3600, // 4 hours
  bunker: 11 * 3600 + 40 * 60, // 11 hours 40 minutes
  acid: 4 * 3600, // 4 hours
  nightclub: 20 * 3600, // ~20 hours (passive, estimate)
  "import-export": 0, // No automatic production
};

function App() {
  const [activeBusinessPopup, setActiveBusinessPopup] = useState(null);
  const [ownedBusinesses, setOwnedBusinesses] = useState(() => {
    try {
      const saved = localStorage.getItem("ownedBusinesses");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [businessData, setBusinessData] = useState(() => {
    try {
      const saved = localStorage.getItem("businessData");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [businessLocations, setBusinessLocations] = useState(() => {
    try {
      const saved = localStorage.getItem("businessLocations");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [pickingLocationFor, setPickingLocationFor] = useState(null);
  const [choice1, setChoice1] = useState("no");
  const [choice3, setChoice3] = useState("no");
  const [isPaused, setIsPaused] = useState(false);
  const [selectedMarkerIndex, setSelectedMarkerIndex] = useState(0);

  useEffect(() => {
    const sliders = document.querySelectorAll(".slider");
    const updateValue = (el) => el.style.setProperty("--value", el.value);

    sliders.forEach((el) => {
      updateValue(el);
      const handler = () => updateValue(el);
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });
  }, [businessData]);

  useEffect(() => {
    localStorage.setItem(
      "ownedBusinesses",
      JSON.stringify(Array.from(ownedBusinesses))
    );
  }, [ownedBusinesses]);

  useEffect(() => {
    localStorage.setItem("businessData", JSON.stringify(businessData));
  }, [businessData]);

  useEffect(() => {
    localStorage.setItem(
      "businessLocations",
      JSON.stringify(businessLocations)
    );
  }, [businessLocations]);

  // Production system: Convert supplies to product based on real GTA Online timings
  useEffect(() => {
    const interval = setInterval(() => {
      // Skip production if paused
      if (isPaused) return;

      setBusinessData((prev) => {
        const updated = { ...prev };
        let hasChanges = false;

        // Process each owned business
        ownedBusinesses.forEach((businessId) => {
          const supplies = updated[businessId]?.supplies ?? 0;
          const product = updated[businessId]?.product ?? 0;
          const productionTime = PRODUCTION_TIME_SECONDS[businessId] ?? 0;

          // Only produce if there are supplies, production hasn't maxed out, and time is configured
          if (supplies > 0 && product < 100 && productionTime > 0) {
            // Calculate how much to change per second (as percentage)
            const ratePerSecond = 100 / productionTime;

            const newSupplies = Math.max(0, supplies - ratePerSecond);
            const newProduct = Math.min(100, product + ratePerSecond);

            updated[businessId] = {
              ...updated[businessId],
              supplies: newSupplies,
              product: newProduct,
            };
            hasChanges = true;
          }
        });

        return hasChanges ? updated : prev;
      });
    }, 1000); // Run every second

    return () => clearInterval(interval);
  }, [ownedBusinesses, isPaused]);

  // markers
  // Example markers in pixel coordinates [x, y] relative to the 8192x8192 image
  // custom byggt blipId (geocode=leaflet popUp=leaflet blipId=Custom)
  // TODO ta bort const markers = [...] listan och istället använda fetch från en marker.json fil
  const markers = [
    // nightclub
    { geocode: [4225, 1075], popUp: "Elysian Island", blipId: 614 },
    { geocode: [3720, 1500], popUp: "LSIA", blipId: 614 },
    { geocode: [4605, 1660], popUp: "Cypress Flats", blipId: 614 },
    { geocode: [4520, 2120], popUp: "La Mesa", blipId: 614 },
    { geocode: [4025, 2125], popUp: "Strawberry", blipId: 614 },
    { geocode: [3440, 2200], popUp: "Vespucci Canals", blipId: 614 },
    { geocode: [3400, 2470], popUp: "Del Perro", blipId: 614 },
    { geocode: [4310, 2290], popUp: "Mission Row", blipId: 614 },
    { geocode: [4090, 2960], popUp: "West Vinewood", blipId: 614 },
    { geocode: [4300, 2970], popUp: "Downtown Vinewood", blipId: 614 },
    // bunker
    { geocode: [2345, 3620], popUp: "Chumash bunker", blipId: 557 },
    { geocode: [2390, 4690], popUp: "Lago Zancudo", blipId: 557 },
    { geocode: [5000, 4100], popUp: "Farmhouse", blipId: 557 },
    { geocode: [4550, 4580], popUp: "Route 68", blipId: 557 },
    { geocode: [4350, 4550], popUp: "Grand Senora Oilfields", blipId: 557 },
    { geocode: [4095, 4510], popUp: "Grand Senora Dessert", blipId: 557 },
    { geocode: [5280, 4710], popUp: "Smoke Tree Road", blipId: 557 },
    { geocode: [5500, 4600], popUp: "Thomson Scrapyard", blipId: 557 },
    { geocode: [3660, 6180], popUp: "Paleto Forest", blipId: 557 },
    { geocode: [3890, 5275], popUp: "Raton Canyon", blipId: 557 },
    { geocode: [5120, 5470], popUp: "Grapeseed", blipId: 557 },
    // cocaine lockup
    { geocode: [3970, 1390], popUp: "Elysian Island", blipId: 497 },
    { geocode: [3285, 2625], popUp: "Morningwood", blipId: 497 },
    { geocode: [4310, 4830], popUp: "Alamo Sea", blipId: 497 },
    { geocode: [4120, 6480], popUp: "Paleto Bay", blipId: 497 },
    // Weed Farm
    { geocode: [4190, 1480], popUp: "Elysian Island", blipId: 496 },
    { geocode: [4170, 2946], popUp: "Downtown Vinewood", blipId: 496 },
    {
      geocode: [5710, 5340],
      popUp: "San Chianski Mountain Range",
      blipId: 496,
    },
    { geocode: [4340, 6490], popUp: "Mount Chiliad", blipId: 496 },
    // Counterfeit Cash Factory
    { geocode: [4500, 1370], popUp: "Paleto Bay", blipId: 500 },
    { geocode: [3445, 2065], popUp: "Vespucci Canals", blipId: 500 },
    { geocode: [4190, 4230], popUp: "Grand Senora Desert", blipId: 500 },
    { geocode: [4500, 4400], popUp: "Cypress Flats", blipId: 500 },
    // Meth Lab
    { geocode: [4760, 1100], popUp: "Terminal", blipId: 499 },
    { geocode: [4920, 1940], popUp: "El Burro Heights", blipId: 499 },
    { geocode: [4750, 1100], popUp: "Strawberry", blipId: 499 },
    { geocode: [4760, 1100], popUp: "Strawberry", blipId: 499 },
  ];

  const getIcon = (blipId, opacity = 1) =>
    new Icon({
      iconUrl: `/blips/Blip_${blipId}.png`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
      className: opacity < 1 ? "dimmed-marker" : "",
    });

  const customIcon = new Icon({
    iconUrl: "/blips/Blip_11.png",
    iconSize: [24, 24],
  });

  // Image parameters
  const imgWidth = 8192;
  const imgHeight = 8192;
  const bounds = [
    [0, 0],
    [imgHeight, imgWidth],
  ]; // top-left -> bottom-right

  // Start position (center of image)
  const position = [imgHeight / 2, imgWidth / 2];

  const handleApplyBusinessSetup = () => {
    const newOwned = new Set(ownedBusinesses);
    if (choice1 === "yes") {
      newOwned.add(activeBusinessPopup);
    } else {
      newOwned.delete(activeBusinessPopup);
    }
    setOwnedBusinesses(newOwned);
    setActiveBusinessPopup(null);
  };

  const handleOpenBusinessSettings = (businessId) => {
    setChoice1(ownedBusinesses.has(businessId) ? "yes" : "no");
    setActiveBusinessPopup(businessId);
  };

  const getBusinessValue = (businessId, key) => {
    return businessData[businessId]?.[key] ?? 0;
  };

  const setBusinessValue = (businessId, key, value) => {
    setBusinessData((prev) => ({
      ...prev,
      [businessId]: { ...prev[businessId], [key]: value },
    }));
  };

  const handleResupply = (businessId) => {
    setBusinessValue(businessId, "supplies", 100);
  };

  const handleSell = (businessId) => {
    setBusinessValue(businessId, "product", 0);
  };

  const handleSetLocation = () => {
    // Save the owned status before closing the popup
    const newOwned = new Set(ownedBusinesses);
    if (choice1 === "yes") {
      newOwned.add(activeBusinessPopup);
    } else {
      newOwned.delete(activeBusinessPopup);
    }
    setOwnedBusinesses(newOwned);

    setPickingLocationFor(activeBusinessPopup);
    setSelectedMarkerIndex(0);
    setActiveBusinessPopup(null);
  };

  const handleCancelLocationPicking = () => {
    setPickingLocationFor(null);
    setSelectedMarkerIndex(0);
  };

  const handleConfirmLocation = () => {
    const selectedMarker = getRelevantMarkers()[selectedMarkerIndex];
    if (selectedMarker) {
      setBusinessLocations((prev) => ({
        ...prev,
        [pickingLocationFor]: selectedMarker.geocode,
      }));
    }
    setPickingLocationFor(null);
    setSelectedMarkerIndex(0);
  };

  const handlePreviousMarker = () => {
    const markers = getRelevantMarkers();
    setSelectedMarkerIndex((prev) =>
      prev === 0 ? markers.length - 1 : prev - 1
    );
  };

  const handleNextMarker = () => {
    const markers = getRelevantMarkers();
    setSelectedMarkerIndex((prev) =>
      prev === markers.length - 1 ? 0 : prev + 1
    );
  };

  const getRelevantMarkers = () => {
    if (!pickingLocationFor) return [];
    const blipId = BUSINESS_BLIP_IDS[pickingLocationFor];
    return markers.filter((marker) => marker.blipId === blipId);
  };

  const handleMapClick = (latlng) => {
    if (pickingLocationFor) {
      setBusinessLocations((prev) => ({
        ...prev,
        [pickingLocationFor]: [latlng.lng, latlng.lat],
      }));
      setPickingLocationFor(null);
      setSelectedMarkerIndex(0);
    }
  };

  const renderBusinessContent = (businessId) => {
    const productValue = getBusinessValue(businessId, "product");
    const suppliesValue = getBusinessValue(businessId, "supplies");

    // Show if owned OR if popup is open with Owned:Yes selected OR picking location for this business
    const shouldShow =
      ownedBusinesses.has(businessId) ||
      (activeBusinessPopup === businessId && choice1 === "yes") ||
      pickingLocationFor === businessId;

    return (
      <div
        className="content"
        style={{ display: shouldShow ? "block" : "none" }}
      >
        <table>
          <tbody>
            <tr className="product">
              <td>
                <span>Product</span>
              </td>
              <td>
                <input
                  type="range"
                  className="slider product-slider"
                  min="0"
                  max="100"
                  value={productValue}
                  onChange={(e) =>
                    setBusinessValue(
                      businessId,
                      "product",
                      parseInt(e.target.value)
                    )
                  }
                />
              </td>
            </tr>
            <tr className="supplies">
              <td>
                <span>Supplies</span>
              </td>
              <td>
                <input
                  type="range"
                  className="slider supplies-slider"
                  min="0"
                  max="100"
                  value={suppliesValue}
                  onChange={(e) =>
                    setBusinessValue(
                      businessId,
                      "supplies",
                      parseInt(e.target.value)
                    )
                  }
                />
              </td>
            </tr>
          </tbody>
        </table>
        <div className="button-row">
          <button
            className="button green"
            onClick={() => handleResupply(businessId)}
          >
            Resupply
          </button>
          <button
            className="button blue"
            onClick={() => handleSell(businessId)}
          >
            Sell
          </button>
        </div>
      </div>
    );
  };

  const MapClickHandler = () => {
    useMapEvents({
      click: (e) => {
        if (pickingLocationFor) {
          handleMapClick(e.latlng);
        }
      },
    });
    return null;
  };

  const cogIcon = (
    <path d="M487.4 315.7l-42.6-24.6c4.3-23.2 4.3-47 0-70.2l42.6-24.6c4.9-2.8 7.1-8.6 5.5-14-11.1-35.6-30-67.8-54.7-94.6-3.8-4.1-10-5.1-14.8-2.3L380.8 110c-17.9-15.4-38.5-27.3-60.8-35.1V25.8c0-5.6-3.9-10.5-9.4-11.7-36.7-8.2-74.3-7.8-109.2 0-5.5 1.2-9.4 6.1-9.4 11.7V75c-22.2 7.9-42.8 19.8-60.8 35.1L88.7 85.5c-4.9-2.8-11-1.9-14.8 2.3-24.7 26.7-43.6 58.9-54.7 94.6-1.7 5.4.6 11.2 5.5 14L67.3 221c-4.3 23.2-4.3 47 0 70.2l-42.6 24.6c-4.9 2.8-7.1 8.6-5.5 14 11.1 35.6 30 67.8 54.7 94.6 3.8 4.1 10 5.1 14.8 2.3l42.6-24.6c17.9 15.4 38.5 27.3 60.8 35.1v49.2c0 5.6 3.9 10.5 9.4 11.7 36.7 8.2 74.3 7.8 109.2 0 5.5-1.2 9.4-6.1 9.4-11.7v-49.2c22.2-7.9 42.8-19.8 60.8-35.1l42.6 24.6c4.9 2.8 11 1.9 14.8-2.3 24.7-26.7 43.6-58.9 54.7-94.6 1.5-5.5-.7-11.3-5.6-14.1zM256 336c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z" />
  );

  return (
    <div className="app-container">
      {activeBusinessPopup && (
        <div id="backdrop" onClick={() => setActiveBusinessPopup(null)}></div>
      )}
      <div
        id="popup"
        style={{ display: activeBusinessPopup ? "block" : "none" }}
      >
        <div id="heading">
          <h1>Business Setup</h1>
        </div>
        <div id="main">
          <div id="choice1">
            <p>Owned:</p>
            <div className="button-group">
              <button
                className={choice1 === "yes" ? "active" : ""}
                onClick={() => setChoice1("yes")}
              >
                Yes
              </button>
              <button
                className={choice1 === "no" ? "active" : ""}
                onClick={() => setChoice1("no")}
              >
                No
              </button>
            </div>
          </div>
          <div id="choice2">
            <p>Map location:</p>
            <div className="button-group">
              <button
                onClick={handleSetLocation}
                disabled={choice1 !== "yes"}
                style={{
                  opacity: choice1 !== "yes" ? 0.5 : 1,
                  cursor: choice1 !== "yes" ? "not-allowed" : "pointer",
                }}
              >
                {businessLocations[activeBusinessPopup]
                  ? "Change Location"
                  : "Set Location"}
              </button>
            </div>
          </div>
          <div id="choice3">
            <p>Upgrade:</p>
            <div className="button-group">
              <button
                className={choice3 === "yes" ? "active" : ""}
                onClick={() => setChoice3("yes")}
              >
                Yes
              </button>
              <button
                className={choice3 === "no" ? "active" : ""}
                onClick={() => setChoice3("no")}
              >
                No
              </button>
            </div>
          </div>
        </div>
        <div id="buttons">
          <button onClick={() => setActiveBusinessPopup(null)}>Cancel</button>
          <button onClick={handleApplyBusinessSetup}>Apply</button>
        </div>
      </div>
      <div className="map-section">
        {pickingLocationFor && (
          <div className="location-picker">
            <button
              className="location-picker-nav"
              onClick={handlePreviousMarker}
              title="Previous location"
            >
              &lt;
            </button>
            <span className="location-picker-name">
              {getRelevantMarkers()[selectedMarkerIndex]?.popUp ||
                "Custom Location"}
            </span>
            <button
              className="location-picker-nav"
              onClick={handleNextMarker}
              title="Next location"
            >
              &gt;
            </button>
            <button
              className="location-picker-confirm"
              onClick={handleConfirmLocation}
              title="Confirm location"
            >
              ✓
            </button>
            <button
              className="location-picker-cancel"
              onClick={handleCancelLocationPicking}
              title="Cancel"
            >
              ✕
            </button>
            <span className="location-picker-instruction">
              Click on map to set custom location
            </span>
          </div>
        )}
        <button
          className="pause-button"
          onClick={() => setIsPaused(!isPaused)}
          title={isPaused ? "Resume production" : "Pause production"}
        >
          {isPaused ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 384 512"
              width="20"
              height="20"
              fill="white"
            >
              <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 320 512"
              width="20"
              height="20"
              fill="white"
            >
              <path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z" />
            </svg>
          )}
        </button>
        <MapContainer
          crs={CRS.Simple}
          bounds={bounds}
          className={pickingLocationFor ? "picking-location" : ""}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
          minZoom={-3}
          maxZoom={2}
        >
          <ImageOverlay url="/dark-map.svg" bounds={bounds} />
          <MapClickHandler />

          {pickingLocationFor &&
            getRelevantMarkers().map((marker, index) => (
              <Marker
                key={index}
                position={[marker.geocode[1], marker.geocode[0]]}
                icon={getIcon(
                  marker.blipId,
                  index === selectedMarkerIndex ? 1 : 0.6
                )}
                opacity={index === selectedMarkerIndex ? 1 : 0.6}
                eventHandlers={{
                  click: () => setSelectedMarkerIndex(index),
                }}
              >
                <Popup>{marker.popUp}</Popup>
              </Marker>
            ))}

          {!pickingLocationFor &&
            Object.entries(businessLocations).map(([businessId, location]) => (
              <Marker
                key={`business-${businessId}`}
                position={[location[1], location[0]]}
                icon={getIcon(BUSINESS_BLIP_IDS[businessId])}
              >
                <Popup>{BUSINESS_NAMES[businessId]}</Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
      <div className="content-section">
        <h2>Gta timer</h2>

        {BUSINESS_IDS.sort((a, b) => {
          const aOwned = ownedBusinesses.has(a);
          const bOwned = ownedBusinesses.has(b);
          if (aOwned && !bOwned) return -1;
          if (!aOwned && bOwned) return 1;
          return 0;
        }).map((businessId) => {
          const businessImages = {
            bunker: "bunker.png",
            cocaine: "coke.png",
            meth: "meth.png",
            "counterfeit-cash": "cash.png",
            weed: "weed.png",
            "doc-forgery": "doc.png",
            acid: "acid.png",
            nightclub: "nightclub.png",
            "import-export": "import-export.png",
          };

          return (
            <div key={businessId} id={`business ${businessId}`}>
              <div className="b-header">
                <img src={`\\business\\${businessImages[businessId]}`} alt="" />
                <h1>{BUSINESS_NAMES[businessId]}</h1>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  width="28"
                  height="28"
                  fill="white"
                  onClick={() => handleOpenBusinessSettings(businessId)}
                  style={{ cursor: "pointer", padding: "2px 6px 3px" }}
                >
                  {cogIcon}
                </svg>
              </div>
              {renderBusinessContent(businessId)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
