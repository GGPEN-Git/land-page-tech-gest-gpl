import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Home, Minus, Plus, RotateCcw } from "lucide-react";
import type MapView from "@arcgis/core/views/MapView";
import type Viewpoint from "@arcgis/core/Viewpoint";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { MapaLuanda } from "./MapaLuanda";
import { asset } from "../lib/utils";
import { criarRenderer, lerLegenda } from "../lib/simbologia";
import { comCondicao, construirWhere, formatarNumero } from "../lib/arcgis";
import {
    CAMPO_INSCRICAO,
    FILTRO_BASE_LUANDA,
    FILTROS_LUANDA,
    INSCRICOES,
} from "../lib/luanda";

const LARGURA_ABA = 320;

interface PainelLuandaProps {
    onVoltar?: () => void;
}

/**
 * Módulo do município de Sambizanga, sobre a camada `Luanda_Nova_gdb`.
 *
 * A camada cobre toda a província; o `FILTRO_BASE_LUANDA` restringe-a a
 * Sambizanga — que inclui o bairro Boa Vista — e a interface não o remove.
 */
export function PainelLuanda({ onVoltar }: PainelLuandaProps) {
    const [abaAberta, setAbaAberta] = useState(true);
    const [filtroAberto, setFiltroAberto] = useState<string | null>(null);
    const [selecoes, setSelecoes] = useState<Record<string, string>>({});
    const [simbologiaDoWebmap, setSimbologiaDoWebmap] = useState(true);

    const [opcoes, setOpcoes] = useState<Record<string, string[]>>({});
    const [contagens, setContagens] = useState<Record<number, number>>({});
    const [total, setTotal] = useState<number | null>(null);
    const [coresMapa, setCoresMapa] = useState<Record<string, string>>({});
    const [rotulosMapa, setRotulosMapa] = useState<Record<string, string>>({});
    const [escala, setEscala] = useState<number | null>(null);

    const [camada, setCamada] = useState<FeatureLayer | null>(null);
    const [aConsultar, setAConsultar] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const rendererOriginalRef = useRef<FeatureLayer["renderer"] | null>(null);
    const viewRef = useRef<MapView | null>(null);
    const viewpointInicialRef = useRef<Viewpoint | null>(null);
    /** A primeira consulta enquadra sempre: é o que traz a câmara a Sambizanga. */
    const primeiraConsultaRef = useRef(true);

    const handleViewReady = useCallback((view: MapView) => {
        viewRef.current = view;
        viewpointInicialRef.current = view.viewpoint.clone();
        setEscala(view.scale);

        // A camada tem minScale: acima dele o ArcGIS esconde-a, e o mapa parece vazio.
        view.watch("scale", (nova: number) => setEscala(nova));
    }, []);

    const handleCamada = useCallback((encontrada: FeatureLayer) => {
        setCamada(encontrada);
    }, []);

    // Simbologia: a do portal, ou a nossa construída a partir de INSCRICOES.
    useEffect(() => {
        if (!camada) return;

        if (rendererOriginalRef.current === null) {
            rendererOriginalRef.current = camada.renderer;
        }

        const doWebmap = rendererOriginalRef.current;

        // Nunca atribuir um renderer vazio: a camada deixaria de ser desenhada.
        camada.renderer =
            simbologiaDoWebmap && doWebmap ? doWebmap : criarRenderer(CAMPO_INSCRICAO, INSCRICOES);

        const legenda = lerLegenda(camada.renderer);
        const aplicavel = legenda.campo === CAMPO_INSCRICAO;

        setCoresMapa(aplicavel ? legenda.cores : {});
        setRotulosMapa(aplicavel ? legenda.rotulos : {});
    }, [camada, simbologiaDoWebmap]);

    // Filtro, opções em cascata e contagens.
    useEffect(() => {
        if (!camada) return;

        let cancelado = false;

        const comBase = (clausula: string) => comCondicao(clausula, FILTRO_BASE_LUANDA);
        const where = comBase(construirWhere(selecoes));

        camada.definitionExpression = where;
        setAConsultar(true);

        /** Leva a câmara ao que está filtrado — incluindo à entrada, para chegar a Sambizanga. */
        async function enquadrar(layer: FeatureLayer, clausula: string) {
            const view = viewRef.current;
            if (!view) return;

            try {
                const { count, extent } = await layer.queryExtent({ where: clausula });

                if (cancelado || count === 0 || !extent) return;

                await view.goTo(extent.expand(1.2));
                primeiraConsultaRef.current = false;
            } catch (e) {
                console.debug("Não foi possível enquadrar a seleção:", e);
            }
        }

        /**
         * Contagens e opções correm em paralelo. As consultas de valores distintos
         * são lentas nesta camada, e antes prendiam os números do cartão.
         */
        async function carregarContagens(layer: FeatureLayer) {
            try {
                const totais = await Promise.all(
                    INSCRICOES.map(
                        async (i) =>
                            [
                                i.valor,
                                await layer.queryFeatureCount({
                                    where: comCondicao(where, `${CAMPO_INSCRICAO} = ${i.valor}`),
                                }),
                            ] as const,
                    ),
                );

                const universo = await layer.queryFeatureCount({ where });

                if (cancelado) return;

                setContagens(Object.fromEntries(totais));
                setTotal(universo);
                setErro(null);

                await enquadrar(layer, where);
            } catch (e) {
                if (cancelado) return;

                console.error("Falha ao contar:", e);
                setErro("Não foi possível obter as contagens do serviço.");
            }
        }

        async function carregarOpcoes(layer: FeatureLayer) {
            try {
                const listas = await Promise.all(
                    FILTROS_LUANDA.map(async (filtro) => {
                        const resultado = await layer.queryFeatures({
                            where: comBase(construirWhere(selecoes, filtro.campo)),
                            outFields: [filtro.campo],
                            returnDistinctValues: true,
                            returnGeometry: false,
                            orderByFields: [filtro.campo],
                        });

                        const valores = resultado.features
                            .map((f) => f.attributes[filtro.campo])
                            .filter((v): v is string => typeof v === "string" && v.trim() !== "");

                        return [filtro.campo, valores] as const;
                    }),
                );

                if (!cancelado) setOpcoes(Object.fromEntries(listas));
            } catch (e) {
                if (cancelado) return;

                console.error("Falha ao obter as opções dos filtros:", e);
            } finally {
                if (!cancelado) setAConsultar(false);
            }
        }

        carregarContagens(camada);
        carregarOpcoes(camada);

        return () => {
            cancelado = true;
        };
    }, [camada, selecoes]);

    function selecionar(campo: string, valor: string | null) {
        setSelecoes((atual) => {
            const proximo = { ...atual };

            if (valor === null) delete proximo[campo];
            else proximo[campo] = valor;

            return proximo;
        });
    }

    function ajustarZoom(delta: number) {
        const view = viewRef.current;
        if (!view) return;

        view.goTo({ zoom: view.zoom + delta }).catch(() => {
            /* animação interrompida — sem impacto */
        });
    }

    function reporVista() {
        const view = viewRef.current;
        const inicial = viewpointInicialRef.current;
        if (!view || !inicial) return;

        view.goTo(inicial).catch(() => {
            /* idem */
        });
    }

    const filtrosAtivos = Object.keys(selecoes).length;

    const minScale = camada?.minScale || 0;
    const longeDemais = !!escala && minScale > 0 && escala > minScale;

    return (
        <div className="h-screen overflow-hidden flex flex-col bg-black font-sans">
            <header className="relative z-30 shrink-0 bg-black border-b border-[#1e6fd9]">
                <div className="px-4 md:px-6 h-12 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 md:gap-5 min-w-0">
                        {onVoltar && (
                            <button
                                type="button"
                                onClick={onVoltar}
                                aria-label="Voltar ao painel principal"
                                className="shrink-0 w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}

                        <div className="bg-white rounded shrink-0 px-1.5 py-0.5 flex items-center justify-center">
                            <img
                                src={asset("client_luanda1.png")}
                                alt="Governo Provincial de Luanda"
                                className="h-6 w-auto object-contain"
                            />
                        </div>

                        <h1 className="text-white text-xs md:text-sm font-semibold leading-tight truncate">
                            Cadastro de Luanda
                        </h1>
                    </div>

                    <span className="text-white/50 text-[11px] hidden sm:block shrink-0">
                        {total === null ? "" : `${formatarNumero(total)} registos`}
                    </span>
                </div>
            </header>

            <main className="relative flex-1 min-h-0 flex overflow-hidden">
                <motion.aside
                    initial={false}
                    animate={{ width: abaAberta ? LARGURA_ABA : 0 }}
                    transition={{ type: "tween", duration: 0.3 }}
                    className="relative z-20 shrink-0 min-h-0 bg-[#0b1c38] shadow-2xl overflow-hidden"
                    aria-hidden={!abaAberta}
                >
                    <div className="h-full overflow-y-auto px-6 py-6" style={{ width: LARGURA_ABA }}>
                        <h2 className="text-white/50 text-xs font-semibold tracking-[0.15em] uppercase mb-3">Filtros</h2>

                        {FILTROS_LUANDA.map((filtro) => {
                            const aberto = filtroAberto === filtro.id;
                            const lista = opcoes[filtro.campo] || [];
                            const escolhido = selecoes[filtro.campo];

                            return (
                                <div key={filtro.id} className="border-b border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setFiltroAberto(aberto ? null : filtro.id)}
                                        aria-expanded={aberto}
                                        className="w-full flex items-center justify-between gap-3 py-3 text-white text-sm hover:text-[#7fb3e0] transition-colors"
                                    >
                                        <span className="text-left">{filtro.label}</span>

                                        <span className="flex items-center gap-2 shrink-0">
                                            {escolhido && (
                                                <span className="max-w-[100px] truncate text-xs text-[#7fb3e0]">
                                                    {escolhido}
                                                </span>
                                            )}
                                            <ChevronDown
                                                className={`w-4 h-4 transition-transform ${aberto ? "rotate-180" : ""}`}
                                            />
                                        </span>
                                    </button>

                                    {aberto && (
                                        <div className="pb-3 max-h-60 overflow-y-auto space-y-1">
                                            <button
                                                type="button"
                                                onClick={() => selecionar(filtro.campo, null)}
                                                className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                                                    escolhido
                                                        ? "text-white/60 hover:bg-white/10"
                                                        : "bg-[#1e6fd9] text-white"
                                                }`}
                                            >
                                                Todos
                                            </button>

                                            {lista.map((valor) => (
                                                <button
                                                    key={valor}
                                                    type="button"
                                                    onClick={() => selecionar(filtro.campo, valor)}
                                                    className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                                                        escolhido === valor
                                                            ? "bg-[#1e6fd9] text-white"
                                                            : "text-white/80 hover:bg-white/10"
                                                    }`}
                                                >
                                                    {valor}
                                                </button>
                                            ))}

                                            {lista.length === 0 && !aConsultar && (
                                                <p className="px-3 py-1.5 text-xs text-white/40">Sem valores.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <button
                            type="button"
                            onClick={() => {
                                setSelecoes({});
                                setFiltroAberto(null);
                            }}
                            disabled={filtrosAtivos === 0}
                            className="mt-4 flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors disabled:opacity-40 disabled:hover:text-white/70"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Repor filtros
                        </button>

                        <h2 className="text-white/50 text-xs font-semibold tracking-[0.15em] uppercase mt-8 mb-3">
                            Colorir mapa por
                        </h2>

                        <div className="flex rounded-lg bg-[#0e2242] p-1">
                            {[
                                { doWebmap: true, label: "Webmap" },
                                { doWebmap: false, label: "Inscrição" },
                            ].map((opcao) => (
                                <button
                                    key={opcao.label}
                                    type="button"
                                    onClick={() => setSimbologiaDoWebmap(opcao.doWebmap)}
                                    className={`flex-1 rounded-md py-1.5 text-xs transition-colors ${
                                        simbologiaDoWebmap === opcao.doWebmap
                                            ? "bg-[#1e6fd9] text-white"
                                            : "text-white/60 hover:text-white"
                                    }`}
                                >
                                    {opcao.label}
                                </button>
                            ))}
                        </div>

                        <p className="mt-6 text-[11px] text-white/40 leading-snug">
                            Restrito aos 11 bairros do levantamento, em Sambizanga e Ingombota. O campo Inscrição não tem
                            domínio no portal, por isso os rótulos são os próprios códigos.
                        </p>

                        {erro && <p className="mt-4 text-xs text-[#e08a8a]">{erro}</p>}
                    </div>
                </motion.aside>

                <div className="relative flex-1">
                    <MapaLuanda className="absolute inset-0 z-0" onViewReady={handleViewReady} onCamada={handleCamada} />

                    {longeDemais && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 max-w-[90%]">
                            <p
                                role="status"
                                className="rounded-lg bg-[#0b1c38]/95 backdrop-blur-sm px-4 py-2 text-sm text-white/80 shadow-lg"
                            >
                                Aproxime para ver os edifícios — só são desenhados a partir de 1:
                                {formatarNumero(minScale)}.
                            </p>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setAbaAberta(!abaAberta)}
                        aria-expanded={abaAberta}
                        aria-label={abaAberta ? "Recolher painel" : "Abrir painel"}
                        className="absolute top-1/2 -translate-y-1/2 left-0 z-30 w-5 h-20 rounded-r-lg bg-[#0b1c38] shadow-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-[#12294d] transition-colors"
                    >
                        {abaAberta ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div className="absolute top-6 left-6 z-10 flex flex-col gap-3">
                        <div className="flex flex-col bg-white rounded shadow-lg overflow-hidden">
                            <button
                                type="button"
                                aria-label="Aproximar"
                                onClick={() => ajustarZoom(1)}
                                className="w-10 h-10 flex items-center justify-center text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>

                            <div className="h-px bg-stone-200" />

                            <button
                                type="button"
                                aria-label="Afastar"
                                onClick={() => ajustarZoom(-1)}
                                className="w-10 h-10 flex items-center justify-center text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                                <Minus className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            type="button"
                            aria-label="Vista inicial"
                            onClick={reporVista}
                            className="w-10 h-10 bg-white rounded shadow-lg flex items-center justify-center text-stone-700 hover:bg-stone-100 transition-colors"
                        >
                            <Home className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="absolute bottom-10 right-6 z-10 w-[250px] max-w-[calc(100%-3rem)] bg-[#0b1c38]/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-[#12294d] px-5 py-4">
                            <p className="text-white/70 text-sm truncate">{selecoes.Bairro || selecoes.Municipio || "Bairros do levantamento"}</p>
                            <p className="text-white text-2xl font-bold tracking-wide">LUANDA</p>
                        </div>

                        <div className="px-5 py-4 space-y-2">
                            {INSCRICOES.map((item) => (
                                <div key={item.valor} className="flex items-center gap-3">
                                    <span
                                        className="w-4 h-4 rounded shrink-0"
                                        style={{ backgroundColor: coresMapa[String(item.valor)] || item.cor }}
                                        aria-hidden="true"
                                    />

                                    <span className="text-white text-sm flex-1">
                                        {rotulosMapa[String(item.valor)] || item.label}
                                    </span>

                                    <span className="bg-[#0e2242] rounded-md px-2 py-1 min-w-[70px] text-center text-white text-sm font-bold">
                                        {contagens[item.valor] === undefined
                                            ? aConsultar
                                                ? "…"
                                                : "—"
                                            : formatarNumero(contagens[item.valor])}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
