import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Home, Layers, Ruler, Store, type LucideIcon } from "lucide-react";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import { asset } from "../lib/utils";
import { AREAS, CAMADAS_EDIFICIOS, comCondicao, construirWhere, formatarNumero } from "../lib/arcgis";
import { CAMPOS_ESTATISTICA, calcular, type Estatisticas } from "../lib/estatisticas";
import { SERIES } from "../lib/graficos";
import { BarrasHorizontais } from "./ui/BarrasHorizontais";
import { ColunasAgrupadas } from "./ui/ColunasAgrupadas";

interface PainelEstatisticasProps {
    onVoltar?: () => void;
}

const PAGINA = 2000;

/** Quantas linhas de uma distribuição se mostram antes do "ver as restantes". */
const LIMITE_LISTA = 8;

const VERDE = "#1a4d2e";
const AZUL = "#1e6fd9";
const TERRACOTA = "#c4703d";
const DOURADO = "#c4b03d";

/**
 * Indicadores do relatório, calculados a partir da camada em tempo real.
 *
 * Não usa mapa: uma `FeatureLayer` avulsa consulta o serviço na mesma, e assim
 * não fica dependente de um `MapView` com contentor visível.
 */
export function PainelEstatisticas({ onVoltar }: PainelEstatisticasProps) {
    const [areaId, setAreaId] = useState<string>(AREAS[0].id);
    const [dados, setDados] = useState<Estatisticas | null>(null);
    const [aCarregar, setACarregar] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const area = AREAS.find((a) => a.id === areaId) || AREAS[0];
    const config = CAMADAS_EDIFICIOS.find((c) => c.id === area.camadaId) || CAMADAS_EDIFICIOS[0];

    useEffect(() => {
        let cancelado = false;

        // Camada avulsa, sem mapa: consultar não exige um MapView, e depender de um
        // obrigaria a ter o mapa visível para o contentor ganhar tamanho.
        const layer = new FeatureLayer({ url: config.url });

        const selecoes: Record<string, string> = area.aoi ? { AOI: area.aoi } : {};
        const base = config.filtroBase;
        const where = base ? comCondicao(construirWhere(selecoes), base) : construirWhere(selecoes);

        async function carregar() {
            setACarregar(true);
            setErro(null);

            try {
                await layer.load();

                const disponiveis = CAMPOS_ESTATISTICA.filter((c) => layer.fields?.some((f) => f.name === c));
                const registos: Record<string, unknown>[] = [];

                let inicio = 0;

                // Uma passagem só, em páginas: os indicadores todos saem daqui.
                for (;;) {
                    const resposta = await layer.queryFeatures({
                        where,
                        outFields: disponiveis,
                        returnGeometry: false,
                        start: inicio,
                        num: PAGINA,
                        orderByFields: [layer.objectIdField],
                    });

                    if (cancelado) return;

                    registos.push(...resposta.features.map((f) => f.attributes));

                    if (resposta.features.length < PAGINA) break;
                    inicio += PAGINA;
                }

                if (!cancelado) setDados(calcular(registos));
            } catch (e) {
                if (cancelado) return;

                console.error("Falha ao calcular indicadores:", e);
                setErro("Não foi possível obter os dados do serviço.");
            } finally {
                if (!cancelado) setACarregar(false);
            }
        }

        carregar();

        return () => {
            cancelado = true;
        };
    }, [config, area]);

    return (
        <div className="min-h-screen flex flex-col bg-stone-100 font-sans text-stone-900">
            {/* Colada ao topo: a página é longa e o seletor de área tem de continuar à mão. */}
            <header className="sticky top-0 z-20 shrink-0 bg-[#0b1c38] shadow-md">
                <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        {onVoltar && (
                            <button
                                type="button"
                                onClick={onVoltar}
                                aria-label="Voltar ao painel"
                                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}

                        <div className="bg-white rounded shrink-0 px-1.5 py-0.5 flex items-center justify-center">
                            <img
                                src={asset("client_luanda1.png")}
                                alt="Governo Provincial de Luanda"
                                className="h-7 w-auto object-contain"
                            />
                        </div>

                        <div className="min-w-0">
                            <h1 className="text-white text-sm md:text-base font-semibold truncate leading-tight">
                                Indicadores do levantamento
                            </h1>
                            <p className="text-white/50 text-xs truncate">Valores lidos da camada em tempo real</p>
                        </div>
                    </div>

                    <div className="flex rounded-full bg-white/10 p-1 shrink-0">
                        {AREAS.map((opcao) => (
                            <button
                                key={opcao.id}
                                type="button"
                                onClick={() => setAreaId(opcao.id)}
                                className={`rounded-full px-3 md:px-4 py-1.5 text-xs font-medium transition-colors ${
                                    areaId === opcao.id
                                        ? "bg-white text-[#0b1c38]"
                                        : "text-white/70 hover:text-white hover:bg-white/10"
                                }`}
                            >
                                {opcao.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 md:px-6 py-8 md:py-10">
                {erro && (
                    <p
                        role="alert"
                        className="rounded-xl bg-[#c43d3d]/10 border border-[#c43d3d]/30 px-4 py-3 text-sm text-[#8a2020]"
                    >
                        {erro}
                    </p>
                )}

                {aCarregar && !erro && <Esqueleto />}

                {dados && !aCarregar && !erro && (
                    <motion.div
                        key={area.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className="space-y-8"
                    >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h2 className="text-2xl md:text-3xl font-serif font-bold">{area.label}</h2>

                            <p className="text-sm text-stone-500">
                                {formatarNumero(dados.porBairro.length)}{" "}
                                {dados.porBairro.length === 1 ? "bairro" : "bairros"}
                            </p>
                        </div>

                        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <Indicador
                                icone={Layers}
                                cor="#4d7ea8"
                                titulo="Polígonos mapeados"
                                valor={dados.poligonos}
                                nota="Edifícios desenhados no terreno"
                            />
                            <Indicador
                                icone={Building2}
                                cor={VERDE}
                                titulo="Imóveis identificados"
                                valor={dados.imoveis}
                                nota="Unidades autónomas"
                                destaque
                            />
                            <Indicador
                                icone={Home}
                                cor={AZUL}
                                titulo="Habitações"
                                valor={dados.habitacoes}
                                nota={`${percentagem(dados.habitacoes, dados.imoveis)} dos imóveis`}
                            />
                            <Indicador
                                icone={Store}
                                cor={TERRACOTA}
                                titulo="Outras afetações"
                                valor={dados.outrasAfetacoes}
                                nota={`${percentagem(dados.outrasAfetacoes, dados.imoveis)} dos imóveis`}
                            />
                        </section>

                        {/* Faixa da área: números derivados, que não merecem um cartão cada. */}
                        <section className="rounded-2xl border border-stone-200 bg-white shadow-sm px-5 py-4 flex flex-wrap items-center gap-x-10 gap-y-4">
                            <span
                                className="rounded-xl p-2.5 shrink-0"
                                style={{ backgroundColor: `${DOURADO}1f`, color: "#7a6c11" }}
                                aria-hidden="true"
                            >
                                <Ruler className="w-5 h-5" />
                            </span>

                            <Medida titulo="Área construída" valor={`${formatarNumero(Math.round(dados.area))} m²`} />
                            <Medida titulo="Equivalente" valor={`${(dados.area / 10000).toFixed(2)} ha`} />
                            <Medida
                                titulo="Média por polígono"
                                valor={`${formatarNumero(Math.round(dados.area / (dados.poligonos || 1)))} m²`}
                            />
                            <Medida
                                titulo="Imóveis por polígono"
                                valor={(dados.imoveis / (dados.poligonos || 1)).toFixed(2).replace(".", ",")}
                            />
                        </section>

                        <section>
                            <h3 className="text-lg font-serif font-bold mb-3">Imóveis e habitações por bairro</h3>

                            <Cartao className="px-5 py-5">
                                <ColunasAgrupadas
                                    categorias={dados.porBairro.map((b) => b.bairro)}
                                    series={[
                                        { nome: "Imóveis identificados", valores: dados.porBairro.map((b) => b.imoveis) },
                                        { nome: "Dos quais habitações", valores: dados.porBairro.map((b) => b.habitacoes) },
                                    ]}
                                />
                            </Cartao>
                        </section>

                        <section className="grid gap-6 xl:grid-cols-3">
                            <Distribuicao
                                titulo="Tipologia das habitações"
                                base={dados.baseTipologias}
                                itens={agruparTipologias(dados.tipologias)}
                            />

                            <Distribuicao
                                titulo="Tipo de construção"
                                base={dados.habitacoes}
                                itens={dados.construcoes}
                            />

                            <Distribuicao titulo="Afetação dos imóveis" base={dados.imoveis} itens={dados.afetacoes} />
                        </section>

                        <PorBairro dados={dados} />

                        <p className="text-xs text-stone-500 leading-relaxed max-w-3xl">
                            Um polígono corresponde a um edifício mapeado e vale por um imóvel; quando contém mais do que
                            uma unidade autónoma, o campo <code className="text-stone-600">Num_Edif</code> regista o
                            total. Os valores são lidos da camada no momento em que abre esta página.
                        </p>
                    </motion.div>
                )}
            </main>
        </div>
    );
}

/** Tipologias com barra própria. O resto vai todo para um grupo só. */
const TIPOLOGIAS_DETALHADAS = ["T0", "T1", "T2", "T3", "T4"];

const GRUPO_RESTANTES = "T5 e superiores / s. inf.";

/**
 * Agrupa como o relatório do levantamento: T0 a T4 com barra própria, e T5 em
 * diante juntos com o que não tem tipologia indicada — são poucas dezenas de
 * unidades, e separadas dariam seis barras coladas ao zero.
 */
function agruparTipologias(itens: { chave: string; total: number }[]) {
    const detalhe = itens.filter((i) => TIPOLOGIAS_DETALHADAS.includes(i.chave));
    const restantes = itens.reduce((soma, i) => (TIPOLOGIAS_DETALHADAS.includes(i.chave) ? soma : soma + i.total), 0);

    return restantes > 0 ? [...detalhe, { chave: GRUPO_RESTANTES, total: restantes }] : detalhe;
}

function percentagem(parte: number, total: number): string {
    if (!total) return "—";

    return `${((parte / total) * 100).toFixed(1).replace(".", ",")}%`;
}

function Cartao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`rounded-2xl border border-stone-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

function Medida({ titulo, valor }: { titulo: string; valor: string }) {
    return (
        <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">{titulo}</p>
            <p className="text-lg font-semibold tabular-nums text-stone-900">{valor}</p>
        </div>
    );
}

function Indicador({
    icone: Icone,
    cor,
    titulo,
    valor,
    nota,
    destaque,
}: {
    icone: LucideIcon;
    cor: string;
    titulo: string;
    valor: number;
    nota?: string;
    destaque?: boolean;
}) {
    return (
        <Cartao className={`px-5 py-4 ${destaque ? "ring-1 ring-[#1a4d2e]/25" : ""}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm text-stone-500 truncate">{titulo}</p>

                    <p className="mt-1 text-3xl font-bold tabular-nums" style={destaque ? { color: cor } : undefined}>
                        {formatarNumero(valor)}
                    </p>

                    {nota && <p className="mt-1 text-xs text-stone-400 truncate">{nota}</p>}
                </div>

                <span
                    className="rounded-xl p-2.5 shrink-0"
                    style={{ backgroundColor: `${cor}1f`, color: cor }}
                    aria-hidden="true"
                >
                    <Icone className="w-5 h-5" />
                </span>
            </div>
        </Cartao>
    );
}

function Distribuicao({
    titulo,
    base,
    itens,
    nota,
}: {
    titulo: string;
    base: number;
    itens: { chave: string; total: number }[];
    nota?: string;
}) {
    const [tudo, setTudo] = useState(false);

    const visiveis = tudo ? itens : itens.slice(0, LIMITE_LISTA);
    const escondidos = itens.length - visiveis.length;

    return (
        <Cartao className="px-5 py-4 flex flex-col">
            <h3 className="text-base font-semibold">{titulo}</h3>
            <p className="text-xs text-stone-500 mb-4">Base: {formatarNumero(base)}</p>

            <div className="flex-1">
                {visiveis.length === 0 ? (
                    <p className="text-sm text-stone-400">Sem dados.</p>
                ) : (
                    <BarrasHorizontais itens={visiveis} base={base} />
                )}
            </div>

            {escondidos > 0 && (
                <button
                    type="button"
                    onClick={() => setTudo(true)}
                    className="mt-4 self-start text-xs font-medium text-[#1a4d2e] hover:underline"
                >
                    Ver as restantes {escondidos}
                </button>
            )}

            {tudo && itens.length > LIMITE_LISTA && (
                <button
                    type="button"
                    onClick={() => setTudo(false)}
                    className="mt-4 self-start text-xs font-medium text-stone-500 hover:underline"
                >
                    Mostrar menos
                </button>
            )}

            {nota && <p className="mt-3 text-xs text-stone-400 leading-snug">{nota}</p>}
        </Cartao>
    );
}

function PorBairro({ dados }: { dados: Estatisticas }) {
    const maximo = dados.porBairro.reduce((maior, l) => Math.max(maior, l.imoveis), 0) || 1;

    return (
        <section>
            <h3 className="text-lg font-serif font-bold mb-3">Por bairro</h3>

            <Cartao className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[46rem]">
                        <thead className="bg-[#0b1c38] text-white text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium">Bairro</th>
                                <th className="px-4 py-3 font-medium text-right">Polígonos</th>
                                <th className="px-4 py-3 font-medium text-right">Imóveis</th>
                                <th className="px-4 py-3 font-medium text-right">Habitações</th>
                                <th className="px-4 py-3 font-medium text-right">Outras</th>
                                <th className="px-4 py-3 font-medium text-right">Área (m²)</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-stone-100">
                            {dados.porBairro.map((linha) => (
                                <tr key={linha.bairro} className="hover:bg-stone-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-stone-800">{linha.bairro}</p>

                                        {/* Peso do bairro no total, sem ser preciso comparar números. */}
                                        <span className="mt-1.5 block h-1 w-full max-w-[10rem] rounded-full bg-stone-100 overflow-hidden">
                                            <span
                                                className="block h-full rounded-full"
                                                style={{
                                                    width: `${(linha.imoveis / maximo) * 100}%`,
                                                    backgroundColor: SERIES[0],
                                                }}
                                            />
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                                        {formatarNumero(linha.poligonos)}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                                        {formatarNumero(linha.imoveis)}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                                        {formatarNumero(linha.habitacoes)}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                                        {formatarNumero(linha.outrasAfetacoes)}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-stone-600">
                                        {formatarNumero(Math.round(linha.area))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>

                        <tfoot className="bg-stone-50 border-t-2 border-stone-200 font-semibold">
                            <tr>
                                <td className="px-4 py-3">Total</td>
                                <td className="px-4 py-3 text-right tabular-nums">{formatarNumero(dados.poligonos)}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{formatarNumero(dados.imoveis)}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{formatarNumero(dados.habitacoes)}</td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {formatarNumero(dados.outrasAfetacoes)}
                                </td>
                                <td className="px-4 py-3 text-right tabular-nums">
                                    {formatarNumero(Math.round(dados.area))}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Cartao>
        </section>
    );
}

/** Estrutura da página enquanto os dados não chegam — evita o salto no layout. */
function Esqueleto() {
    return (
        <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="A calcular indicadores">
            <div className="h-8 w-64 rounded bg-stone-200" />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-2xl border border-stone-200 bg-white" />
                ))}
            </div>

            <div className="h-20 rounded-2xl border border-stone-200 bg-white" />

            <div className="grid gap-6 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-72 rounded-2xl border border-stone-200 bg-white" />
                ))}
            </div>

            <div className="h-64 rounded-2xl border border-stone-200 bg-white" />
        </div>
    );
}
