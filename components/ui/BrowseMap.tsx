"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Link as LinkIcon } from "lucide-react";
import L, { DivIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from "react-leaflet";
import { sellerCountryClusters, sellerStateMarkers } from "@/lib/mockData";

interface BrowseMapProps {
  selectedCountryCode: string;
}

function ZoomWatcher({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (event) => onZoomChange(event.target.getZoom())
  });
  return null;
}

function clusterIcon(count: number): DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="height:36px;width:36px;border-radius:9999px;background:#1D9E75;border:2px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px;box-shadow:0 6px 20px rgba(0,0,0,.4);">${count}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

function sellerIcon(): DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="height:18px;width:18px;border-radius:9999px;background:#1D9E75;border:2px solid #0f1f0f;box-shadow:0 4px 10px rgba(0,0,0,.4);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

export default function BrowseMap({ selectedCountryCode }: BrowseMapProps) {
  const [zoomThreshold, setZoomThreshold] = useState(4);

  const visibleCountryClusters = useMemo(() => {
    if (!selectedCountryCode) return sellerCountryClusters;
    return sellerCountryClusters.filter((cluster) => cluster.countryCode === selectedCountryCode);
  }, [selectedCountryCode]);

  const visibleStateMarkers = useMemo(() => {
    if (!selectedCountryCode) return sellerStateMarkers;
    return sellerStateMarkers.filter((marker) => marker.countryCode === selectedCountryCode);
  }, [selectedCountryCode]);

  return (
    <div className="h-[calc(100vh-210px)] overflow-hidden rounded-2xl border border-white/10">
      <MapContainer
        center={[2.5, 20]}
        zoom={3}
        minZoom={3}
        className="h-full w-full"
        scrollWheelZoom
      >
        <ZoomWatcher onZoomChange={setZoomThreshold} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {zoomThreshold < 5 &&
          visibleCountryClusters.map((cluster) => (
            <Marker
              key={cluster.countryCode}
              position={[cluster.lat, cluster.lng]}
              icon={clusterIcon(cluster.sellers)}
            >
              <Popup>
                <div className="min-w-[160px] text-[#0f1f0f]">
                  <p className="font-semibold">
                    {cluster.flag} {cluster.countryName}
                  </p>
                  <p className="text-xs">{cluster.sellers} sellers</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {zoomThreshold >= 5 &&
          visibleStateMarkers.map((marker) => (
            <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={sellerIcon()}>
              <Popup>
                <div className="min-w-[190px] text-[#0f1f0f]">
                  <p className="font-semibold">
                    {marker.farmName} {marker.flag}
                  </p>
                  <p className="text-xs">{marker.state}, {marker.countryName}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {marker.topProducts.slice(0, 3).map((product) => (
                      <span key={product} className="rounded-full bg-[#1D9E751F] px-2 py-0.5 text-[10px]">
                        {product}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-[#8d6d13]">★ {marker.rating.toFixed(1)}</p>
                  <Link href="/seller/seller-1" className="mt-2 inline-flex items-center gap-1 text-xs text-[#1D9E75]">
                    <LinkIcon size={12} />
                    View profile
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
