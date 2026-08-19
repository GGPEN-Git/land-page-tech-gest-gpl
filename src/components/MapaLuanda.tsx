import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config";
import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import "@arcgis/core/assets/esri/themes/light/main.css";

import { ARCGIS_VERSION, normalizarUrl, urlCompletaDaCamada } from "../lib/arcgis";
import { CAMADAS_MODULO, WEBMAP_LUANDA } from "../lib/luanda";

esriConfig.assetsPath = `https://js.arcgis.com/${ARCGIS_VERSION}/@arcgis/core/assets`;

interface MapaLuandaProps {
    /** Tem de trazer posicionamento e tamanho — o mapa herda daqui a altura. */
    className?: string;
    onViewReady?: (view: MapView) => void;
    /** Devolve as camadas do módulo, indexadas pelo id de `CAMADAS_MODULO`. */
    onCamadas?: (camadas: Record<string, FeatureLayer>) => void;
}

/**
 * Mapa do módulo Luanda.
 *
 * É um componente à parte do `MapaArcGIS` de propósito: assim este módulo pode
 * mudar de webmap, de camadas ou de comportamento sem risco para o painel
 * principal. O preço é alguma repetição, que aqui compensa.
 */
export function MapaLuanda({ className = "absolute inset-0", onViewReady, onCamadas }: MapaLuandaProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [erro, setErro] = useState<string | null>(null);
    const [aCarregar, setACarregar] = useState(true);

    useEffect(() => {
        if (!containerRef.current) return;

        let view: MapView | null = null;
        let cancelado = false;

        const webmap = new WebMap({ portalItem: { id: WEBMAP_LUANDA } });

        view = new MapView({
            container: containerRef.current,
            map: webmap,
            ui: { components: ["attribution"] },
        });

        view.when(async () => {
            if (cancelado || !view) return;

            try {
                await webmap.loadAll();

                // Indexa o que o webmap já traz, para não duplicar camadas.
                const porUrl = new Map<string, FeatureLayer>();

                for (const camada of webmap.allLayers.toArray()) {
                    const featureLayer = camada as FeatureLayer;
                    const url = urlCompletaDaCamada(featureLayer);

                    if (url) porUrl.set(normalizarUrl(url), featureLayer);
                }

                const porId: Record<string, FeatureLayer> = {};

                for (const config of CAMADAS_MODULO) {
                    const chave = normalizarUrl(config.url);
                    let camada = porUrl.get(chave);

                    if (!camada) {
                        camada = new FeatureLayer({
                            id: config.id,
                            title: config.titulo,
                            url: config.url,
                            popupEnabled: true,
                        });

                        webmap.add(camada);
                    }

                    porId[config.id] = camada;
                }

                await Promise.all(Object.values(porId).map((camada) => camada.load().catch(() => null)));

                // Sem "*", o popup e o hitTest só devolvem os campos do portal.
                for (const camada of Object.values(porId)) {
                    camada.outFields = ["*"];
                }

                if (!cancelado) onCamadas?.(porId);
            } catch (e) {
                console.error("Falha ao carregar as camadas do módulo Luanda:", e);
            }

            if (cancelado) return;

            setACarregar(false);
            onViewReady?.(view);
        }).catch((e: unknown) => {
            if (cancelado) return;

            console.error("Falha ao inicializar o mapa de Luanda:", e);
            setACarregar(false);
            setErro("Não foi possível carregar o mapa. Verifique a ligação e as permissões do webmap.");
        });

        return () => {
            cancelado = true;
            view?.destroy();
            view = null;
        };
        // Constantes de módulo: monta uma única vez.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className={className}>
            <div ref={containerRef} className="w-full h-full" />

            {aCarregar && !erro && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0b1c38] text-white/70 text-sm pointer-events-none">
                    A carregar o mapa…
                </div>
            )}

            {erro && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0b1c38] px-6">
                    <p className="text-center text-sm text-[#e08a8a] max-w-md">{erro}</p>
                </div>
            )}
        </div>
    );
}
