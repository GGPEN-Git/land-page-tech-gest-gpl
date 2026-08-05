import { useEffect, useRef, useState } from "react";
import esriConfig from "@arcgis/core/config";
import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import "@arcgis/core/assets/esri/themes/light/main.css";

import { ARCGIS_VERSION, CAMADAS, CAMADA_DADOS, WEBMAP_ID, normalizarUrl, urlCompletaDaCamada } from "../lib/arcgis";

// Os ícones e fontes do SDK vêm do CDN, para não ser preciso copiar os assets no build.
esriConfig.assetsPath = `https://js.arcgis.com/${ARCGIS_VERSION}/@arcgis/core/assets`;

interface MapaArcGISProps {
    /** Tem de definir posicionamento e tamanho — o mapa herda daqui a sua altura. */
    className?: string;
    /** Recebe a MapView assim que estiver pronta (para zoom, home, queries). */
    onViewReady?: (view: MapView) => void;
    /** Recebe as camadas configuradas, indexadas pelo id de `CAMADAS`. */
    onCamadas?: (camadas: Record<string, FeatureLayer>) => void;
}

export function MapaArcGIS({ className = "absolute inset-0", onViewReady, onCamadas }: MapaArcGISProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [erro, setErro] = useState<string | null>(null);
    const [aCarregar, setACarregar] = useState(true);

    useEffect(() => {
        if (!containerRef.current) return;

        let view: MapView | null = null;
        let cancelado = false;

        const webmap = new WebMap({
            portalItem: { id: WEBMAP_ID },
        });

        view = new MapView({
            container: containerRef.current,
            map: webmap,
            ui: { components: ["attribution"] },
        });

        view.when(async () => {
            if (cancelado || !view) return;

            try {
                await webmap.loadAll();

                // Indexa as camadas que o webmap já traz, para não duplicar as configuradas.
                const porUrl = new Map<string, FeatureLayer>();

                for (const camada of webmap.allLayers.toArray()) {
                    const featureLayer = camada as FeatureLayer;
                    const url = urlCompletaDaCamada(featureLayer);

                    if (url) porUrl.set(normalizarUrl(url), featureLayer);
                }

                for (const config of CAMADAS) {
                    const chave = normalizarUrl(config.url);
                    if (porUrl.has(chave)) continue;

                    const nova = new FeatureLayer({
                        id: config.id,
                        title: config.titulo,
                        url: config.url,
                        outFields: ["*"],
                        popupEnabled: true,
                    });

                    webmap.add(nova);
                    porUrl.set(chave, nova);
                }

                const porId: Record<string, FeatureLayer> = {};

                for (const config of CAMADAS) {
                    const camada = porUrl.get(normalizarUrl(config.url));

                    if (camada) porId[config.id] = camada;
                    else console.warn("Camada não encontrada no webmap:", config.url);
                }

                // Carrega todas: sem isto o renderer de algumas ainda não existe
                // e a legenda não o consegue ler.
                await Promise.all(Object.values(porId).map((camada) => camada.load().catch(() => null)));

                if (!porId[CAMADA_DADOS.id]) console.warn("Camada de dados ausente:", CAMADA_DADOS.url);

                if (!cancelado) onCamadas?.(porId);
            } catch (e) {
                // Camadas em falta não devem impedir o mapa de aparecer.
                console.error("Falha ao carregar camadas do webmap:", e);
            }

            if (cancelado) return;

            setACarregar(false);
            onViewReady?.(view);
        }).catch((e: unknown) => {
            if (cancelado) return;

            console.error("Falha ao inicializar o mapa:", e);
            setACarregar(false);
            setErro("Não foi possível carregar o mapa. Verifique a ligação e as permissões do webmap.");
        });

        return () => {
            cancelado = true;
            view?.destroy();
            view = null;
        };
        // WEBMAP_ID e CAMADAS são constantes de módulo; monta uma única vez.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        // O className tem de trazer o posicionamento e o tamanho (ex.: "absolute inset-0").
        // Não juntar aqui outra utility de position — colidiria e a caixa colapsaria.
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
