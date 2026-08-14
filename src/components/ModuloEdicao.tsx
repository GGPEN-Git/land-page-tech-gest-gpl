import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Editor from "@arcgis/core/widgets/Editor";
import FormTemplate from "@arcgis/core/form/FormTemplate";
import FieldElement from "@arcgis/core/form/elements/FieldElement";
import type MapView from "@arcgis/core/views/MapView";
import type FeatureLayer from "@arcgis/core/layers/FeatureLayer";

/**
 * Campos que nunca fazem sentido num formulário: identificadores, geometria
 * calculada pelo servidor e o registo automático de quem editou.
 */
const CAMPOS_DE_SISTEMA = /^(fid|objectid|globalid|shape_|shape__|creator|editor|creationda|creation_|editdate|creationdate)/i;

interface ModuloEdicaoProps {
    view: MapView | null;
    camada: FeatureLayer | null;
    /** Título da camada, para o utilizador saber onde está a escrever. */
    titulo: string;
    onFechar: () => void;
}

/**
 * Edição das feições existentes, com o widget Editor do ArcGIS.
 *
 * Ao contrário do modo Controlo, isto **escreve no serviço do ArcGIS Online**.
 * A aplicação não está autenticada no portal, portanto as edições vão como
 * anónimas — o serviço tem de as aceitar, ou o widget devolve erro ao guardar.
 *
 * Criação e eliminação ficam desligadas de propósito: são registos de um
 * levantamento oficial, e nem um apagar nem um polígono a mais desenhado por
 * engano teriam como ser desfeitos pela interface.
 */
export function ModuloEdicao({ view, camada, titulo, onFechar }: ModuloEdicaoProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [erro, setErro] = useState<string | null>(null);
    /** Campos que o serviço não deixa alterar — explicados ao utilizador. */
    const [naoEditaveis, setNaoEditaveis] = useState<string[]>([]);

    useEffect(() => {
        const container = containerRef.current;
        if (!view || !camada || !container) return;

        const operacoes = camada.capabilities?.operations;

        if (!operacoes?.supportsUpdate) {
            setErro("Esta camada não permite editar registos.");
            return;
        }

        // Sem formTemplate o Editor inventa o formulário e deixa campos de fora.
        // Construímo-lo a partir dos campos editáveis da própria camada, pela
        // ordem em que estão definidos no serviço.
        const editaveis = camada.fields.filter(
            (campo) => campo.editable && !CAMPOS_DE_SISTEMA.test(campo.name),
        );

        if (editaveis.length === 0) {
            setErro("O serviço não declara nenhum campo editável.");
            return;
        }

        const formTemplateAnterior = camada.formTemplate;

        camada.formTemplate = new FormTemplate({
            title: "{Bairro}",
            // Campos com domínio aparecem como lista de opções; os restantes como texto.
            elements: editaveis.map(
                (campo) => new FieldElement({ fieldName: campo.name, label: campo.alias || campo.name }),
            ),
        });

        setNaoEditaveis(
            camada.fields
                .filter((campo) => !campo.editable && !CAMPOS_DE_SISTEMA.test(campo.name))
                .map((campo) => campo.alias || campo.name),
        );

        const editor = new Editor({
            view,
            container,
            layerInfos: [
                {
                    layer: camada,
                    enabled: true,
                    addEnabled: false,
                    updateEnabled: true,
                    deleteEnabled: false,
                },
            ],
        });

        return () => {
            editor.destroy();
            camada.formTemplate = formTemplateAnterior;
        };
    }, [view, camada]);

    return (
        <aside className="absolute top-0 right-0 bottom-0 z-40 w-[340px] max-w-full bg-white shadow-2xl flex flex-col">
            <header className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 bg-[#0b1c38]">
                <div className="min-w-0">
                    <p className="text-white/60 text-[11px] uppercase tracking-[0.15em]">Edição</p>
                    <p className="text-white text-sm font-medium truncate">{titulo}</p>
                </div>

                <button
                    type="button"
                    onClick={onFechar}
                    aria-label="Fechar edição"
                    className="w-8 h-8 shrink-0 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </header>

            {erro ? (
                <p className="p-4 text-sm text-[#8a2020]">{erro}</p>
            ) : (
                <>
                    <div ref={containerRef} className="flex-1 min-h-0 overflow-auto" />

                    {naoEditaveis.length > 0 && (
                        <p className="shrink-0 border-t border-stone-200 px-4 py-3 text-[11px] text-stone-500 leading-snug">
                            <strong className="font-semibold">Não editáveis pelo serviço:</strong>{" "}
                            {naoEditaveis.join(", ")}.
                        </p>
                    )}
                </>
            )}
        </aside>
    );
}
