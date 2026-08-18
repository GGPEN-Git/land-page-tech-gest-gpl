import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Home, Minus, Plus, RotateCcw, SquarePen } from "lucide-react";
import Graphic from "@arcgis/core/Graphic";
import type MapView from "@arcgis/core/views/MapView";
import type Viewpoint from "@arcgis/core/Viewpoint";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { MapaArcGIS } from "./MapaArcGIS";
import { Utilizadores } from "./Utilizadores";
import { MenuConta } from "./MenuConta";
import { AlterarPalavraPasse } from "./AlterarPalavraPasse";
import { ModuloEdicao } from "./ModuloEdicao";
import { asset } from "../lib/utils";
import { criarRenderer, criarRendererControlo, lerLegenda } from "../lib/simbologia";
import { CONFORMIDADES, classificar, type Conformidade } from "../lib/conformidade";
import type { Papel, Utilizador } from "../lib/api";
import {
    AREAS,
    CAMADAS,
    CAMADAS_EDIFICIOS,
    CAMPO_AOI,
    CAMPO_CONTROLO,
    CAMPO_ESTADO,
    CONTROLOS,
    ESTADOS,
    FILTROS,
    VALOR_POR_VERIFICAR,
    comCondicao,
    condicaoControlo,
    construirWhere,
    formatarNumero,
} from "../lib/arcgis";

/** Largura da aba lateral em px. */
const LARGURA_ABA = 320;

interface DashboardProps {
    utilizador: Utilizador | null;
    onLogout?: () => void;
    papel?: Papel;
}

