import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config";
import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import "@arcgis/core/assets/esri/themes/light/main.css";

import { ARCGIS_VERSION, normalizarUrl, urlCompletaDaCamada } from "../lib/arcgis";
import { CAMADA_LUANDA, FILTRO_BASE_LUANDA, WEBMAP_LUANDA } from "../lib/luanda";

esriConfig.assetsPath = `https://js.arcgis.com/${ARCGIS_VERSION}/@arcgis/core/assets`;

interface MapaLuandaProps {
    /** Tem de trazer posicionamento e tamanho — o mapa herda daqui a altura. */
    className?: string;
    onViewReady?: (view: MapView) => void;
    /** Devolve a camada do módulo, já carregada. */
    onCamada?: (camada: FeatureLayer) => void;
}

/**
 * Mapa do módulo Luanda.
 *
 * É um componente à parte do `MapaArcGIS` de propósito: assim este módulo pode
 * mudar de webmap, de camadas ou de comportamento sem risco para o painel
 * principal. O preço é alguma repetição, que aqui compensa.
 */
export function MapaLuanda({ className = "absolute inset-0", onViewReady, onCamada }: MapaLuandaProps) {
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

                let camada = porUrl.get(normalizarUrl(CAMADA_LUANDA.url));

                if (!camada) {
                    camada = new FeatureLayer({
                        id: CAMADA_LUANDA.id,
                        title: CAMADA_LUANDA.titulo,
                        url: CAMADA_LUANDA.url,
                        popupEnabled: true,
                    });

                    webmap.add(camada);
                }

                await camada.load();

                // Sem "*", o popup e o hitTest só devolvem os campos do portal.
                camada.outFields = ["*"];
                camada.visible = true;

                // Aplica-se já aqui, e não só quando o painel corre o seu efeito:
                // senão a camada chega a ser desenhada uma vez sem filtro nenhum,
                // com os dois milhões de polígonos da província.
                camada.definitionExpression = FILTRO_BASE_LUANDA;

                if (!cancelado) onCamada?.(camada);
            } catch (e) {
                console.error("Falha ao carregar a camada de Luanda:", e);
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
