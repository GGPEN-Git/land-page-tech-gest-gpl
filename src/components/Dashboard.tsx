import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Home, Minus, Plus, RotateCcw, User } from "lucide-react";
import type MapView from "@arcgis/core/views/MapView";
import type Viewpoint from "@arcgis/core/Viewpoint";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { MapaArcGIS } from "./MapaArcGIS";
import { asset } from "../lib/utils";
import {
    AREAS,
    CAMADAS,
    CAMADAS_EDIFICIOS,
    CAMADA_DADOS,
    CAMPO_AOI,
    CAMPO_ESTADO,
    CAMPO_VALIDACAO,
    ESTADOS,
    FILTROS,
    VALIDACOES,
    comCondicao,
    construirWhere,
    formatarNumero,
} from "../lib/arcgis";

/** Largura da aba lateral em px. */
const LARGURA_ABA = 320;

interface DashboardProps {
    utilizador?: string;
    onLogout?: () => void;
}

export function Dashboard({ utilizador = "Utilizador", onLogout }: DashboardProps) {
    const [abaAberta, setAbaAberta] = useState(true);
    const [filtroAberto, setFiltroAberto] = useState<string | null>(null);

    /** Área escolhida — decide a camada ativa e, quando aplicável, o valor de AOI. */
    const [areaId, setAreaId] = useState<string | null>(null);
    /** Seleção dos restantes filtros (campo → valor). */
    const [selecoes, setSelecoes] = useState<Record<string, string>>({});

    const [opcoes, setOpcoes] = useState<Record<string, string[]>>({});
    const [contagens, setContagens] = useState<Record<number, number>>({});
    const [validacoes, setValidacoes] = useState<Record<number, number>>({});

    const [camadas, setCamadas] = useState<Record<string, FeatureLayer>>({});
    const [aConsultar, setAConsultar] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const viewRef = useRef<MapView | null>(null);
    const viewpointInicialRef = useRef<Viewpoint | null>(null);
    const primeiraConsultaRef = useRef(true);

    const area = AREAS.find((a) => a.id === areaId) || null;
    const camadaAtivaId = area?.camadaId || CAMADA_DADOS.id;
    const camada = camadas[camadaAtivaId] || null;

    const configAtiva = CAMADAS_EDIFICIOS.find((c) => c.id === camadaAtivaId) || CAMADA_DADOS;
    const mostraValidacao = configAtiva.campoSimbologia === CAMPO_VALIDACAO;

    // O cartão principal segue a simbologia do mapa; o bloco da aba mostra o outro,
    // quando a camada ativa o tiver.
    const principais = mostraValidacao ? VALIDACOES : ESTADOS;
    const contagensPrincipais = mostraValidacao ? validacoes : contagens;

    const handleViewReady = useCallback((view: MapView) => {
        viewRef.current = view;
        viewpointInicialRef.current = view.viewpoint.clone();
    }, []);

    const handleCamadas = useCallback((encontradas: Record<string, FeatureLayer>) => {
        setCamadas(encontradas);
    }, []);

    // Só a camada de edifícios da área escolhida fica visível; os contornos ficam sempre.
    useEffect(() => {
        for (const [id, featureLayer] of Object.entries(camadas)) {
            const config = CAMADAS.find((c) => c.id === id);
            if (!config) continue;

            if (!config.campoSimbologia) {
                featureLayer.visible = true;
                continue;
            }

            const ativa = id === camadaAtivaId;
            featureLayer.visible = ativa;

            // Limpa o filtro das camadas que deixaram de estar ativas.
            if (!ativa) featureLayer.definitionExpression = "";
        }
    }, [camadas, camadaAtivaId]);

    // Trocar de área invalida as escolhas anteriores: os bairros de uma não existem na outra.
    useEffect(() => {
        setSelecoes({});
        setFiltroAberto(null);
    }, [areaId]);

    useEffect(() => {
        if (!camada) return;

        let cancelado = false;

        const efetivas = area?.aoi ? { ...selecoes, [CAMPO_AOI]: area.aoi } : selecoes;
        const where = construirWhere(efetivas);

        camada.definitionExpression = where;
        setAConsultar(true);

        async function enquadrar(layer: FeatureLayer, clausula: string) {
            const view = viewRef.current;
            if (!view) return;

            if (primeiraConsultaRef.current) {
                primeiraConsultaRef.current = false;
                return;
            }

            try {
                if (clausula === "1=1") {
                    const inicial = viewpointInicialRef.current;
                    if (inicial) await view.goTo(inicial);
                    return;
                }

                const { count, extent } = await layer.queryExtent({ where: clausula });

                if (cancelado || count === 0 || !extent) return;

                await view.goTo(extent.expand(1.3));
            } catch (e) {
                console.debug("Não foi possível enquadrar a seleção:", e);
            }
        }

        async function carregar(layer: FeatureLayer) {
            try {
                const listas = await Promise.all(
                    FILTROS.map(async (filtro) => {
                        const resultado = await layer.queryFeatures({
                            where: construirWhere(efetivas, filtro.campo),
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

                const contarPor = (campo: string, valor: number) =>
                    layer.queryFeatureCount({ where: comCondicao(where, `${campo} = ${valor}`) });

                const totaisEstado = await Promise.all(
                    ESTADOS.map(async (e) => [e.valor, await contarPor(CAMPO_ESTADO, e.valor)] as const),
                );

                // A camada de Sambizanga não tem o campo Validacao — pedi-lo daria erro.
                const totaisValidacao = mostraValidacao
                    ? await Promise.all(VALIDACOES.map(async (v) => [v.valor, await contarPor(CAMPO_VALIDACAO, v.valor)] as const))
                    : [];

                if (cancelado) return;

                setOpcoes(Object.fromEntries(listas));
                setContagens(Object.fromEntries(totaisEstado));
                setValidacoes(Object.fromEntries(totaisValidacao));
                setErro(null);

                await enquadrar(layer, where);
            } catch (e) {
                if (cancelado) return;

                console.error("Falha ao consultar a camada:", e);
                setErro("Não foi possível obter os dados do serviço.");
            } finally {
                if (!cancelado) setAConsultar(false);
            }
        }

        carregar(camada);

        return () => {
            cancelado = true;
        };
    }, [camada, area, selecoes, mostraValidacao]);

    function selecionar(campo: string, valor: string | null) {
        setSelecoes((atual) => {
            const proximo = { ...atual };

            if (valor === null) delete proximo[campo];
            else proximo[campo] = valor;

            return proximo;
        });
    }

    function reporFiltros() {
        setAreaId(null);
        setSelecoes({});
        setFiltroAberto(null);
    }

    function ajustarZoom(delta: number) {
        const view = viewRef.current;
        if (!view) return;

        view.goTo({ zoom: view.zoom + delta }).catch(() => {
            /* goTo rejeita quando a animação é interrompida — sem impacto. */
        });
    }

    function reporVista() {
        const view = viewRef.current;
        const viewpoint = viewpointInicialRef.current;
        if (!view || !viewpoint) return;

        view.goTo(viewpoint).catch(() => {
            /* idem */
        });
    }

    const filtrosAtivos = Object.keys(selecoes).length + (areaId ? 1 : 0);
    const areaAberta = filtroAberto === "area";

    return (
        <div className="h-screen overflow-hidden flex flex-col bg-black font-sans">
            {/* Barra superior */}
            <header className="relative z-30 shrink-0 bg-black border-b border-[#1e6fd9]">
                <div className="px-4 md:px-6 h-12 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 md:gap-5 min-w-0">
                        <div className="bg-white rounded shrink-0 px-1.5 py-0.5 flex items-center justify-center">
                            <img src={asset("client_luanda1.png")} alt="Governo Provincial de Luanda" className="h-6 w-auto object-contain" />
                        </div>

                        <h1 className="text-white text-xs md:text-sm font-semibold leading-tight truncate">
                            TECH-GEST: Governo Provincial de Luanda
                        </h1>

                        <div className="hidden lg:flex items-center gap-2 shrink-0">
                            <span className="text-white/70 text-[11px] whitespace-nowrap">Powered By</span>

                            <div className="bg-white rounded px-2 py-0.5 flex items-center justify-center">
                                <img src={asset("GGPEN_LOGO-scaled.png")} alt="GGPEN" className="h-5 w-auto object-contain" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-white text-xs md:text-sm hidden sm:block">Bem-vindo , {utilizador}</span>

                        <button
                            type="button"
                            onClick={onLogout}
                            title="Terminar sessão"
                            aria-label="Terminar sessão"
                            className="w-8 h-8 rounded-full border border-white flex items-center justify-center text-white hover:bg-white hover:text-black transition-colors"
                        >
                            <User className="w-4 h-4" />
                        </button>
                    </div>
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

                        {/* ÁREA — pode trocar de camada, por isso não passa pelo ciclo dos outros filtros */}
                        <div className="border-b border-white/10">
                            <button
                                type="button"
                                onClick={() => setFiltroAberto(areaAberta ? null : "area")}
                                aria-expanded={areaAberta}
                                className="w-full flex items-center justify-between gap-3 py-3 text-white text-sm hover:text-[#7fb3e0] transition-colors"
                            >
                                <span className="text-left">ÁREA</span>

                                <span className="flex items-center gap-2 shrink-0">
                                    {area && <span className="max-w-[100px] truncate text-xs text-[#7fb3e0]">{area.label}</span>}
                                    <ChevronDown className={`w-4 h-4 transition-transform ${areaAberta ? "rotate-180" : ""}`} />
                                </span>
                            </button>

                            {areaAberta && (
                                <div className="pb-3 space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => setAreaId(null)}
                                        className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                                            areaId ? "text-white/60 hover:bg-white/10" : "bg-[#1e6fd9] text-white"
                                        }`}
                                    >
                                        Todas
                                    </button>

                                    {AREAS.map((opcao) => (
                                        <button
                                            key={opcao.id}
                                            type="button"
                                            onClick={() => setAreaId(opcao.id)}
                                            className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                                                areaId === opcao.id ? "bg-[#1e6fd9] text-white" : "text-white/80 hover:bg-white/10"
                                            }`}
                                        >
                                            {opcao.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {FILTROS.map((filtro) => {
                            const aberto = filtroAberto === filtro.id;
                            const lista = opcoes[filtro.campo] || [];
                            const selecionado = selecoes[filtro.campo];

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
                                            {selecionado && (
                                                <span className="max-w-[100px] truncate text-xs text-[#7fb3e0]">{selecionado}</span>
                                            )}
                                            <ChevronDown className={`w-4 h-4 transition-transform ${aberto ? "rotate-180" : ""}`} />
                                        </span>
                                    </button>

                                    {aberto && (
                                        <div className="pb-3 max-h-60 overflow-y-auto space-y-1">
                                            <button
                                                type="button"
                                                onClick={() => selecionar(filtro.campo, null)}
                                                className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                                                    selecionado ? "text-white/60 hover:bg-white/10" : "bg-[#1e6fd9] text-white"
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
                                                        selecionado === valor ? "bg-[#1e6fd9] text-white" : "text-white/80 hover:bg-white/10"
                                                    }`}
                                                >
                                                    {valor}
                                                </button>
                                            ))}

                                            {lista.length === 0 && !aConsultar && (
                                                <p className="px-3 py-1.5 text-xs text-white/40">Sem valores para esta área.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <button
                            type="button"
                            onClick={reporFiltros}
                            disabled={filtrosAtivos === 0}
                            className="mt-4 flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors disabled:opacity-40 disabled:hover:text-white/70"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Repor filtros
                        </button>

                        {/* Só faz sentido quando o cartão principal mostra validação. */}
                        {mostraValidacao && (
                            <>
                                <h2 className="text-white/50 text-xs font-semibold tracking-[0.15em] uppercase mt-8 mb-3">Estado</h2>

                                <div className="space-y-2">
                                    {ESTADOS.map((item) => (
                                        <div key={item.valor} className="flex items-center gap-3">
                                            <span
                                                className="w-4 h-4 rounded shrink-0"
                                                style={{ backgroundColor: item.cor }}
                                                aria-hidden="true"
                                            />

                                            <span className="text-white text-sm flex-1">{item.label}</span>

                                            <span className="bg-[#0e2242] rounded-md px-3 py-1 min-w-[70px] text-center text-white text-base font-bold">
                                                {contagens[item.valor] === undefined ? "—" : formatarNumero(contagens[item.valor])}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-2 text-[11px] text-white/40 leading-snug">
                                    O mapa colore os edifícios por validação, não por estado.
                                </p>
                            </>
                        )}

                        <p className="mt-8 text-[11px] text-white/40 leading-snug">
                            Camada em uso: {configAtiva.titulo}
                        </p>

                        {erro && <p className="mt-4 text-xs text-[#e08a8a]">{erro}</p>}
                    </div>
                </motion.aside>

                <div className="relative flex-1">
                    <MapaArcGIS className="absolute inset-0 z-0" onViewReady={handleViewReady} onCamadas={handleCamadas} />

                    <button
                        type="button"
                        onClick={() => setAbaAberta(!abaAberta)}
                        aria-expanded={abaAberta}
                        aria-label={abaAberta ? "Recolher painel" : "Abrir painel"}
                        title={abaAberta ? "Recolher painel" : "Abrir painel"}
                        className="absolute top-1/2 -translate-y-1/2 left-0 z-30 w-5 h-20 rounded-r-lg bg-[#0b1c38] shadow-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-[#12294d] transition-colors"
                    >
                        {abaAberta ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}

                        {!abaAberta && filtrosAtivos > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#1e6fd9] text-white text-[10px] font-bold flex items-center justify-center">
                                {filtrosAtivos}
                            </span>
                        )}
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

                    {/* Legenda do que está desenhado no mapa */}
                    <div className="absolute bottom-10 right-6 z-10 w-[270px] max-w-[calc(100%-3rem)] bg-[#0b1c38]/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-[#12294d] px-5 py-4">
                            <p className="text-white/70 text-sm truncate">{area?.label || "Todas as áreas"}</p>
                            <p className="text-white text-2xl font-bold tracking-wide">LUANDA</p>
                        </div>

                        <div className="px-5 py-4 space-y-2">
                            {principais.map((item) => (
                                <div key={item.valor} className="flex items-center gap-3">
                                    <span className="w-4 h-4 rounded shrink-0" style={{ backgroundColor: item.cor }} aria-hidden="true" />

                                    <span className="text-white text-sm flex-1">{item.label}</span>

                                    <span className="bg-[#0e2242] rounded-md px-3 py-1 min-w-[70px] text-center text-white text-base font-bold">
                                        {contagensPrincipais[item.valor] === undefined
                                            ? "—"
                                            : formatarNumero(contagensPrincipais[item.valor])}
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