export function Dashboard({ utilizador, onLogout, papel }: DashboardProps) {
    const [abaAberta, setAbaAberta] = useState(true);
    const [gestaoAberta, setGestaoAberta] = useState(false);
    const [senhaAberta, setSenhaAberta] = useState(false);
    const [filtroAberto, setFiltroAberto] = useState<string | null>(null);

    /** Área escolhida — decide a camada ativa e, quando aplicável, o valor de AOI. */
    const [areaId, setAreaId] = useState<string | null>(null);
    /** Seleção dos restantes filtros (campo → valor). */
    const [selecoes, setSelecoes] = useState<Record<string, string>>({});
    /**
     * Como colorir os edifícios: "webmap" mantém a simbologia definida no ArcGIS
     * Online — assim qualquer alteração feita no portal aparece aqui sem tocar no código.
     * Por omissão usa-se "Inscrição", que é o campo por que o webmap está pintado.
     */
    const [colorirPor, setColorirPor] = useState<"webmap" | "controlo" | typeof CAMPO_ESTADO>(CAMPO_ESTADO);

    // Força "Inscrição" para utilizadores não-admin e impede alteração.
    useEffect(() => {
        if (papel !== "admin" && colorirPor !== CAMPO_ESTADO) {
            setColorirPor(CAMPO_ESTADO);
        }
    }, [papel, colorirPor]);

    const emControlo = colorirPor === "controlo" && papel === "admin";

    /** Contagens por valor de GGPEN_Controlo, respeitando os filtros. */
    const [controlos, setControlos] = useState<Record<number, number>>({});
    /** Incrementado depois de gravar, para as contagens voltarem a correr. */
    const [recarga, setRecarga] = useState(0);
    const [aMarcar, setAMarcar] = useState(false);
    /** Mensagem sobre o mapa, para o resultado da ação não ficar escondido na aba. */
    const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
    /** Polígono clicado em modo Controlo. */
    const [selecionado, setSelecionado] = useState<{
        objectid: number;
        bairro: string | null;
        controlo: number | null;
        conformidade: Conformidade;
    } | null>(null);

    const [opcoes, setOpcoes] = useState<Record<string, string[]>>({});
    const [contagens, setContagens] = useState<Record<number, number>>({});

    /** Cores e rótulos lidos do renderer em uso, para a legenda nunca mentir sobre o mapa. */
    const [coresMapa, setCoresMapa] = useState<Record<string, string>>({});
    const [rotulosMapa, setRotulosMapa] = useState<Record<string, string>>({});

    const [camadas, setCamadas] = useState<Record<string, FeatureLayer>>({});
    const [view, setView] = useState<MapView | null>(null);
    const [edicaoAberta, setEdicaoAberta] = useState(false);
    const [aConsultar, setAConsultar] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    /** Renderers tal como vieram do webmap, para os poder repor. */
    const renderersOriginaisRef = useRef<Record<string, FeatureLayer["renderer"]>>({});
    const viewRef = useRef<MapView | null>(null);
    const viewpointInicialRef = useRef<Viewpoint | null>(null);
    const primeiraConsultaRef = useRef(true);

    const area = AREAS.find((a) => a.id === areaId) || null;

    /**
     * Sem área escolhida somam-se as duas camadas de edifícios; com área, é só a dela.
     * `chaveCamadas` existe para o efeito não voltar a correr por o array ser novo a cada render.
     */
    const configsAtivas = area ? CAMADAS_EDIFICIOS.filter((c) => c.id === area.camadaId) : CAMADAS_EDIFICIOS;
    const chaveCamadas = configsAtivas.map((c) => c.id).join(",");
    const idsAtivos = new Set(configsAtivas.map((c) => c.id));

    const camadasProntas = configsAtivas.every((c) => camadas[c.id]);

    /**
     * O controlo é por camada — com as duas somadas não haveria onde escrever —
     * e só existe nas camadas que declarem o campo GGPEN_Controlo.
     */
    const camadaUnica = configsAtivas.length === 1 ? camadas[configsAtivas[0].id] : null;
    const temCampoControlo = !!camadaUnica?.fields?.some((c) => c.name === CAMPO_CONTROLO);
    const podeControlo = papel === "admin" && configsAtivas.length === 1 && temCampoControlo;
    const configControlo = podeControlo ? configsAtivas[0] : null;

    const principais = ESTADOS;
    const contagensPrincipais = contagens;

    const handleViewReady = useCallback((view: MapView) => {
        viewRef.current = view;
        viewpointInicialRef.current = view.viewpoint.clone();
        // Também em estado: o módulo de edição é um componente e precisa da view como prop.
        setView(view);
    }, []);

    const handleCamadas = useCallback((encontradas: Record<string, FeatureLayer>) => {
        setCamadas(encontradas);
    }, []);

    // Ficam visíveis as camadas de edifícios ativas; os contornos seguem a configuração.
    useEffect(() => {
        for (const [id, featureLayer] of Object.entries(camadas)) {
            const config = CAMADAS.find((c) => c.id === id);
            if (!config) continue;

            if (!config.campoSimbologia) {
                featureLayer.visible = config.visivelPorOmissao !== false;
                continue;
            }

            const ativa = idsAtivos.has(id);
            featureLayer.visible = ativa;

            // Limpa o filtro das camadas que deixaram de estar ativas.
            if (!ativa) featureLayer.definitionExpression = "";
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [camadas, chaveCamadas]);

    /** Clicar num polígono seleciona-o para controlo. */
    useEffect(() => {
        const view = viewRef.current;
        const layer = configControlo ? camadas[configControlo.id] : null;
        if (!view || !layer || !emControlo) return;

        // O popup dos atributos fica como está: o clique seleciona, e a marcação
        // é feita no painel de controlo, com um botão. Assim não há marcações por engano.
        const handle = view.on("click", async (evento) => {
            try {
                const resposta = await view.hitTest(evento, { include: [layer] });
                const acerto = resposta.results.find((r) => r.type === "graphic");
                const atributos = acerto && "graphic" in acerto ? acerto.graphic.attributes : null;

                if (!atributos) {
                    setSelecionado(null);
                    return;
                }

                // Basta o objectid: a gravação é um applyEdits na própria camada.
                const objectid = Number(atributos[layer.objectIdField]);

                if (!Number.isInteger(objectid)) {
                    setSelecionado(null);
                    setAviso({ tipo: "erro", texto: "Este polígono não tem identificador utilizável." });
                    return;
                }

                setSelecionado({
                    objectid,
                    bairro: typeof atributos.Bairro === "string" ? atributos.Bairro : null,
                    // Diagnóstico automático, para quem valida decidir com o mesmo
                    // critério que o mapa usa para desenhar.
                    conformidade: classificar(atributos),
                    // null quando ainda não houve análise — distinto de "Por verificar".
                    controlo:
                        atributos[CAMPO_CONTROLO] === null || atributos[CAMPO_CONTROLO] === undefined
                            ? null
                            : Number(atributos[CAMPO_CONTROLO]),
                });
                setAviso(null);
            } catch (e) {
                console.error("Falha ao ler o polígono:", e);
            }
        });

        return () => handle.remove();
    }, [camadas, configControlo, emControlo]);

    // Sair do modo de controlo limpa a seleção.
    useEffect(() => {
        if (!emControlo) setSelecionado(null);
    }, [emControlo]);

    /** Grava o estado de controlo no campo GGPEN_Controlo do serviço. */
    async function definirControlo(valor: number) {
        const layer = configControlo ? camadas[configControlo.id] : null;
        if (!selecionado || !layer) return;

        setAMarcar(true);

        try {
            const resultado = await layer.applyEdits({
                updateFeatures: [
                    new Graphic({
                        attributes: {
                            [layer.objectIdField]: selecionado.objectid,
                            [CAMPO_CONTROLO]: valor,
                        },
                    }),
                ],
            });

            const falha = resultado.updateFeatureResults?.[0]?.error;

            if (falha) throw new Error(falha.message || "O serviço recusou a alteração.");

            setSelecionado((atual) => (atual ? { ...atual, controlo: valor } : atual));
            layer.refresh();
            setRecarga((n) => n + 1);

            setAviso({
                tipo: "ok",
                texto: `Marcado como "${CONTROLOS.find((c) => c.valor === valor)?.label}".`,
            });
        } catch (e) {
            console.error("Falha ao gravar o controlo:", e);
            setAviso({
                tipo: "erro",
                texto: e instanceof Error ? e.message : "Não foi possível gravar no serviço.",
            });
        } finally {
            setAMarcar(false);
        }
    }

    // O aviso do controlo desaparece sozinho ao fim de alguns segundos.
    useEffect(() => {
        if (!aviso) return;

        const temporizador = setTimeout(() => setAviso(null), 4000);
        return () => clearTimeout(temporizador);
    }, [aviso]);

    /** Contagens por estado de controlo, restringidas pelos filtros em vigor. */
    useEffect(() => {
        if (!emControlo || !configControlo) {
            setControlos({});
            return;
        }

        const layer = camadas[configControlo.id];
        if (!layer) return;

        let cancelado = false;

        const efetivas = area?.aoi ? { ...selecoes, [CAMPO_AOI]: area.aoi } : selecoes;
        const clausula = configControlo.filtroBase
            ? comCondicao(construirWhere(efetivas), configControlo.filtroBase)
            : construirWhere(efetivas);

        async function contar() {
            try {
                const totais = await Promise.all(
                    CONTROLOS.map(
                        async (c) =>
                            [
                                c.valor,
                                await layer.queryFeatureCount({ where: comCondicao(clausula, condicaoControlo(c.valor)) }),
                            ] as const,
                    ),
                );

                if (!cancelado) setControlos(Object.fromEntries(totais));
            } catch (e) {
                console.debug("Falha ao contar o controlo:", e);
            }
        }

        contar();

        return () => {
            cancelado = true;
        };
    }, [emControlo, configControlo, camadas, area, selecoes, recarga]);

    // Substitui o renderer do webmap quando se escolhe um campo; "webmap" repõe o original.
    useEffect(() => {
        for (const config of configsAtivas) {
            const layer = camadas[config.id];
            if (!layer) continue;

            // Guarda-se o renderer do portal na primeira vez, para o poder repor.
            if (!(config.id in renderersOriginaisRef.current)) {
                renderersOriginaisRef.current[config.id] = layer.renderer;
            }

            if (colorirPor === "webmap") {
                layer.renderer = renderersOriginaisRef.current[config.id];
                continue;
            }

            // Em controlo não há campo por que colorir: usa-se um contorno de alto
            // contraste para os polígonos se lerem bem sobre a imagem de satélite.
            if (colorirPor === "controlo") {
                layer.renderer = criarRendererControlo();
                continue;
            }

            layer.renderer = criarRenderer(CAMPO_ESTADO, ESTADOS);
        }

        // Depois de definidos, lê-se do renderer o que o cartão vai mostrar.
        const campoCartao = CAMPO_ESTADO;
        let cores: Record<string, string> = {};
        let rotulos: Record<string, string> = {};

        for (const config of configsAtivas) {
            const legenda = lerLegenda(camadas[config.id]?.renderer);

            if (legenda.campo === campoCartao && Object.keys(legenda.cores).length > 0) {
                cores = legenda.cores;
                rotulos = legenda.rotulos;
                break;
            }
        }

        setCoresMapa(cores);
        setRotulosMapa(rotulos);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [camadas, chaveCamadas, colorirPor]);

    // Trocar de área invalida as escolhas anteriores: os bairros de uma não existem na outra.
    useEffect(() => {
        setSelecoes({});
        setFiltroAberto(null);
    }, [areaId]);

    useEffect(() => {
        if (!camadasProntas) return;

        let cancelado = false;

        // O AOI da área só existe para a camada de Boavista; quando está definido,
        // essa é de qualquer forma a única camada ativa.
        const efetivas = area?.aoi ? { ...selecoes, [CAMPO_AOI]: area.aoi } : selecoes;

        /** Cada camada tem o seu filtroBase, que a interface não remove. */
        const whereDe = (config: (typeof CAMADAS_EDIFICIOS)[number], ignorar?: string) => {
            const clausula = construirWhere(efetivas, ignorar);
            return config.filtroBase ? comCondicao(clausula, config.filtroBase) : clausula;
        };

        const alvos = configsAtivas.map((config) => ({ config, layer: camadas[config.id] }));

        for (const { config, layer } of alvos) {
            layer.definitionExpression = whereDe(config);
        }

        setAConsultar(true);

        async function enquadrar() {
            const view = viewRef.current;
            if (!view) return;

            if (primeiraConsultaRef.current) {
                primeiraConsultaRef.current = false;
                return;
            }

            const semFiltros = Object.keys(efetivas).length === 0;

            try {
                if (semFiltros) {
                    const inicial = viewpointInicialRef.current;
                    if (inicial) await view.goTo(inicial);
                    return;
                }

                // Com várias camadas, enquadra-se pela união das extensões.
                let uniao = null;

                for (const { config, layer } of alvos) {
                    const { count, extent } = await layer.queryExtent({ where: whereDe(config) });
                    if (count === 0 || !extent) continue;

                    uniao = uniao ? uniao.union(extent) : extent.clone();
                }

                if (cancelado || !uniao) return;

                await view.goTo(uniao.expand(1.3));
            } catch (e) {
                console.debug("Não foi possível enquadrar a seleção:", e);
            }
        }

        async function carregar() {
            try {
                // Opções de cada filtro: união dos valores de todas as camadas ativas.
                const listas = await Promise.all(
                    FILTROS.map(async (filtro) => {
                        const conjuntos = await Promise.all(
                            alvos.map(async ({ config, layer }) => {
                                const resultado = await layer.queryFeatures({
                                    where: whereDe(config, filtro.campo),
                                    outFields: [filtro.campo],
                                    returnDistinctValues: true,
                                    returnGeometry: false,
                                    orderByFields: [filtro.campo],
                                });

                                return resultado.features
                                    .map((f) => f.attributes[filtro.campo])
                                    .filter((v): v is string => typeof v === "string" && v.trim() !== "");
                            }),
                        );

                        const valores = [...new Set(conjuntos.flat())].sort((a, b) => a.localeCompare(b, "pt"));

                        return [filtro.campo, valores] as const;
                    }),
                );

                /** Soma a contagem em todas as camadas ativas que tenham o campo. */
                const somar = async (campo: string, valor: number) => {
                    const parcelas = await Promise.all(
                        alvos.map(({ config, layer }) =>
                            layer.queryFeatureCount({ where: comCondicao(whereDe(config), `${campo} = ${valor}`) }),
                        ),
                    );

                    return parcelas.reduce((total, parcela) => total + parcela, 0);
                };

                const totaisEstado = await Promise.all(
                    ESTADOS.map(async (e) => [e.valor, await somar(CAMPO_ESTADO, e.valor)] as const),
                );

                if (cancelado) return;

                setOpcoes(Object.fromEntries(listas));
                setContagens(Object.fromEntries(totaisEstado));
                setErro(null);

                await enquadrar();
            } catch (e) {
                if (cancelado) return;

                console.error("Falha ao consultar as camadas:", e);
                setErro("Não foi possível obter os dados do serviço.");
            } finally {
                if (!cancelado) setAConsultar(false);
            }
        }

        carregar();

        return () => {
            cancelado = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [camadas, camadasProntas, chaveCamadas, area, selecoes]);

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
                        {utilizador && (
                            <MenuConta
                                utilizador={utilizador}
                                onGerirUtilizadores={() => setGestaoAberta(true)}
                                onAlterarPalavraPasse={() => setSenhaAberta(true)}
                                onTerminarSessao={() => onLogout?.()}
                            />
                        )}
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

                        {/* ÁREA — pode trocar de camada, por isso não passa pelo ciclo dos outros
                            filtros. Escondida quando não há áreas configuradas. */}
                        <div className={AREAS.length === 0 ? "hidden" : "border-b border-white/10"}>
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

                        <h2 className="text-white/50 text-xs font-semibold tracking-[0.15em] uppercase mt-8 mb-3">
                            Colorir mapa por
                        </h2>

                        {papel === "admin" ? (
                            <div className="flex rounded-lg bg-[#0e2242] p-1">
                                {(
                                    [
                                        { campo: "webmap", label: "Webmap" },
                                        { campo: CAMPO_ESTADO, label: "Estado" },
                                        { campo: "controlo", label: "Controlo" },
                                    ] as const
                                ).map((opcao) => {
                                    const indisponivel = opcao.campo === "controlo" && !podeControlo;
                                    const motivo = "Escolha uma área — o controlo escreve numa camada de cada vez";

                                    return (
                                        <button
                                            key={opcao.campo}
                                            type="button"
                                            onClick={() => setColorirPor(opcao.campo)}
                                            disabled={indisponivel}
                                            title={indisponivel ? motivo : undefined}
                                            className={`flex-1 rounded-md py-1.5 text-xs transition-colors ${
                                                colorirPor === opcao.campo && !indisponivel
                                                    ? "bg-[#1e6fd9] text-white"
                                                    : "text-white/60 hover:text-white disabled:opacity-30 disabled:hover:text-white/60"
                                            }`}
                                        >
                                            {opcao.label}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex rounded-lg bg-[#0e2242] p-1">
                                <button
                                    type="button"
                                    disabled
                                    className="flex-1 rounded-md py-1.5 text-xs bg-[#1e6fd9] text-white cursor-default"
                                >
                                    Estado
                                </button>
                            </div>
                        )}

                        {emControlo && (
                            <>
                                <p className="mt-3 rounded-md bg-[#1a4d2e]/30 border border-[#5dd618]/20 px-3 py-2 text-[11px] text-[#b6e9a0] leading-snug">
                                    Clique num polígono para ver os detalhes e marcar no painel em baixo à esquerda. O
                                    <strong className="font-semibold"> preenchimento</strong> mostra o estado de controlo; o
                                    <strong className="font-semibold"> contorno</strong> mostra a verificação automática.
                                </p>

                                <h2 className="text-white/50 text-xs font-semibold tracking-[0.15em] uppercase mt-6 mb-3">
                                    Contornos
                                </h2>

                                <div className="space-y-1.5">
                                    {CONFORMIDADES.map((item) => (
                                        <div key={item.id} className="flex items-start gap-2.5">
                                            <span
                                                className="w-3.5 h-3.5 rounded-sm shrink-0 mt-0.5 border-2"
                                                style={{ borderColor: item.cor }}
                                                aria-hidden="true"
                                            />

                                            <span className="text-white/70 text-[11px] leading-snug flex-1">
                                                {item.resumo}
                                                {!item.desenhada && <span className="text-white/30"> (sem símbolo no webmap)</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Edição: escreve no ArcGIS, ao contrário de tudo o resto. Só admin. */}
                        {papel === "admin" && (
                            <>
                                <h2 className="text-white/50 text-xs font-semibold tracking-[0.15em] uppercase mt-8 mb-3">
                                    Edição
                                </h2>

                                <button
                                    type="button"
                                    onClick={() => setEdicaoAberta((v) => !v)}
                                    disabled={configsAtivas.length !== 1}
                                    title={
                                        configsAtivas.length !== 1 ? "Escolha uma área — a edição é numa camada" : undefined
                                    }
                                    className="w-full flex items-center justify-center gap-2 rounded-md bg-[#1e6fd9] py-2 text-sm text-white hover:bg-[#1a5fb8] transition-colors disabled:opacity-30 disabled:hover:bg-[#1e6fd9]"
                                >
                                    <SquarePen className="w-4 h-4" />
                                    {edicaoAberta ? "Fechar edição" : "Editar edifícios"}
                                </button>
                            </>
                        )}

                        <p className="mt-8 text-[11px] text-white/40 leading-snug">
                            {configsAtivas.length > 1 ? "Camadas somadas: " : "Camada em uso: "}
                            {configsAtivas.map((c) => c.titulo).join(" + ")}
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

                    {/* Aviso do controlo, por cima do mapa */}
                    {emControlo && aviso && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 max-w-[90%]">
                            <p
                                role="status"
                                className={`rounded-lg px-4 py-2 text-sm shadow-lg backdrop-blur-sm ${
                                    aviso.tipo === "ok" ? "bg-[#1a4d2e] text-white" : "bg-[#5c1414] text-[#f0c8c8]"
                                }`}
                            >
                                {aviso.texto}
                            </p>
                        </div>
                    )}

                    {/* Painel do polígono selecionado, ao lado do popup de atributos */}
                    {emControlo && (
                        <div className="absolute bottom-10 left-6 z-30 w-[280px] max-w-[calc(100%-3rem)] bg-[#0b1c38]/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
                            <div className="bg-[#12294d] px-5 py-3">
                                <p className="text-white/60 text-[11px] uppercase tracking-[0.15em]">Controlo</p>
                                <p className="text-white text-sm font-medium truncate">
                                    {selecionado ? `Polígono ${selecionado.objectid}` : "Nenhum polígono selecionado"}
                                </p>
                                {selecionado?.bairro && (
                                    <p className="text-white/50 text-xs truncate">{selecionado.bairro}</p>
                                )}
                            </div>

                            <div className="px-5 py-4">
                                {selecionado ? (
                                    <div className="space-y-2">
                                        {/* Diagnóstico automático, pelas mesmas regras do webmap */}
                                        <div className="mb-4 rounded-lg bg-[#0e2242] px-3 py-2.5">
                                            <p className="text-white/50 text-[10px] uppercase tracking-[0.15em] mb-1.5">
                                                Verificação automática
                                            </p>

                                            <div className="flex items-start gap-2">
                                                <span
                                                    className="w-3 h-3 rounded-sm shrink-0 mt-0.5"
                                                    style={{ backgroundColor: selecionado.conformidade.cor }}
                                                    aria-hidden="true"
                                                />

                                                <span
                                                    className={`text-xs leading-snug ${
                                                        selecionado.conformidade.ok ? "text-[#b6e9a0]" : "text-[#f0c8a0]"
                                                    }`}
                                                >
                                                    {selecionado.conformidade.resumo}
                                                </span>
                                            </div>

                                            {!selecionado.conformidade.desenhada && (
                                                <p className="mt-1.5 text-[10px] text-white/40 leading-snug">
                                                    O webmap não tem símbolo para esta categoria — este polígono não é
                                                    desenhado.
                                                </p>
                                            )}
                                        </div>

                                        {CONTROLOS.map((opcao) => {
                                            // null conta como "Por verificar": são três ESTADOS apenas.
                                            const atual = (selecionado.controlo ?? VALOR_POR_VERIFICAR) === opcao.valor;

                                            return (
                                                <button
                                                    key={opcao.valor}
                                                    type="button"
                                                    onClick={() => definirControlo(opcao.valor)}
                                                    disabled={aMarcar || atual}
                                                    className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                                                        atual
                                                            ? "bg-white/15 text-white cursor-default"
                                                            : "text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50"
                                                    }`}
                                                >
                                                    <span
                                                        className="w-4 h-4 rounded shrink-0"
                                                        style={{ backgroundColor: opcao.cor }}
                                                        aria-hidden="true"
                                                    />

                                                    <span className="flex-1 text-left">{opcao.label}</span>

                                                    {atual && <span className="text-[11px] text-white/50">atual</span>}
                                                </button>
                                            );
                                        })}

                                        {aMarcar && <p className="text-[11px] text-white/50 pt-1">A gravar no serviço…</p>}
                                    </div>
                                ) : (
                                    <p className="text-white/50 text-xs leading-snug">
                                        Clique num polígono do mapa. Os detalhes abrem na janela habitual e o estado de
                                        controlo aparece aqui.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {edicaoAberta && configsAtivas.length === 1 && (
                        <ModuloEdicao
                            view={view}
                            camada={camadas[configsAtivas[0].id] || null}
                            titulo={configsAtivas[0].titulo}
                            onFechar={() => setEdicaoAberta(false)}
                        />
                    )}

                    {/* Legenda do que está desenhado no mapa */}
                    <div className="absolute bottom-10 right-6 z-10 w-[270px] max-w-[calc(100%-3rem)] bg-[#0b1c38]/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-[#12294d] px-5 py-4">
                            <p className="text-white/70 text-sm truncate">{area?.label || "Todas as áreas"}</p>
                            <p className="text-white text-2xl font-bold tracking-wide">LUANDA</p>
                        </div>

                        <div className="px-5 py-4 space-y-2">
                            {emControlo ? (
                                CONTROLOS.map((item) => (
                                      <div key={item.valor} className="flex items-center gap-3">
                                          <span
                                              className="w-4 h-4 rounded shrink-0"
                                              style={{ backgroundColor: item.cor }}
                                              aria-hidden="true"
                                          />

                                          <span className="text-white text-sm flex-1">{item.label}</span>

                                          <span className="bg-[#0e2242] rounded-md px-3 py-1 min-w-[70px] text-center text-white text-base font-bold">
                                              {controlos[item.valor] === undefined
                                                  ? "—"
                                                  : formatarNumero(controlos[item.valor])}
                                          </span>
                                      </div>
                                  ))
                            ) : (
                                principais.map((item) => (
                                    <div key={item.valor} className="flex items-center gap-3">
                                        <span
                                            className="w-4 h-4 rounded shrink-0"
                                            style={{ backgroundColor: coresMapa[String(item.valor)] || item.cor }}
                                            aria-hidden="true"
                                        />

                                        <span className="text-white text-sm flex-1">
                                            {rotulosMapa[String(item.valor)] || item.label}
                                        </span>

                                        <span className="bg-[#0e2242] rounded-md px-3 py-1 min-w-[70px] text-center text-white text-base font-bold">
                                            {contagensPrincipais[item.valor] === undefined
                                                ? "—"
                                                : formatarNumero(contagensPrincipais[item.valor])}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {gestaoAberta && utilizador && (
                <Utilizadores atual={utilizador} onFechar={() => setGestaoAberta(false)} />
            )}

            {senhaAberta && <AlterarPalavraPasse onFechar={() => setSenhaAberta(false)} />}
        </div>
    );
}
